# Git Submodule Status Commenter

This action informs PR reviewers about the status of submodules the PR is using: their current branch and how many commits is the submodule behind or ahead of the main branch.

## Configuration

```yaml
name: Submodule status commenter
on:
    pull_request:
        types: [opened, synchronize, reopened]
jobs:
    run:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
              with:
                  token: ${{ secrets.GITHUB_TOKEN }}
                  submodules: true
                  fetch-depth: 0

            - uses: rematocorp/submodule-status-commenter@v1
              with:
                  github-token: ${{ secrets.GITHUB_TOKEN }}
```
