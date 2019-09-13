import * as core from '@actions/core';
import * as github from '@actions/github';


try {
  // `who-to-greet` input defined in action metadata file
  const nameToGreet = core.getInput('who-to-greet');
  console.log(`Hello ${nameToGreet}!`);
  const time = (new Date()).toTimeString();
  core.setOutput("time", time);
  // Get the JSON webhook payload for the event that triggered the workflow
  const { head_branch, pull_requests }= github.context.payload;
  console.log('Log: pull_requests', pull_requests);
  console.log('Log: head_branch', head_branch);

  console.log(JSON.stringify(github.context, undefined, 2));
  const { ref } = github.context;
  console.log('Log: ref ', JSON.stringify(ref, undefined, 2));
  core.setFailed('fail to try rerun');
} catch (error) {
  core.setFailed(error.message);
}