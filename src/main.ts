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
  getPrTitleComment,
  getHugePrComment,
  isHumongousPR,
  getNoIdComment,
  shouldAddComments,
} from './utils';
import { PullRequestParams, PivotalDetails } from './types';

const getInputs = () => {
  const PIVOTAL_TOKEN: string = core.getInput('pivotal-token', { required: true });
  const GITHUB_TOKEN: string = core.getInput('github-token', { required: true });
  const BRANCH_IGNORE_PATTERN: string = core.getInput('skip-branches', { required: false }) || '';
  const SKIP_COMMENTS: string = core.getInput('skip-comments', { required: false }) || 'false';
  const PR_THRESHOLD: string = core.getInput('pr-threshold', { required: false }) || '';

  return {
    PIVOTAL_TOKEN,
    GITHUB_TOKEN,
    BRANCH_IGNORE_PATTERN,
    SKIP_COMMENTS,
    PR_THRESHOLD,
  };
};

async function run() {
  try {
    const { PIVOTAL_TOKEN, GITHUB_TOKEN, BRANCH_IGNORE_PATTERN, SKIP_COMMENTS, PR_THRESHOLD } = getInputs();

    const defaultAdditionsCount = 800;
    const prThreshold: number = PR_THRESHOLD ? Number(PR_THRESHOLD) : defaultAdditionsCount;

    const {
      payload: {
        repository,
        organization: { login: owner },
        pull_request,
      },
    } = github.context;

    const repo: string = repository!.name;

    const {
      base: { ref: baseBranch },
      head: { ref: headBranch },
      number: prNumber = 0,
      body: prBody = '',
      additions = 0,
      title = '',
    } = pull_request as PullRequestParams;

    // common fields for both issue and comment
    const commonPayload = {
      owner,
      repo,
      issue_number: prNumber,
    };

    // github client with given token
    const client: github.GitHub = new github.GitHub(GITHUB_TOKEN);

    if (!headBranch && !baseBranch) {
      const commentBody = 'pr-lint is unable to determine the head and base branch';
      const comment: IssuesCreateCommentParams = {
        ...commonPayload,
        body: commentBody,
      };
      await addComment(client, comment);

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
      const comment: IssuesCreateCommentParams = {
        ...commonPayload,
        body: getNoIdComment(headBranch),
      };
      await addComment(client, comment);

      core.setFailed('Pivotal id is missing in your branch.');
      process.exit(1);
    }

    const { getPivotalDetails } = pivotal(PIVOTAL_TOKEN);
    const pivotalDetails: PivotalDetails = await getPivotalDetails(pivotalId);
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

      const labelData: IssuesAddLabelsParams = {
        ...commonPayload,
        labels,
      };

      await addLabels(client, labelData);

      if (shouldUpdatePRDescription(prBody)) {
        const prData: PullsUpdateParams = {
          owner,
          repo,
          pull_number: prNumber,
          body: getPrDescription(prBody, story),
        };
        await updatePrDetails(client, prData);

        // add comment for PR title
        if (shouldAddComments(SKIP_COMMENTS)) {
          const prTitleComment: IssuesCreateCommentParams = {
            ...commonPayload,
            body: getPrTitleComment(story.name, title),
          };
          console.log('Adding comment for the PR title');
          addComment(client, prTitleComment);

          // add a comment if the PR is huge
          if (isHumongousPR(additions, prThreshold)) {
            const hugePrComment: IssuesCreateCommentParams = {
              ...commonPayload,
              body: getHugePrComment(additions, prThreshold),
            };
            console.log('Adding comment for huge PR');
            addComment(client, hugePrComment);
          }
        }
      }
    } else {
      const comment: IssuesCreateCommentParams = {
        ...commonPayload,
        body: getNoIdComment(headBranch),
      };
      await addComment(client, comment);

      core.setFailed('Invalid pivotal story id. Please create a branch with a valid pivotal story');
      process.exit(1);
    }
  } catch (error) {
    core.setFailed(error.message);
    process.exit(1);
  }
}

run();
