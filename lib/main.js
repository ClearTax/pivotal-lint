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
const getPivotalId = branch => {
    const match = branch.match(/\d{9}/);
    if (match && match.length) {
        return match[0];
    }
    return '';
};
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
    console.log('Log: pivotalId ', pivotalId);
    if (!pivotalId) {
        core.setFailed('Pivotal id is missing in your branch.');
    }
    core.setFailed('fail to try rerun');
}
catch (error) {
    core.setFailed(error.message);
}
