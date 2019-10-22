import axios from 'axios';
import * as core from '@actions/core';
import * as github from '@actions/github';
import similarity from 'string-similarity';
import { IssuesAddLabelsParams, PullsUpdateParams, IssuesCreateCommentParams } from '@octokit/rest';
import { MARKER_REGEX, HIDDEN_MARKER, BOT_BRANCH_PATTERNS, DEFAULT_BRANCH_PATTERNS } from './constants';

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

export interface StoryResponse {
  [key: string]: any;
  current_state: string;
  description?: string;
  estimate: number;
  id: string;
  labels: StoryLabel[];
  name: string;
  owner_ids: any[];
  project_id: number;
  story_type: 'feature' | 'bug' | 'chore' | 'release';
  updated_at: Date;
  url: string;
}

interface ProjectResponse {
  [key: string]: any;
  name: string;
}

export interface PivotalDetails {
  story: StoryResponse;
  project: ProjectResponse;
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
  const getStoryDetails = async (storyId: string): Promise<StoryResponse> => {
    return request.get(`/stories/${storyId}`).then(res => res.data);
  };

  /**
   * Get project details based on project id
   * @param {string} projectId
   */
  const getProjectDetails = async (projectId: number): Promise<ProjectResponse> => {
    return request.get(`/projects/${projectId}`).then(res => res.data);
  };

  /**
   * Get both story and project details
   */
  const getPivotalDetails = async (pivotalId: string): Promise<PivotalDetails | undefined> => {
    try {
      console.log('Checking pivotal id for -> ', pivotalId);
      const story: StoryResponse = await getStoryDetails(pivotalId);
      const { project_id, id, url } = story;
      if (id && project_id && url) {
        console.log('Story url ->', url);
        const project: ProjectResponse = await getProjectDetails(project_id);
        const response: PivotalDetails = {
          story,
          project,
        };
        return response;
      }
      return;
    } catch (error) {
      console.log(error.message);
      return;
    }
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
    return `<div>
        <p>I was expecting to see a more <strong>meaningful</strong> and <strong>easy to understand</strong> title for the PR :disappointed:</p>
        <p>Also, I looked at your pivotal story title, there seems to be a disconnect between the story title and the PR title :confused: </p>
        <p>Please, add more friendly and </p>
        <br/>
        <p><strong>Story Title: </strong>${storyTitle}</p>
        <p><strong>PR Title: </strong>${prTitle}</p>
        <p>Please add helpful PR title and commit messages. Checkout this <a href="https://www.atlassian.com/blog/git/written-unwritten-guide-pull-requests">guide</a> for more useful tips</p>
      </div>
    `;
  } else if (matchRange > 0.4 && matchRange < 0.75) {
    return `<div>
        <p>I was expecting to see a more <strong>meaningful</strong> and <strong>easy to understand</strong> title for the PR :disappointed:</p>
        <p>Also, I looked at your pivotal story title, there seems to be a disconnect between the story title and the PR title :confused: </p>
        <p>Please, add more friendly and </p>
        <br/>
        <p><strong>Story Title: </strong>${storyTitle}</p>
        <p><strong>PR Title: </strong>${prTitle}</p>
        <p>Please add helpful PR title and commit messages. Checkout this <a href="https://www.atlassian.com/blog/git/written-unwritten-guide-pull-requests">guide</a> for more useful tips</p>
      </div>
    `;
  }
  return `<div>
        <p>I was expecting to see a more <strong>meaningful</strong> and <strong>easy to understand</strong> title for the PR :disappointed:</p>
        <p>Also, I looked at your pivotal story title, there seems to be a disconnect between the story title and the PR title :confused: </p>
        <p>Please, add more friendly and </p>
        <br/>
        <p><strong>Story Title: </strong>${storyTitle}</p>
        <p><strong>PR Title: </strong>${prTitle}</p>
        <p>Please add helpful PR title and commit messages. Checkout this <a href="https://www.atlassian.com/blog/git/written-unwritten-guide-pull-requests">guide</a> for more useful tips</p>
      </div>
    `;
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
export const getStoryTypeLabel = (story: StoryResponse): string => {
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
const getEstimateForStoryType = (story: StoryResponse) => {
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
export const getPrDescription = (body: string = '', story: StoryResponse): string => {
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
