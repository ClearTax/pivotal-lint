const core = require("@actions/core");
const github = require("@actions/github");
const utils = require("./utils");

const { pivotal, getHofixLabel, addLabels, getPodLabel } = utils;

async function run() {
  try {
    const PIVOTAL_TOKEN = core.getInput("pivotal-token", { required: true });
    const GITHUB_TOKEN = core.getInput("github-token", { required: true });

    const client = new github.GitHub(GITHUB_TOKEN);

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
    console.log("projectName -> ", projectName);

    const podLabel = getPodLabel(projectName);
    const hotfixLabel = getHofixLabel(baseBranch);

    const labels = [podLabel, hotfixLabel].filter(label => label);
    console.log("Adding lables -> ", labels);

    const labelData = {
      owner: organization.login,
      repo: repository.name,
      issue_number: pull_request.number,
      labels
    };

    addLabels(client, labelData);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
