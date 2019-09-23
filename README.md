# pr-lint 🧹

> A light-weight lint workflow when using GitHub along with PivotalTracker for project management. Works well when used alongside [pivotal-flow][pivotal-flow].

[![GitHub](https://img.shields.io/github/license/cleartax/pivotal-flow?style=flat-square)](https://github.com/ClearTax/pivotal-flow/blob/master/LICENSE.md)

## Features

1. **Validates branches that are filed as PRs**. It uses the pivotal API to provide GitHub status checks that help you avoid merging PRs without valid story IDs.
1. **Adds a summary of the story details** to the beginning of the PR's description for better documentation & linking from GitHub → Pivotal. ![pr-lint](https://assets1.cleartax-cdn.com/cleargst-frontend/misc/1568800226_pr-lint.png)
1. Automatically labels PRs based on:
    1. Team name label based on the pivotal board name. if your pivotal board name is `Escher POD` then it will add `escher` as a label. Pivotal board name is fetched from the given story id.
    1. `HOTFIX-PROD` - if the PR is raised against `production-release`
    1. `HOTFIX-PRE-PROD` - if the PR is raised against `release/v*`

## Usage

To make pr-lint a part of your workflow, just add a `pr-lint.yml` file in your `.github/workflows/` directory in your git repo.

```yaml
name: PR lint
 on: [pull_request]
 jobs:
  pr_lint:
    runs-on: ubuntu-latest
    steps:
    - name: Verify Pivotal story ID & add relevant labels
      uses: cleartax/pr-lint@master
      with:
        github-token: ${{ secrets.GITHUB_ACCESS_TOKEN }}
        pivotal-token: ${{ secrets.PIVOTAL_TOKEN }}
        skip-branches: '^(production-release|master|release\/v\d+)$'
```

### Options

|key|description|required|
|---|---|---|
|`github-token`| Token used to update PR description. Must have write access to your repository.|true|
|`pivotal-token`|API Token used to fetch Pivotal Story information. Must have read access to your Pivotal boards.|true|
|`skip-branches`|A regex to ignore running PR lint on certain branches, like production etc.|false

Since tokens are private, we suggest adding them as [GitHub secrets](https://help.github.com/en/articles/virtual-environments-for-github-actions#creating-and-using-secrets-encrypted-variables).

## Contributing

All contributions are welcome!
Follow the instructions [here](https://help.github.com/en/articles/creating-a-javascript-action#commit-and-push-your-action-to-github) to get started.

## FAQs

<details>
  <summary>Why is a Pivotal ID required in branch names?</summary>

Pivotal id is required in order to:

- Automate change-logs and release notes ⚙️.
- Automate alerts to QA/Product teams and/or other external stake-holders 🔊.
- Help us retrospect the sprint progress 📈.

</details>

<details>
  <summary>Is there a way to get around this?</summary>
  Nope 🙅

</details>

<details>
  <summary>Are there any tools to automate this?</summary>

Yes, check out [pivotal-flow][pivotal-flow] 🚀
</details>

[pivotal]: https://www.pivotaltracker.com/features
[pivotal-flow]: https://github.com/ClearTax/pivotal-flow
