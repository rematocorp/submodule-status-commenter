# Git Submodule Status Commenter

This action informs reviewers about the submodule status in the PR:

> **Submodule "foo" status**
>
> -   Current branch: **feature/bar**
> -   Behind main: **2 (4 days)**
> -   Ahead main: **1**
> -   Last commit: _"Merge pull request [foo#182](#)" by John Doe_
>
> [View exact state](#) — [View open PR](#) — [View last commit](#)

## Configuration

```yaml
name: Submodule status commenter
on:
    pull_request:
        types: [opened, synchronize, reopened, ready_for_review]
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
                  github-token: ${{ secrets.GITHUB_TOKEN }} # Make sure this token can access your submodules
```
