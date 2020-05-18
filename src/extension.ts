import * as vscode from "vscode";
import { NotebookContentProvider } from "./notebookProvider";
import { NotebookOutputRenderer } from "./notebookOutputRenderer";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(NotebookContentProvider.register(context));
  context.subscriptions.push(NotebookOutputRenderer.register(context));
}

export function deactivate() {}
