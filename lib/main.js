"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
try {
    // `who-to-greet` input defined in action metadata file
    const nameToGreet = core.getInput('who-to-greet');
    console.log(`Hello ${nameToGreet}!`);
    const time = (new Date()).toTimeString();
    core.setOutput("time", time);
    // Get the JSON webhook payload for the event that triggered the workflow
    const { head_branch, pull_requests } = github.context.payload;
    console.log('Log: pull_requests }', pull_requests);
    console.log('Log: head_branch,', head_branch);
    console.log(JSON.stringify(github, undefined, 2));
    const { ref } = github.context;
    console.log('Log: ref ', JSON.stringify(ref, undefined, 2));
}
catch (error) {
    core.setFailed(error.message);
}
