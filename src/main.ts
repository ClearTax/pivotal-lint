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
} from './utils';
import { PullRequestParams, PivotalDetails, PivotalStory } from './types';

const getInputs = () => {
  const PIVOTAL_TOKEN: string = core.getInput('pivotal-token', { required: true });
  const GITHUB_TOKEN: string = core.getInput('github-token', { required: true });
  const BRANCH_IGNORE_PATTERN: string = core.getInput('skip-branches', { required: false }) || '';
  const SKIP_COMMENTS: string = core.getInput('skip-comments', { required: false }) || 'false';
  return {
    PIVOTAL_TOKEN,
    GITHUB_TOKEN,
    BRANCH_IGNORE_PATTERN,
    SKIP_COMMENTS,
  };
};

interface IssueAndCommentCommonParams {
  baseBranch: string;
  headBranch: string;
  owner: string;
  repo: string;
  prNumber: number;
  prBody: string;
  title: string;
  changedFiles: number;
  additions: number;
}

const addPrLabels = async (
  client: github.GitHub,
  commonPayload: IssueAndCommentCommonParams,
  pivotalDetails: PivotalDetails
) => {
  const {
    story,
    project: { name: projectName },
  } = pivotalDetails;

  const { owner, repo, prNumber: issue_number, baseBranch } = commonPayload;
  const podLabel: string = getPodLabel(projectName);
  const hotfixLabel: string = getHotfixLabel(baseBranch);
  const storyTypeLabel: string = getStoryTypeLabel(story);
  const labels: string[] = filterArray([podLabel, hotfixLabel, storyTypeLabel]);

  console.log('Project name -> ', projectName);
  console.log('Adding lables -> ', labels);
  const labelData: IssuesAddLabelsParams = {
    owner,
    repo,
    issue_number,
    labels,
  };
  await addLabels(client, labelData);
};

const addPrDescription = async (
  client: github.GitHub,
  commonPayload: IssueAndCommentCommonParams,
  story: PivotalStory
) => {
  const { owner, repo, prBody, prNumber: pull_number } = commonPayload;
  const prData: PullsUpdateParams = {
    owner,
    repo,
    pull_number,
    body: getPrDescription(prBody, story),
  };
  await updatePrDetails(client, prData);
};

const addPrTitleComment = async (
  client: github.GitHub,
  commonPayload: IssueAndCommentCommonParams,
  story: PivotalStory
) => {
  const { owner, repo, prNumber: issue_number, title } = commonPayload;
  const prTitleComment: IssuesCreateCommentParams = {
    owner,
    repo,
    issue_number,
    body: getPrTitleComment(story.name, title),
  };
  console.log('Adding comment for the PR title');
  await addComment(client, prTitleComment);
};

const addHugePrComment = async (client: github.GitHub, commonPayload: IssueAndCommentCommonParams) => {
  const { changedFiles, additions, owner, repo, prNumber: issue_number } = commonPayload;
  if (isHumongousPR(changedFiles, additions)) {
    const hugePrComment: IssuesCreateCommentParams = {
      owner,
      repo,
      issue_number,
      body: getHugePrComment(changedFiles, additions),
    };
    console.log('Adding comment for the PR title');
    addComment(client, hugePrComment);
  }
};

const addNoIdComment = async (client: github.GitHub, commonPayload: IssueAndCommentCommonParams) => {
  const { headBranch, owner, repo, prNumber: issue_number } = commonPayload;

  const comment: IssuesCreateCommentParams = {
    owner,
    repo,
    issue_number,
    body: getNoIdComment(headBranch),
  };
  addComment(client, comment);
};

async function run() {
  try {
    const { PIVOTAL_TOKEN, GITHUB_TOKEN, BRANCH_IGNORE_PATTERN, SKIP_COMMENTS } = getInputs();
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
      title = '',
      changed_files: changedFiles = 0,
      additions = 0,
    } = pull_request as PullRequestParams;

    // common fields for both issue and comment
    const commonPayload: IssueAndCommentCommonParams = {
      baseBranch,
      headBranch,
      owner,
      repo,
      prNumber,
      prBody,
      title,
      changedFiles,
      additions,
    };

    // github client with given token
    const client: github.GitHub = new github.GitHub(GITHUB_TOKEN);

    if (!headBranch && !baseBranch) {
      const commentBody = 'pr-lint is unable to determine the head and base branch';
      const comment: IssuesCreateCommentParams = {
        owner,
        repo,
        issue_number: prNumber,
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
      await addNoIdComment(client, commonPayload);

      core.setFailed('Pivotal id is missing in your branch.');
      process.exit(1);
    }

    const { getPivotalDetails } = pivotal(PIVOTAL_TOKEN);
    const pivotalDetails: PivotalDetails = await getPivotalDetails(pivotalId);

    if (pivotalDetails && pivotalDetails.project && pivotalDetails.story) {
      await addPrLabels(client, commonPayload, pivotalDetails);
      const { story } = pivotalDetails;

      if (shouldUpdatePRDescription(prBody)) {
        await addPrDescription(client, commonPayload, story);

        if (SKIP_COMMENTS === 'false') {
          // add comment for PR title
          addPrTitleComment(client, commonPayload, story);
          // add a comment if the PR is huge
          addHugePrComment(client, commonPayload);
        }
      }
    } else {
      await addNoIdComment(client, commonPayload);
      core.setFailed('Invalid pivotal story id. Please create a branch with a valid pivotal story');
      process.exit(1);
    }
  } catch (error) {
    core.setFailed(error.message);
    process.exit(1);
  }
}

run();
