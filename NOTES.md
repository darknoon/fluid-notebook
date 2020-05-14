Issues to bring up with VSCode team:

- Since notebook will continue executing and returning results, want an API to choose whether document is dirtied by continued output (ticking up counters etc)

- Notebook opened event is not called (I would be using this to run cells initially)

- Have been using `Map<VSCodeObject, MyObject>` to do internal bookkeeping, is this safe in general?

- Can this work with the remote extension? Any particular things I need to ensure that it will be safe.
