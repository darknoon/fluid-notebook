import * as vscode from "vscode";

// Await our document having an editor associated with it
// This could really be an API on vscode.NotebookDocument instead!
export async function whenEditorActive(
  document: vscode.NotebookDocument
): Promise<vscode.NotebookEditor> {
  // Shortcut if we are already the active notebook editor
  if (vscode.notebook.activeNotebookEditor?.document === document) {
    return vscode.notebook.activeNotebookEditor;
  }
  return new Promise((resolve) => {
    console.log("Not the active editor, waiting until we are...");
    const disposable = vscode.notebook.onDidChangeActiveNotebookEditor((editor) => {
      if (editor?.document == document) {
        resolve(editor);
        // Unregister ourselves for future events
        disposable.dispose();
      }
    });
  });
}
