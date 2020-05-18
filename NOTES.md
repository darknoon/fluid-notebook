## Issues to bring up with VSCode team:

- Since notebook will continue executing and returning results, want an API to choose whether document is dirtied by continued output (ticking up counters etc)

- Notebook opened event is not called (I would be using this to run cells initially)

- Have been using `Map<VSCodeObject, MyObject>` to do internal bookkeeping, is this safe in general?

- Can this work with the remote extension? Any particular things I need to ensure that it will be safe? I noticed that the Julia code [is using Uri.toString()](https://github.com/julia-vscode/julia-vscode/blob/efcc643633016c7991774dcce5fc4d055041d067/src/notebookProvider.ts#L340)

- How do I attach DevTools to the Webview that is hosting the cell outputs?

- This must be a string or other json serilizable object. "serializable" -> "serializable"

- `postMessage()` on output webview ->
  rejected promise not handled within 1 second: TypeError: o.postMessage is not a function

- `output-renderer` branch is very broken. Changing cell status quickly causes window to lock up.
  - solution: only make the output once for a cell, change output via `postMessage()` instead

### misc

Notebook progress
https://github.com/microsoft/vscode/issues/88243

## Reference extensions

### julia

https://github.com/julia-vscode/julia-vscode/pull/980/files
->
https://github.com/julia-vscode/julia-vscode/blob/efcc643633016c7991774dcce5fc4d055041d067/src/notebookProvider.ts
https://github.com/microsoft/vscode/issues/85682#issuecomment-626896475

### Github issues extension

https://github.com/microsoft/vscode-github-issue-notebooks

## Cool

https://nteract.gitbooks.io/hydrogen/
