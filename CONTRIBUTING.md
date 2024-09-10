# How to Contribute

Contributions are essential for keeping this extension great. We try to keep it as easy as possible to contribute changes and we are open to suggestions for making it even easier. There are only a few guidelines that we need contributors to follow.

## Development

### Installation Prerequisites:

  * latest [Visual Studio Code](https://code.visualstudio.com/)
  * [Node.js](https://nodejs.org/) v20.0.0 or higher
  * optional: [gh](https://cli.github.com/) to manage pull requests.

### Steps
1. Fork and clone this repository

2. Change to the directory:
```bash
  $ cd vscode-granite
```
3. Install the NPM dependencies:
```bash
  $ npm run install:ci
```
This will install the dependencies for the extension and its [webview(s)](https://code.visualstudio.com/api/extension-guides/webview)

4. To run the extension, open the Debugging tab in VSCode.

5. Select and run 'Launch Extension' at the top left:

### Build the extension

You can package the extension as a *.vsix archive:
  ```bash
  $ npx @vscode/vsce package
  ```

It will generate a vscode-granite-`<version>`.vsix

You can then install it in VS Code by following these [instructions](https://code.visualstudio.com/docs/editor/extension-marketplace#_install-from-a-vsix).


## Contribute changes

Try to follow this workflow to contribute changes:

1. Fork the repository and clone your fork
2. Create a new branch
3. Make your changes in that branch
4. Commit and sign your commit (with the `-s` flag)
5. Push your branch up to your fork on GitHub
6. Open a pull request with a detailed description of your changes

With regards to git history, please:
- keep the git history linear, no merge commits.
- ensure PRs are squashed before merging, to keep changes atomic.

### Certificate of Origin

By contributing to this project you agree to the Developer Certificate of
Origin (DCO). This document was created by the Linux Kernel community and is a
simple statement that you, as a contributor, have the legal right to make the
contribution. See the [DCO](DCO) file for details.