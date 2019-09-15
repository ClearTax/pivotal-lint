const axios = require("axios");
const core = require("@actions/core");

/**
 *  Extract pivotal id from the branch name
 * @param {string} branch
 */
const getPivotalId = branch => {
  const match = branch.match(/\d{9}/);
  if (match && match.length) {
    return match[0];
  }
  return "";
};

const LABELS = {
  HOTFIX_PRE_PROD: "HOTFIX-PRE-PROD",
  HOTFIX_PROD: "HOTFIX-PROD"
};

/**
 * Return a hotfix label based on base branch type
 * @param {string} baseBranch
 */
const getHofixLabel = baseBranch => {
  if (!baseBranch) return "";
  if (baseBranch.includes("release/v")) return LABELS.HOTFIX_PRE_PROD;
  if (baseBranch.includes("production-release")) return LABELS.HOTFIX_PROD;
};

/**
 * Return a label from the pivotal board name
 * @param {string} boardName
 * @example Jarvis POD -> jarvis
 */
const getPodLabel = boardName => {
  return boardName ? boardName.split(" ")[0].toLowerCase() : "";
};

const pivotal = pivotalToken => {
  const request = axios.create({
    baseURL: `https://www.pivotaltracker.com/services/v5`,
    timeout: 2000,
    headers: { "X-TrackerToken": pivotalToken }
  });

  /**
   * Get story details based on story id
   */
  const getStoryDetails = async storyId => {
    return await request.get(`/stories/${storyId}`).then(res => res.data);
  };

  /**
   * Get project details based on project id
   * @param {string} projectId
   */
  const getProjectDetails = async projectId => {
    return await request.get(`/projects/${projectId}`).then(res => res.data);
  };

  /**
   * Check the pivotal story using the pivotal API
   */
  const getProjectName = async branchName => {
    console.log("Checking pivotal id for -> ", branchName);
    const pivotalId = getPivotalId(branchName);

    if (!pivotalId) {
      core.setFailed("Pivotal id is missing in your branch.");
      return false;
    }
    console.log("Pivotal id -> ", pivotalId);

    const storyDetails = await getStoryDetails(pivotalId);
    const { project_id, id } = storyDetails;
    if (id && project_id) {
      const project = await getProjectDetails(project_id);
      const { name } = project;
      return name;
    } else {
      core.setFailed(
        "Invalid pivotal story id. Please create a branch with a valid pivotal story"
      );
      return false;
    }
  };

  return {
    getProjectName,
    getStoryDetails,
    getProjectDetails
  };
};

/**
 * Add the specified label to the PR
 * @param {object} client
 * @param {object} labelData
 */
const addLabels = async (client, labelData) => {
  try {
    await client.issues.addLabels(labelData);
  } catch (error) {
    core.setFailed(error.message);
  }
};

/**
 * Remove invalid entries from an array
 * @param {Array} arr
 */
const filterArray = arr => arr.filter(x => x);

module.exports = {
  getPivotalId,
  getHofixLabel,
  pivotal,
  addLabels,
  getPodLabel,
  filterArray
};
