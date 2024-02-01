# Git Submodule Status Commenter

This action informs reviewers about the submodule status in the PR:

> **Submodule "foo" status**
>
> -   Current branch: **feature/bar**
> -   Behind main: **2 (4 days)**
> -   Ahead main: **1**
> -   Last commit: _"Merge pull request #182" by John Doe_
>
> [View exact state](#) — [View open PR](#) — [View last commit](#)

The action currently works only with one submodule. Create an issue if you wish us to support more (recursive) submodules.

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

            - uses: rematocorp/submodule-status-commenter@v1
              with:
                  github-token: ${{ secrets.GITHUB_TOKEN }} # Make sure this token can access the submodule
                  submodule-path: packages/foo # Absolute path to the submodule in the parent repository
```
