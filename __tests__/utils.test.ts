import {
  filterArray,
  isBotPr,
  getHofixLabel,
  getPivotalId,
  getPodLabel,
  LABELS
} from '../src/utils';

describe("isBotPr()", () => {
  it("should return true", () => {
    expect(isBotPr("dependabot")).toBeTruthy();
  });

  it("should return false", () => {
    expect(isBotPr("feature/awesomeNewFeature")).toBeFalsy();
  });

  it("should return false with empty input", () => {
    expect(isBotPr("")).toBeFalsy();
  });

});

describe("filterArray()", () => {
  it("should return a valid array", () => {
    expect(filterArray(["123", "", "  "])).toEqual(["123"]);
  });

  it("should return a empty array with empty input", () => {
    expect(filterArray([])).toEqual([]);
  });
});

describe('getHotFixLabel()', () => {
  it('should return empty string', () => {
    expect(getHofixLabel('master')).toEqual('');
  });

  it('should return HOTFIX-PROD', () => {
    expect(getHofixLabel('production-release')).toEqual(LABELS.HOTFIX_PROD);
  });

  it('should return HOTFIX-PRE-PROD', () => {
    expect(getHofixLabel('release/v')).toEqual(LABELS.HOTFIX_PRE_PROD);
  });

  it('should return empty string with no input', () => {
    expect(getHofixLabel('')).toEqual('');
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
  it('should return a single word', () => {
    expect(getPodLabel('Jarvis POD')).toBe('jarvis');
  });

  it('should return an empty string', () => {
    expect(getPodLabel('')).toBe('');
  });
});

