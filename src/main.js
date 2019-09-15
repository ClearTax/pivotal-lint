const core = require("@actions/core");
const github = require("@actions/github");
const utils = require("./utils");

const { pivotal, getHofixLabel, addLabels, getPodLabel, filterArray } = utils;

async function run() {
  try {
    const PIVOTAL_TOKEN = core.getInput("pivotal-token", { required: true });
    const GITHUB_TOKEN = core.getInput("github-token", { required: true });

    const {
      payload: { repository, organization, pull_request }
    } = github.context;

    const {
      base: { ref: baseBranch },
      head: { ref: headBranch }
    } = pull_request;

    console.log("Base branch -> ", baseBranch);
    console.log("Head branch -> ", headBranch);

    const { getProjectName } = pivotal(PIVOTAL_TOKEN);

    const projectName = await getProjectName(headBranch);
    console.log("Project name -> ", projectName);

    const podLabel = getPodLabel(projectName);
    const hotfixLabel = getHofixLabel(baseBranch);

    const labels = filterArray([podLabel, hotfixLabel]);
    console.log("Adding lables -> ", labels);

    const labelData = {
      owner: organization.login,
      repo: repository.name,
      issue_number: pull_request.number,
      labels
    };

    const client = new github.GitHub(GITHUB_TOKEN);
    addLabels(client, labelData);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
