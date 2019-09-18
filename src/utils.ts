import axios from 'axios';
import * as core from '@actions/core';
import * as github from '@actions/github';
import { IssuesAddLabelsParams, PullsUpdateParams } from '@octokit/rest';

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
export const getHofixLabel = (baseBranch: string): string => {
  if (baseBranch.includes('release/v')) return LABELS.HOTFIX_PRE_PROD;
  if (baseBranch.includes('production')) return LABELS.HOTFIX_PROD;
  return '';
};

/**
 * Return a label from the pivotal board name
 * @param {string} boardName
 * @example Jarvis POD -> jarvis
 */
export const getPodLabel = (boardName: string): string => {
  return boardName ? boardName.split(' ')[0].toLowerCase() : '';
};

interface StoryResponse {
  [key: string]: any;
  project_id: string;
  id: string;
  url: string;
  story_type: string;
  estimate: boolean;
  description?: string;
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
  const getProjectDetails = async (projectId: string): Promise<ProjectResponse> => {
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
 * Remove invalid entries from an array
 * @param {Array} arr
 */
export const filterArray = (arr: string[]): string[] => (arr && arr.length ? arr.filter(x => x.trim()) : []);

/**
 * Check if the PR is an automated one created by a bot
 * Can be extended to include other bots later
 * @param {string} branch
 * @example isBotPr('dependabot') -> true
 * @example isBotPr('feature/update_123456789') -> false
 */
export const isBotPr = (branch: string): boolean => (branch ? branch.includes('dependabot') : false);

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
 * Get PR description with pivotal details
 * @param  {string=''} body
 * @param  {StoryResponse} story
 * @returns string
 */
export const getPrDescription = (body: string = '', story: StoryResponse): string => {
  const { url, id, story_type, estimate, labels, description } = story;
  const labelsArr = labels.map((label: { name: string }) => label.name).join(', ');
  return `
  <h2><a href="${url}" target="_blank">Story #${id}</a></h2>
  <details open>
    <summary> <strong>Pivotal Summary</strong></summary>
    <br />
    <table>
      <tr>
        <th>Name</th>
        <th>Details</th>
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
        <td>${estimate}</td>
      </tr>
      <tr>
        <td>Labels</td>
        <td>${labelsArr}</td>
      </tr>
    </table>
  </details>
  <br />
  <details>
    <summary> <strong>Pivotal Description</strong></summary>
    <br />
    <p>${description || 'Oops, the story creator did not add any description.'}</p>
    <br />
  </details>
  \n${body}`;
};
