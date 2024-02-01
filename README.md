# Git Submodule Status Commenter

This action informs PR reviewers about the submodule status the PR is using:

> **Submodule "Foo" status**
>
> -   Current branch: **feature/bar**
> -   Commits behind main: **2**
> -   Commits ahead main: **10**
>
> [View exact state]() — [View open PR]()

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
                  github-token: ${{ secrets.GITHUB_TOKEN }} # Make sure this token allows to checkout the submodule
```
