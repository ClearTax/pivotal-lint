export const HIDDEN_MARKER = 'added_by_pr_lint';
export const MARKER_REGEX = new RegExp(HIDDEN_MARKER);

export const BOT_BRANCH_PATTERNS: RegExp[] = [
  /dependabot/
];
