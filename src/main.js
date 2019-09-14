const core = require('@actions/core');
const github = require('@actions/github');
const axios = require('axios');

const { PIVOTAL_TOKEN, PIVOTAL_PROJECT_ID } = process.env;

const request = axios.create({
  baseURL: `https://www.pivotaltracker.com/services/v5`,
  timeout: 10000, // search could be really slow in pivotal
  headers: { 'X-TrackerToken': PIVOTAL_TOKEN },
});

const getPivotalId = branch => {
  const match = branch.match(/\d{9}/);
  if(match && match.length) {
    return match[0];
  }
  return '';
}

const getStoryDetails = async storyId => {
  return await request.get(`/stories/${storyId}`).then(res => res.data);
}

const checkPivotal = async () => {
  const { ref = '168317333' } = github.context;
  const pivotalId = getPivotalId(ref);
  console.log('Log: pivotalId ', pivotalId );
  if(!pivotalId) {
    core.setFailed('Pivotal id is missing in your branch.');
  }
  const storyDetails = await getStoryDetails(pivotalId);
  console.log(storyDetails)
}

try {
  // `who-to-greet` input defined in action metadata file
  // const nameToGreet = core.getInput('who-to-greet');
  // console.log(`Hello ${nameToGreet}!`);
  // const time = (new Date()).toTimeString();
  // core.setOutput("time", time);

  // Get the JSON webhook payload for the event that triggered the workflow
  console.log(JSON.stringify(github.context, undefined, 2));
  checkPivotal();
  core.setFailed('fail to try rerun');
} catch (error) {
  core.setFailed(error.message);
}