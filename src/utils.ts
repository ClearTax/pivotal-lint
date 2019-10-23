import axios from 'axios';
import * as core from '@actions/core';
import * as github from '@actions/github';
import similarity from 'string-similarity';
import { IssuesAddLabelsParams, PullsUpdateParams, IssuesCreateCommentParams } from '@octokit/rest';
import { MARKER_REGEX, HIDDEN_MARKER, BOT_BRANCH_PATTERNS, DEFAULT_BRANCH_PATTERNS } from './constants';
import { PivotalStory, PivotalProjectResponse, PivotalDetails } from './types';

/**
 *  Extract pivotal id from the branch name
 * @param {string} branch
 */
export const getPivotalId = (branch: string): string => {
  const match = branch.match(/\d{9}/);
  if (match && match.length) {
    return match[0];
  }
  return '';
};

export const LABELS = {
  HOTFIX_PRE_PROD: 'HOTFIX-PRE-PROD',
  HOTFIX_PROD: 'HOTFIX-PROD',
};

/**
 * Return a hotfix label based on base branch type
 * @param {string} baseBranch
 */
export const getHotfixLabel = (baseBranch: string): string => {
  if (baseBranch.startsWith('release/v')) return LABELS.HOTFIX_PRE_PROD;
  if (baseBranch.startsWith('production')) return LABELS.HOTFIX_PROD;
  return '';
};

/**
 * Return a label from the pivotal board name
 * @param {string} boardName
 * @example Jarvis POD -> jarvis
 */
export const getPodLabel = (boardName: string): string => {
  return boardName ? boardName.split(' ')[0] : '';
};

export interface StoryLabel {
  kind?: string;
  id?: number;
  project_id?: number;
  name: string;
  created_at?: Date;
  updated_at?: Date;
}

export const pivotal = (pivotalToken: string) => {
  const request = axios.create({
    baseURL: `https://www.pivotaltracker.com/services/v5`,
    timeout: 2000,
    headers: { 'X-TrackerToken': pivotalToken },
  });

  /**
   * Get story details based on story id
   */
  const getStoryDetails = async (storyId: string): Promise<PivotalStory> => {
    return request.get(`/stories/${storyId}`).then(res => res.data);
  };

  /**
   * Get project details based on project id
   * @param {string} projectId
   */
  const getProjectDetails = async (projectId: number): Promise<PivotalProjectResponse> => {
    return request.get(`/projects/${projectId}`).then(res => res.data);
  };

  /**
   * Get both story and project details
   */
  const getPivotalDetails = async (pivotalId: string): Promise<PivotalDetails> => {
    console.log('Checking pivotal id for -> ', pivotalId);
    const story: PivotalStory = await getStoryDetails(pivotalId);

    const { project_id, url } = story;
    console.log('Story url ->', url);

    const project: PivotalProjectResponse = await getProjectDetails(project_id);
    const response: PivotalDetails = {
      story,
      project,
    };
    return response;
  };

  return {
    getPivotalDetails,
    getStoryDetails,
    getProjectDetails,
  };
};

/**
 * Add the specified label to the PR
 * @param {github.GitHub} client
 * @param {IssuesAddLabelsParams} labelData
 */
export const addLabels = async (client: github.GitHub, labelData: IssuesAddLabelsParams) => {
  try {
    await client.issues.addLabels(labelData);
  } catch (error) {
    core.setFailed(error.message);
    process.exit(1);
  }
};

/**
 *  Update a PR details
 * @param {github.GitHub} client
 * @param {PullsUpdateParams} prData
 */
export const updatePrDetails = async (client: github.GitHub, prData: PullsUpdateParams) => {
  try {
    await client.pulls.update(prData);
  } catch (error) {
    core.setFailed(error.message);
    process.exit(1);
  }
};

/**
 *  Add a comment to a PR
 * @param {github.GitHub} client
 * @param {IssuesCreateCommentParams} comment
 */
export const addComment = async (client: github.GitHub, comment: IssuesCreateCommentParams) => {
  try {
    await client.issues.createComment(comment);
  } catch (error) {
    core.setFailed(error.message);
    process.exit(1);
  }
};

/**
 *  Get a comment based on story title and PR title similarity
 * @param {string} storyTitle
 * @param {string} prTitle
 * @returns {string}
 */
export const getCommentBody = (storyTitle: string, prTitle: string): string => {
  const matchRange: number = similarity.compareTwoStrings(storyTitle, prTitle);
  if (matchRange < 0.4) {
    return `<p>
    Knock Knock! 🔍
  </p>
  <p>
    Just thought I'd let you know that your <em>PR title</em> and <em>story title</em> look <strong>quite different</strong>. PR titles
    that closely resemble the story title make it easier for reviewers to understand the context of the PR.
  </p>
  <blockquote>
    An easy-to-understand PR title a day makes the reviewer review away! 😛⚡️
  </blockquote>
  <table>
    <tr>
      <th>Story Title</th>
      <td>${storyTitle}</td>
    </tr>
    <tr>
        <th>PR Title</th>
        <td>${prTitle}</td>
      </tr>
  </table>
  <p>
    Check out this <a href="https://www.atlassian.com/blog/git/written-unwritten-guide-pull-requests">guide</a> to learn more about PR best-practices.
  </p>
  `;
  } else if (matchRange >= 0.4 && matchRange <= 0.75) {
    return `<p>
    Let's make that PR title a 💯 shall we? 💪
    </p>
    <p>
    Your <em>PR title</em> and <em>story title</em> look <strong>slightly different</strong>. Just checking in to know if it was intentional!
    </p>
    <table>
      <tr>
        <th>Story Title</th>
        <td>${storyTitle}</td>
      </tr>
      <tr>
          <th>PR Title</th>
          <td>${prTitle}</td>
        </tr>
    </table>
    <p>
      Check out this <a href="https://www.atlassian.com/blog/git/written-unwritten-guide-pull-requests">guide</a> to learn more about PR best-practices.
    </p>
    `;
  }
  return `<p>I'm a bot and I 👍 this PR title. 🤖</p>

  <img src="https://media.giphy.com/media/XreQmk7ETCak0/giphy.gif" width="400" />`;
};

/**
 * Remove invalid entries from an array
 * @param {Array} arr
 */
export const filterArray = (arr: string[]): string[] => (arr && arr.length ? arr.filter(x => x.trim()) : []);

/**
 * Check if the PR is an automated one created by a bot or one matching ignore patterns supplied
 * via action metadata.
 * @param {string} branch
 * @example shouldSkipBranchLint('dependabot') -> true
 * @example shouldSkipBranchLint('feature/update_123456789') -> false
 */
export const shouldSkipBranchLint = (branch: string, additionalIgnorePattern?: string): boolean => {
  if (BOT_BRANCH_PATTERNS.some(pattern => pattern.test(branch))) {
    console.log(`You look like a bot 🤖 so we're letting you off the hook!`);
    return true;
  }

  if (DEFAULT_BRANCH_PATTERNS.some(pattern => pattern.test(branch))) {
    console.log(`Ignoring check for default branch ${branch}`);
    return true;
  }

  const ignorePattern = new RegExp(additionalIgnorePattern || '');
  if (!!additionalIgnorePattern && ignorePattern.test(branch)) {
    console.log(
      `branch '${branch}' ignored as it matches the ignore pattern '${additionalIgnorePattern}' provided in skip-branches`
    );
    return true;
  }

  console.log(`branch '${branch}' does not match ignore pattern provided in 'skip-branches' option:`, ignorePattern);
  return false;
};

/**
 * Return a story type  from the pivotal story
 * @param  {StoryResponse} story
 * @return string
 */
export const getStoryTypeLabel = (story: PivotalStory): string => {
  return story ? story.story_type : '';
};

/**
 * Get icon based on the story type
 * @param  {string} storyType
 */
export const getStoryIcon = (storyType: string): string => {
  switch (storyType) {
    case 'feature':
      return `⭐️ `;
    case 'bug':
      return `🐞`;
    case 'chore':
      return `⚙️`;
    default:
      return '';
  }
};

/**
 * Returns true if the body contains the hidden marker. Used to avoid adding
 * pivotal story details to the PR multiple times.
 *
 * @example shouldUpdatePRDescription('--\nadded_by_pr_lint\n') -> true
 * @example shouldUpdatePRDescription('# some description') -> false
 */
export const shouldUpdatePRDescription = (
  /** The PR description/body as a string. */
  body?: string
): boolean => typeof body === 'string' && !MARKER_REGEX.test(body);

/**
 * Return a safe value to output for story type.
 * @param {StoryResponse} story
 */
const getEstimateForStoryType = (story: PivotalStory) => {
  const { story_type: type, estimate } = story;
  if (type === 'feature') {
    return typeof estimate !== 'undefined' ? estimate : 'unestimated';
  }
  return 'N/A';
};

/**
 * Get PR description with pivotal details
 * @param  {string=''} body
 * @param  {StoryResponse} story
 * @returns string
 */
export const getPrDescription = (body: string = '', story: PivotalStory): string => {
  const { url, id, story_type, labels, description, name } = story;
  const labelsArr = labels.map((label: { name: string }) => label.name).join(', ');

  return `
<h2><a href="${url}" target="_blank">Story #${id}</a></h2>

<details open>
  <summary><strong>Pivotal Summary</strong></summary>
  <br />
  <table>
    <tr>
      <th>Name</th>
      <th>Details</th>
    </tr>
    <tr>
      <td>Title</td>
      <td>${name}</td>
    </tr>
    <tr>
      <td>ID</td>
      <td><a href="${url}" target="_blank">#${id}</a></td>
    </tr>
    <tr>
      <td>Type</td>
      <td>${getStoryIcon(story_type)} ${story_type}</td>
    </tr>
    <tr>
      <td>Points</td>
      <td>${getEstimateForStoryType(story)}</td>
    </tr>
    <tr>
      <td>Labels</td>
      <td>${labelsArr}</td>
    </tr>
  </table>
</details>
<br />
<details>
  <summary><strong>Pivotal Description</strong></summary>
  <br />
  <p>${description || 'Oops, the story creator did not add any description.'}</p>
</details>
<!--
  do not remove this marker as it will break pr-lint's functionality.
  ${HIDDEN_MARKER}
-->

---

${body}`;
};

/**
 * Check if a PR is huge
 * @param {number} files
 * @param {number} addtions
 * @return {boolean}
 */
export const isHumongousPR = (files: number, additons: number): boolean => files > 15 || additons > 1000;

/**
 * Get the comment body for very huge PR
 * @param {number} files
 * @param {number} addtions
 * @return {string}
 */
export const getHugePrComment = (files: number, additons: number): string =>
  `<p>This PR is too huge for one to review :broken_heart: </p>
  <img src="https://media.giphy.com/media/26tPskka6guetcHle/giphy.gif" width="400" />
    <table>
      <tr>
        <th>Files changed</th>
        <td>${files} :no_good_woman: </td>
      </tr>
      <tr>
          <th>Addtions</th>
          <td>${additons} :no_good_woman: </td>
        </tr>
    </table>
    <p>
    Consider breaking it down into multiple small PRs.
    </p>
    <p>
      Check out this <a href="https://www.atlassian.com/blog/git/written-unwritten-guide-pull-requests">guide</a> to learn more about PR best-practices.
    </p>
  `;

/**
 * Get the comment body for pr with no pivotal id in the branch name
 * @param {string} branch
 * @return {string}
 */
export const getNoIdComment = (branch: string) => {
  return `<p> A Pivotal Story ID is missing from your branch name! 🦄</p>
<p>Your branch: ${branch}</p>
<p>If this is your first time contributing to this repository - welcome!</p>
<hr />
<p>Please refer to <a href="https://github.com/ClearTax/pivotal-flow">pivotal-flow</a> to get started.
<p>Without the Pivotal Story ID in your branch name you would lose out on automatic updates to Pivotal stories via SCM and the commandline; some GitHub status checks might fail.</p>
Valid sample branch names:

  ‣ feature/shiny-new-feature_12345678'
  ‣ 'chore/changelogUpdate_12345678'
  ‣ 'bugfix/fix-some-strange-bug_12345678'
`;
};
