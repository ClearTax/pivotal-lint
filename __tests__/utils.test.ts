import {
  filterArray,
  isBotPr,
  getHotfixLabel,
  getPivotalId,
  getPodLabel,
  LABELS,
  shouldUpdatePRDescription,
  getPrDescription,
} from '../src/utils';
import { HIDDEN_MARKER } from '../src/constants';

describe('isBotPr()', () => {
  it('should return true for dependabot PR', () => {
    expect(isBotPr('dependabot')).toBeTruthy();
  });

  it('should return false for non bot PR', () => {
    expect(isBotPr('feature/awesomeNewFeature')).toBeFalsy();
  });

  it('should return false with empty input', () => {
    expect(isBotPr('')).toBeFalsy();
  });
});

describe('filterArray()', () => {
  it('should return a valid array', () => {
    expect(filterArray(['123', '', '  '])).toEqual(['123']);
  });

  it('should return a empty array with empty input', () => {
    expect(filterArray([])).toEqual([]);
  });
});

describe('getHotFixLabel()', () => {
  it('should return empty string for master branch', () => {
    expect(getHotfixLabel('master')).toEqual('');
  });

  it('should return HOTFIX-PROD for production branch', () => {
    expect(getHotfixLabel('production-release')).toEqual(LABELS.HOTFIX_PROD);
  });

  it('should return HOTFIX-PRE-PROD for release branch', () => {
    expect(getHotfixLabel('release/v')).toEqual(LABELS.HOTFIX_PRE_PROD);
  });

  it('should return empty string with no input', () => {
    expect(getHotfixLabel('')).toEqual('');
  });
});

describe('getPivotalId()', () => {
  it('should return 9 digit pivotal id', () => {
    expect(getPivotalId('feature/newFeature_123456789')).toEqual('123456789');
  });
  it('should return an empty string with invaid input branch', () => {
    expect(getPivotalId('feature/newFeature')).toEqual('');
  });

  it('should return an empty string with no input', () => {
    expect(getPivotalId('')).toEqual('');
  });
});

describe('getPodLabel()', () => {
  it('should return a single word from a multi word board name', () => {
    expect(getPodLabel('Jarvis POD')).toEqual('Jarvis');
  });

  it('should return an empty string', () => {
    expect(getPodLabel('')).toEqual('');
  });
});

describe('shouldUpdatePRDescription()', () => {
  it('should return false when the hidden marker is present', () => {

    expect(shouldUpdatePRDescription(HIDDEN_MARKER)).toBeFalsy();
    expect(shouldUpdatePRDescription(`
<h2><a href="https://www.pivotaltracker.com/story/show/999999999" target="_blank">Story #999999999</a></h2>
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
      <td><a href="https://www.pivotaltracker.com/story/show/999999999" target="_blank">#999999999</a></td>
    </tr>
    <tr>
      <td>Type</td>
      <td>⭐️ feature</td>
    </tr>
    <tr>
      <td>Points</td>
      <td>2</td>
    </tr>
    <tr>
      <td>Labels</td>
      <td>fe tech goodness, gst 2.0</td>
    </tr>
  </table>
</details>
<br />
<details>
  <summary> <strong>Pivotal Description</strong></summary>
  <br />
  <p>Oops, the story creator did not add any description.</p>
  <br />
</details>
<!--
  do not remove this marker as it will break PR-lint's functionality.
  ${HIDDEN_MARKER}
-->

some actual content'
    `)).toBeFalsy();
  });

  it('should return true when the hidden marker is NOT present', () =>{
    expect(shouldUpdatePRDescription('')).toBeTruthy();
    expect(shouldUpdatePRDescription('added_by')).toBeTruthy();
    expect(shouldUpdatePRDescription('added_by_something_else')).toBeTruthy();
    expect(shouldUpdatePRDescription(`
## Checklist

- [ ] PR is up-to-date with a description of changes and screenshots (if applicable).
- [ ] All files are lint-free.
- [ ] Added tests for the core-changes (as applicable).
- [ ] Tested locally for regressions & all test cases are passing.
`)).toBeTruthy();
  });
});

describe('getPrDescription()', () => {
  it('should include the hidden marker when getting PR description', () => {
    const story = {
      project_id: 'projectId',
      id: 'id',
      url: 'url',
      story_type: 'storyType',
      estimate: 1,
    };
    const description = getPrDescription('some_body', story);

    expect(shouldUpdatePRDescription(description)).toBeFalsy();
    expect(description).toContain(story.id);
    expect(description).toContain(story.estimate);
  });
});
