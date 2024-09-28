# Setup

## Directories

The following relative paths need to be used in git hooks:

Shell scripts: 
    - call external scripts: relative to repository directory
Javascript:
    - module import: relative to JavaScript file location
    - file writing: relative to repository directory

## Execution permissions
To run the git hooks, they need to be executable, from the repository directory execute the following command to 
allow execution of all git hooks files: 

```
chmod -R +x .githooks/
```
