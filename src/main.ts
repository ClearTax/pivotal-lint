import * as core from '@actions/core';
import * as github from '@actions/github';


const getPivotalId = branch => {
  const match = branch.match(/\d{9}/);
  if(match && match.length) {
    return match[0];
  }
  return '';
}

try {
  // `who-to-greet` input defined in action metadata file
  const nameToGreet = core.getInput('who-to-greet');
  console.log(`Hello ${nameToGreet}!`);
  const time = (new Date()).toTimeString();
  core.setOutput("time", time);
  // Get the JSON webhook payload for the event that triggered the workflow
  console.log(JSON.stringify(github.context, undefined, 2));

  const { ref } = github.context;
  const pivotalId = getPivotalId(ref);
  console.log('Log: pivotalId ', pivotalId );
  if(!pivotalId) {
    core.setFailed('Pivotal id is missing in your branch.');
  }
  core.setFailed('fail to try rerun');
} catch (error) {
  core.setFailed(error.message);
}