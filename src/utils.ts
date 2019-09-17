import axios from 'axios';
import * as core from '@actions/core';
import * as github from '@actions/github';
import { IssuesAddLabelsParams } from '@octokit/rest';

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

export const pivotal = (pivotalToken: string) => {
  const request = axios.create({
    baseURL: `https://www.pivotaltracker.com/services/v5`,
    timeout: 2000,
    headers: { 'X-TrackerToken': pivotalToken },
  });

  /**
   * Get story details based on story id
   */
  const getStoryDetails = async (storyId: string) => {
    return request.get(`/stories/${storyId}`).then(res => res.data);
  };

  /**
   * Get project details based on project id
   * @param {string} projectId
   */
  const getProjectDetails = async (projectId: string) => {
    return request.get(`/projects/${projectId}`).then(res => res.data);
  };

  /**
   * Check the pivotal story using the pivotal API
   */
  const getProjectName = async (branchName: string) => {
    console.log('Checking pivotal id for -> ', branchName);
    const pivotalId = getPivotalId(branchName);

    if (!pivotalId) {
      core.setFailed('Pivotal id is missing in your branch.');
      process.exit(1);
    }
    console.log('Pivotal id -> ', pivotalId);

    const storyDetails = await getStoryDetails(pivotalId);
    const { project_id, id } = storyDetails;
    if (id && project_id) {
      const project = await getProjectDetails(project_id);
      const { name } = project;
      return name;
    } else {
      core.setFailed(
        'Invalid pivotal story id. Please create a branch with a valid pivotal story'
      );
      process.exit(1);
    }
  };

  return {
    getProjectName,
    getStoryDetails,
    getProjectDetails,
  };
};

/**
 * Add the specified label to the PR
 * @param {object} client
 * @param {IssuesAddLabelsParams} labelData
 */
export const addLabels = async (
  client: github.GitHub,
  labelData: IssuesAddLabelsParams
) => {
  try {
    await client.issues.addLabels(labelData);
  } catch (error) {
    core.setFailed(error.message);
    process.exit(1);
  }
};

/**
 * Remove invalid entries from an array
 * @param {Array} arr
 */
export const filterArray = (arr: string[]): string[] =>
  arr && arr.length ? arr.filter(x => x.trim()) : [];

/**
 * Check if the PR is an automated one created by a bot
 * Can be extended to include other bots later
 * @param {string} branch
 * @example isBotPr('dependabot') -> true
 * @example isBotPr('feature/update_123456789') -> false
 */
export const isBotPr = (branch: string): boolean =>
  branch ? branch.includes('dependabot') : false;
