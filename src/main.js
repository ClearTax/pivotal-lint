const core = require("@actions/core");
const github = require("@actions/github");
const axios = require("axios");

async function run() {
  try {
    const token = core.getInput("github-token", { required: true });
    const prNumber = getPrNumber();

    if (!prNumber) {
      console.log("Could not get pull request number from context, exiting");
      return;
    }

    const PIVOTAL_TOKEN = core.getInput("pivotal-token", { required: true });

    const request = axios.create({
      baseURL: `https://www.pivotaltracker.com/services/v5`,
      timeout: 2000,
      headers: { "X-TrackerToken": PIVOTAL_TOKEN }
    });

    const getPivotalId = branch => {
      const match = branch.match(/\d{9}/);
      if (match && match.length) {
        return match[0];
      }
      return "";
    };

    const getStoryDetails = async storyId => {
      return await request.get(`/stories/${storyId}`).then(res => res.data);
    };

    const getProjectDetails = async projectId => {
      return await request.get(`/projects/${projectId}`).then(res => res.data);
    };

    const addLabels = async (client, prNumber, labels) => {
      await client.issues.addLabels({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        issue_number: prNumber,
        labels: labels
      });
    };

    const getPrNumber = () => {
      const pullRequest = github.context.payload.pull_request;
      if (pullRequest) {
        return pullRequest.number;
      }
      return undefined;
    };

    const checkPivotal = async () => {
      const { ref } = github.context;
      const pivotalId = getPivotalId(ref);
      console.log("Log: pivotalId ", pivotalId);
      if (!pivotalId) {
        core.setFailed("Pivotal id is missing in your branch.");
        return false;
      }
      const storyDetails = await getStoryDetails(pivotalId);
      const { project_id, id } = storyDetails;
      if (id && project_id) {
        const project = await getProjectDetails(project_id);
        const { name } = project;
        return name || false;
      } else {
        core.setFailed(
          "Invalid pivotal story id. Please create a branch with a valid pivotal story"
        );
        return false;
      }
    };

    const projectName = await checkPivotal();
    console.log("Log: run -> projectName ", projectName);
    if (projectName) {
      console.log("Could not get project name from the pivotal id");
      return;
    }
    const client = new github.GitHub(token);
    addLabels(client, prNumber, [projectName]);
    core.setFailed("fail to try rerun");
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
