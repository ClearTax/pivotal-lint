# PR Lint 🧹

PR Lint checks for a pivotal story id in the branch name. It uses the pivotal API so any random
pivotal id will lead to check failure.

PR Lint will also add the following labels to the PR

- `escher | ultron | jarvis | neo | etc` - Based on the pivotal board
- `HOTFIX-PROD` - if the PR is raised against `production-release`
- `HOTFIX-PRE-PROD` - if the PR is raised against `release/v*`

### How to use PR Lint?

Add a `pr-lint.yml` file in your `.github/workflows/` directory

```yaml
name: PR lint

 on: [pull_request]

 jobs:
  pr_lint:
    runs-on: ubuntu-latest
    steps:
    - name: Check pivotal story in branch name and add POD label
      uses: cleartax/pr-lint@v2
      with:
        github-token: ${{ secrets.GITHUB_ACCESS_TOKEN }}
        pivotal-token: ${{ secrets.PIVOTAL_TOKEN }}

```

`github-token` and `pivotal-token` are required for PR Lint to work. You can add these token under github [secrets](https://help.github.com/en/articles/virtual-environments-for-github-actions#creating-and-using-secrets-encrypted-variables)

## How to contribute

Follow the instructions given [here](https://help.github.com/en/articles/creating-a-javascript-action#commit-and-push-your-action-to-github)

## FAQs

<details>
   <summary>Why pivotal id is required?</summary>

Pivotal id is required in order to
  - Automate the change logs and release notes ⚙️
  - Automate alerts to the QA and other external stake-holders 🔊
  - Help us retrospect the sprint progress 📈

</details>


<details>
     <summary>Is there a way to get around this?</summary>

 Nope 🙅
</details>

<details>
    <summary>Are there any tools to automate this?</summary>

Yes, check out [pivotal-flow](https://www.npmjs.com/package/pivotal-flow) 🚀
</details>
