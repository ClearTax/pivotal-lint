"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const axios_1 = __importDefault(require("axios"));
const { PIVOTAL_TOKEN, PIVOTAL_PROJECT_ID } = process.env;
const request = axios_1.default.create({
    baseURL: `https://www.pivotaltracker.com/services/v5`,
    timeout: 10000,
    headers: { 'X-TrackerToken': PIVOTAL_TOKEN },
});
const getPivotalId = branch => {
    const match = branch.match(/\d{9}/);
    if (match && match.length) {
        return match[0];
    }
    return '';
};
const getStoryDetails = (storyId) => __awaiter(this, void 0, void 0, function* () {
    return yield request.get(`/stories/${storyId}`).then(res => res.data);
});
const checkPivotal = () => __awaiter(this, void 0, void 0, function* () {
    const { ref = '168317333' } = github.context;
    const pivotalId = getPivotalId(ref);
    console.log('Log: pivotalId ', pivotalId);
    if (!pivotalId) {
        core.setFailed('Pivotal id is missing in your branch.');
    }
    const storyDetails = yield getStoryDetails(pivotalId);
    console.log(storyDetails);
});
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
}
catch (error) {
    core.setFailed(error.message);
}
