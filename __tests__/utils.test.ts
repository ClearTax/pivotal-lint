import {
  filterArray,
  isBotPr
} from '../src/utils';

describe("isBotPr()", () => {
  it("should return true", () => {
    expect(isBotPr("dependabot")).toBe(true);
  });

  it("should return false", () => {
    expect(isBotPr("feature/awesomeNewFeature")).toBe(false);
  });

  it("should return false with empty input", () => {
    expect(isBotPr("")).toBe(false);
  });

  it("should return false with null input", () => {
    expect(isBotPr(null)).toBe(false);
  });
});

describe("filterArray()", () => {
  it("should return a valid array", () => {
    expect(filterArray(["123", "", null, undefined])).toEqual(["123"]);
  });

  it("should return a empty array", () => {
    expect(filterArray([])).toEqual([]);
  });
});


