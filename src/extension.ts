import * as vscode from "vscode";
import { NotebookContentProvider } from "./notebookProvider";
import { NotebookOutputRenderer } from "./notebookOutputRenderer";
import { FluidKernel } from "./runtime/kernel";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(NotebookContentProvider.register(context));
  context.subscriptions.push(NotebookOutputRenderer.register(context));
  // It seems this isn't necessary
  // context.subscriptions.push(FluidKernel.register(context));
}

export function deactivate() {}
