import * as core from '@actions/core';
import * as github from '@actions/github';
import { IssuesAddLabelsParams } from '@octokit/rest';

import {
  pivotal,
  getHofixLabel,
  addLabels,
  getPodLabel,
  filterArray,
  isBotPr,
} from './utils';

async function run() {
  try {
    const PIVOTAL_TOKEN = core.getInput('pivotal-token', { required: true });
    const GITHUB_TOKEN = core.getInput('github-token', { required: true });

    const {
      payload: { repository, organization, pull_request },
    } = github.context;

    let headBranch: string = '';
    let baseBranch: string = '';
    if (pull_request && pull_request.base && pull_request.head) {
      baseBranch = pull_request.base.ref || '';
      headBranch = pull_request.head.ref || '';
    }
    if (!headBranch && !baseBranch) {
      core.setFailed('Unable to get the head and base branch');
      process.exit(1);
    }

    console.log('Base branch -> ', baseBranch);
    console.log('Head branch -> ', headBranch);

    if (isBotPr(headBranch)) {
      console.log('This is an automated PR so ignoring rest of the checks.');
      process.exit(0);
    }

    const { getProjectName } = pivotal(PIVOTAL_TOKEN);

    const projectName: string = await getProjectName(headBranch);
    console.log('Project name -> ', projectName);

    const podLabel: string = getPodLabel(projectName);
    const hotfixLabel: string = getHofixLabel(baseBranch);

    const labels: string[] = filterArray([podLabel, hotfixLabel]);
    console.log('Adding lables -> ', labels);

    const repo: string = repository ? repository.name : '';
    const issue_number: number = pull_request ? pull_request.number : 0;

    const labelData: IssuesAddLabelsParams = {
      owner: organization.login,
      repo,
      issue_number,
      labels,
    };

    const client: github.GitHub = new github.GitHub(GITHUB_TOKEN);
    addLabels(client, labelData);
  } catch (error) {
    core.setFailed(error.message);
    process.exit(1);
  }
}

run();
