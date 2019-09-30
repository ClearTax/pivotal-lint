import {
  filterArray,
  shouldSkipBranchLint,
  getHotfixLabel,
  getPivotalId,
  getPodLabel,
  LABELS,
  shouldUpdatePRDescription,
  getPrDescription,
  getStoryTypeLabel,
  StoryResponse,
} from '../src/utils';
import { HIDDEN_MARKER } from '../src/constants';

jest.spyOn(console, 'log').mockImplementation(); // avoid actual console.log in test output

describe('shouldSkipBranchLint()', () => {
  it('should recognize bot PRs', () => {
    expect(shouldSkipBranchLint('dependabot')).toBeTruthy();
  });

  it.only('should handle custom ignore patterns', () => {
    expect(shouldSkipBranchLint('bar', '^bar')).toBeTruthy();
    expect(shouldSkipBranchLint('foobar', '^bar')).toBeFalsy();

    expect(shouldSkipBranchLint('bar', '[0-9]{2}')).toBeFalsy();
    expect(shouldSkipBranchLint('bar', '')).toBeFalsy();
    expect(shouldSkipBranchLint('foo', '[0-9]{2}')).toBeFalsy();
    expect(shouldSkipBranchLint('f00', '[0-9]{2}')).toBeTruthy();

    const customBranchRegex = '^(production-release|master|release\/v\\d+)$';
    expect(shouldSkipBranchLint('production-release', customBranchRegex)).toBeTruthy();
    expect(shouldSkipBranchLint('master', customBranchRegex)).toBeTruthy();
    expect(shouldSkipBranchLint('release/v77', customBranchRegex)).toBeTruthy();

    expect(shouldSkipBranchLint('release/very-important-feature', customBranchRegex)).toBeFalsy();
    expect(shouldSkipBranchLint('masterful', customBranchRegex)).toBeFalsy();
    expect(shouldSkipBranchLint('productionish', customBranchRegex)).toBeFalsy();
    expect(shouldSkipBranchLint('fix/production-issue', customBranchRegex)).toBeFalsy();
    expect(shouldSkipBranchLint('chore/rebase-with-master', customBranchRegex)).toBeFalsy();
    expect(shouldSkipBranchLint('chore/rebase-with-release', customBranchRegex)).toBeFalsy();
    expect(shouldSkipBranchLint('chore/rebase-with-release/v77', customBranchRegex)).toBeFalsy();
  });

  it('should return false with empty input', () => {
    expect(shouldSkipBranchLint('')).toBeFalsy();
  });

  it('should return false for other branches', () => {
    expect(shouldSkipBranchLint('feature/awesomeNewFeature')).toBeFalsy();
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
    const labels = [{ name: 'abc' }];
    const story: Partial<StoryResponse> = {
      project_id: 1234,
      id: 'id',
      url: 'url',
      story_type: 'feature',
      estimate: 1,
      labels,
      name: 'name',
    };
    const description = getPrDescription('some_body', story as any);

    expect(shouldUpdatePRDescription(description)).toBeFalsy();
    expect(description).toContain(story.id);
    expect(description).toContain(story.estimate);
    expect(description).toContain(labels[0].name);
  });
});




describe('getStoryTypeLabel()', () => {
  it('should return a pivotal story type as feature.', () => {
    const story: Partial<StoryResponse> = {
      story_type: 'feature',
    };
    expect(getStoryTypeLabel(story as any)).toEqual('feature');
  });

  it('should return an empty string', () => {
    expect(getStoryTypeLabel({} as any)).toEqual('');
  });
});
