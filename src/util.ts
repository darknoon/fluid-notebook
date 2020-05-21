import * as crypto from "crypto";
import * as vscode from "vscode";

export function getNonce() {
  return crypto.randomBytes(16).toString("hex");
}

export function checkVSCodeAPIAvailable(): boolean {
  // API is very new so check existence
  return (
    typeof vscode.notebook !== "undefined" &&
    typeof vscode.notebook.onDidChangeVisibleNotebookEditors === "function" &&
    typeof vscode.notebook.onDidChangeVisibleNotebookEditors === "function"
  );
}
