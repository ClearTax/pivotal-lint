import * as core from '@actions/core';
import * as github from '@actions/github';
import { IssuesAddLabelsParams, PullsUpdateParams, IssuesCreateCommentParams } from '@octokit/rest';

import {
  pivotal,
  getHotfixLabel,
  addLabels,
  getPodLabel,
  getStoryTypeLabel,
  filterArray,
  shouldSkipBranchLint,
  updatePrDetails,
  getPivotalId,
  getPrDescription,
  shouldUpdatePRDescription,
  addComment,
  getCommentBody,
} from './utils';

async function run() {
  try {
    const PIVOTAL_TOKEN: string = core.getInput('pivotal-token', { required: true });
    const GITHUB_TOKEN: string = core.getInput('github-token', { required: true });
    const BRANCH_IGNORE_PATTERN: string = core.getInput('skip-branches', { required: false }) || '';
    const SKIP_COMMENTS: string = core.getInput('skip-comments', { required: false } || 'false');

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

    if (shouldSkipBranchLint(headBranch, BRANCH_IGNORE_PATTERN)) {
      process.exit(0);
    }

    const pivotalId = getPivotalId(headBranch);
    if (!pivotalId) {
      core.setFailed('Pivotal id is missing in your branch.');
      process.exit(1);
    }

    const { getPivotalDetails } = pivotal(PIVOTAL_TOKEN);
    const pivotalDetails = await getPivotalDetails(pivotalId);
    if (pivotalDetails && pivotalDetails.project && pivotalDetails.story) {
      const {
        project: { name: projectName },
        story,
      } = pivotalDetails;

      const podLabel: string = getPodLabel(projectName);
      const hotfixLabel: string = getHotfixLabel(baseBranch);
      const storyTypeLabel: string = getStoryTypeLabel(story);
      const labels: string[] = filterArray([podLabel, hotfixLabel, storyTypeLabel]);

      console.log('Project name -> ', projectName);
      console.log('Adding lables -> ', labels);

      const repo: string = repository ? repository.name : '';
      const { number: prNumber, body: prBody } = pull_request ? pull_request : { number: 0, body: '' };

      const repoDetails = {
        owner: organization.login,
        repo,
      };

      const labelData: IssuesAddLabelsParams = {
        ...repoDetails,
        issue_number: prNumber,
        labels,
      };

      const client: github.GitHub = new github.GitHub(GITHUB_TOKEN);
      await addLabels(client, labelData);

      if (shouldUpdatePRDescription(prBody)) {
        const prData: PullsUpdateParams = {
          ...repoDetails,
          pull_number: prNumber,
          body: getPrDescription(prBody, story),
        };
        await updatePrDetails(client, prData);

        // add comment for PR title
        console.log(SKIP_COMMENTS, typeof SKIP_COMMENTS);
        if (SKIP_COMMENTS === 'false') {
          const title = pull_request!.title;
          const comment: IssuesCreateCommentParams = {
            ...repoDetails,
            issue_number: prNumber,
            body: getCommentBody(story.name, title),
          };
          console.log(comment);
          await addComment(client, comment);
        }
      }
    } else {
      core.setFailed('Invalid pivotal story id. Please create a branch with a valid pivotal story');
      process.exit(1);
    }
  } catch (error) {
    core.setFailed(error.message);
    process.exit(1);
  }
}

run();
