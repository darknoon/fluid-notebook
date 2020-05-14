## Issues to bring up with VSCode team:

- Since notebook will continue executing and returning results, want an API to choose whether document is dirtied by continued output (ticking up counters etc)

- Notebook opened event is not called (I would be using this to run cells initially)

- Have been using `Map<VSCodeObject, MyObject>` to do internal bookkeeping, is this safe in general?

- Can this work with the remote extension? Any particular things I need to ensure that it will be safe? I noticed that the Julia code [is using Uri.toString()](https://github.com/julia-vscode/julia-vscode/blob/efcc643633016c7991774dcce5fc4d055041d067/src/notebookProvider.ts#L340)

### misc

Notebook progress
https://github.com/microsoft/vscode/issues/88243

Reference julia impl:
https://github.com/julia-vscode/julia-vscode/pull/980/files
->
https://github.com/julia-vscode/julia-vscode/blob/efcc643633016c7991774dcce5fc4d055041d067/src/notebookProvider.ts
https://github.com/microsoft/vscode/issues/85682#issuecomment-626896475

Cool:
https://nteract.gitbooks.io/hydrogen/
