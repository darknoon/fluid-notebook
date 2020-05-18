import * as vscode from "vscode";

// There isn't a a way to grab this so we can communicate with our webview! argh!
// This is an ugly disgusting hack!

interface ActiveNotebookEditorDidChangeEvent {
  editor: typeof vscode.notebook.activeNotebookEditor;
}

const _e = new vscode.EventEmitter<ActiveNotebookEditorDidChangeEvent>();

const checkInterval = 500;

let _prev: typeof vscode.notebook.activeNotebookEditor;
setInterval(() => {
  const editor = vscode.notebook.activeNotebookEditor;
  if (editor !== _prev) {
    _e.fire({ editor });
    _prev = editor;
  }
}, checkInterval);

export const onActiveNotebookEditorDidChange = _e.event;

// TODO: listen for document close and reject
export async function whenEditorActive(
  document: vscode.NotebookDocument
): Promise<vscode.NotebookEditor> {
  if (vscode.notebook.activeNotebookEditor?.document === document) {
    return vscode.notebook.activeNotebookEditor;
  }
  return new Promise((resolve) => {
    console.log("Not the active editor, waiting until we are...");
    const disposable = onActiveNotebookEditorDidChange(({ editor }) => {
      resolve(editor);
      // Unregister ourselves for future events
      disposable.dispose();
    });
  });
}
