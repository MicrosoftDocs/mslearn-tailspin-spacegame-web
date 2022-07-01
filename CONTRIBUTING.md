
# Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.microsoft.com.

When you submit a pull request, a CLA-bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## For maintainers: Updating feature branches

This repository uses feature branches to associate code with specific modules on Microsoft Learn. Any changes you make to the default branch will likely need to be propagated to each feature branch in this repo. A common example is when we need to update Node packages in `package.json`.

Here's one way to update the remote feature branches when you make a change to the default branch. Note that this process deletes all local branches except for `main`.

```bash
# Synchronize with the remote main branch
git checkout main
git pull origin main
# Delete all local branches except for main
git branch | grep -ve "main" | xargs git branch -D
# List all remote branches except for main
branches=$(git branch -r 2> /dev/null | grep -ve "main" | cut -d "/" -f 2)
# Synchronize each branch with main and push the result
while IFS= read -r branch; do
    # Fetch and switch to feature branch
    git fetch origin $branch
    git checkout $branch
    # Ensure local environment is free of extra files
    git clean -xdf
    # Merge down main
    git merge --no-ff main
    # Break out if merge failed
    if [ $? -ne 0 ]; then
        break
    fi
    # Push update
    git push origin $branch
done <<< "$branches"
# Switch back to main
git checkout main
```
