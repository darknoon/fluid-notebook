import {
  Runtime,
  Module,
  VariableInspector,
  Variable,
  Value,
} from "@observablehq/runtime";
import * as vscode from "vscode";
import { compileCell, CompiledCell } from "../ojs/loadNotebook";
import { NotebookOutputRenderer } from "../notebookOutputRenderer";
import { getNonce } from "../util";
import {
  UpdateCellMessage,
  isCellBootedMessage,
  CellBootedMessage,
} from "../webview/webview";
import { whenEditorActive } from "../hackNotebookEditorEvent";

// Holds onto the runtime and lets you execute cells
// TODO: collect together runtime Disposables so we can dispose ourselves on close
// There is one of these globally!
export class FluidKernel implements vscode.NotebookKernel, vscode.Disposable {
  label = "Fluid Node.js / Python";

  // At the moment we don't register this way since we are coupled to the notebook provider itself
  // public static register(context: vscode.ExtensionContext): vscode.Disposable {
  //   const kernel = new FluidKernel(context);
  //   const providerRegistration = vscode.notebook.registerNotebookKernel(
  //     "darknoon.fluid-notebook.dom",
  //     [],
  //     kernel
  //   );
  //   return providerRegistration;
  // }

  constructor(context: vscode.ExtensionContext) {
    this.preloads = [];
  }

  runtimes = new Map<vscode.NotebookDocument, NotebookRuntime>();

  ensureRuntime(document: vscode.NotebookDocument): NotebookRuntime {
    let runtime = this.runtimes.get(document);
    if (runtime === undefined) {
      runtime = new NotebookRuntime(document);
      this.runtimes.set(document, runtime);
      runtime.load();
    }
    return runtime;
  }

  private _disposables: vscode.Disposable[] = [];

  async executeCell(
    document: vscode.NotebookDocument,
    cell: vscode.NotebookCell,
    token: vscode.CancellationToken
  ): Promise<void> {
    // This is where we get told that the user changed something with the notebook
    const runtime = this.ensureRuntime(document);
    runtime.updateCell(cell);
  }

  async executeAllCells(
    document: vscode.NotebookDocument,
    token: vscode.CancellationToken
  ): Promise<void> {
    const runtime = this.ensureRuntime(document);
    for (let cell of document.cells) {
      runtime.updateCell(cell);
    }
  }

  dispose() {
    this.runtimes.forEach((runtime) => runtime.dispose());
    this._disposables.forEach((d) => d.dispose());
  }

  preloads?: vscode.Uri[];
}

// There is one of these PER NOTEBOOK
class NotebookRuntime implements vscode.Disposable {
  // Observable integration
  runtime = new Runtime();
  main: Module;

  /** For each cell, we keep track of the associated observable Variable */
  variables = new Map<vscode.NotebookCell, Variable>();

  document: vscode.NotebookDocument;

  constructor(document: vscode.NotebookDocument) {
    console.log("Starting fluid runtime...");

    this.document = document;
    this.main = this.runtime.module();

    this.subscribeWhenActive(document);
  }

  private async subscribeWhenActive(document: vscode.NotebookDocument) {
    console.log(
      "Waiting for editor for our document:",
      document.uri.toString()
    );
    const ourEditor = await whenEditorActive(document);
    console.log(
      "subscribing to webview messages for document",
      document.uri.toString()
    );
    ourEditor.onDidReceiveMessage(
      (message) => {
        if (isCellBootedMessage(message)) {
          this._replyCellBoot(ourEditor, message);
        }
      },
      undefined,
      this._disposables
    );
  }

  private _disposables: vscode.Disposable[] = [];

  private _replyCellBoot(editor: vscode.NotebookEditor, m: CellBootedMessage) {
    const { ident } = m;
    // send the cell a message with the current value
    const latest = this.latestValues.get(m.ident);
    if (latest !== undefined) {
      const m: UpdateCellMessage = {
        type: "darknoon.updateCell",
        ident,
        value: {
          string: String(latest),
        },
      };
      console.log(`Reply to webview boot: ${ident}: ${String(latest)}`);
      editor.postMessage(m);
    } else {
      console.warn(`No latest value to send to cell ${ident}`);
    }
  }

  dispose() {
    this.runtime.dispose();
    this._disposables.forEach((d) => d.dispose());
  }

  load() {
    console.log(
      "loading all cells...",
      this.document.cells.map((c) => `Cell ${c.uri.fragment}`)
    );
    for (let c of this.document.cells) {
      this.updateCell(c);
    }
  }

  updateCell(cell: vscode.NotebookCell) {
    if (cell.cellKind === vscode.CellKind.Code) {
      // You could enter multiple variables in the cell, but it's
      // not syntactically valid Observable.
      // I should make that more clear.
      const source = cell.document.getText();

      let compiled: CompiledCell | undefined;
      let compileError: Error | undefined;
      try {
        compiled = compileCell(source);
      } catch (e) {
        compileError = e;
      }

      if (compiled) {
        const { name, inputs, value } = compiled;
        // console.log(name, "created value update function: ", value.toString());

        // Is there an existing variable?
        let v = this.variables.get(cell);
        if (v === undefined) {
          // Create a new variable for the cell
          const ins = this.createInspector(cell, compiled, name);
          v = this.main.variable(ins);
          this.variables.set(cell, v);
        }

        // variable redefine is just define with new value
        if (name !== null) {
          v.define(name, inputs, value);
        } else {
          v.define(inputs, value as Value);
        }
      } else {
        cell.metadata.statusMessage = compileError?.message || "Compile Error";
        cell.metadata.runState = vscode.NotebookCellRunState.Error;
      }
    }
  }

  nonces = new Map<vscode.NotebookCell, string>();

  latestValues = new Map<string, any>();

  createInspector = (
    cell: vscode.NotebookCell,
    compiled: CompiledCell,
    name: string | null
  ): VariableInspector => {
    // Using some private api (handle) for debugging
    // @ts-ignore
    const debugName = name || `Cell #${cell?.handle}`;
    const ident = getNonce();
    this.nonces.set(cell, ident);
    let firstOutput = true;
    const doc = this.document;
    const latestValues = this.latestValues;
    return {
      pending() {
        if (firstOutput) {
          cell.metadata.statusMessage = "pending";
          cell.metadata.runState = vscode.NotebookCellRunState.Running;
        }
      },
      fulfilled(value) {
        latestValues.set(ident, value);
        // Only assign output the first time, otherwise VSCode will hang
        if (firstOutput) {
          cell.outputs = [
            {
              outputKind: vscode.CellOutputKind.Rich,
              data: {
                [NotebookOutputRenderer.mimeType]: {
                  ident,
                },
              },
            },
          ];

          if (compiled.generator) {
            cell.metadata.statusMessage = "";
            cell.metadata.runState = vscode.NotebookCellRunState.Running;
          } else {
            cell.metadata.statusMessage = "";
            cell.metadata.runState = vscode.NotebookCellRunState.Idle;
          }
          firstOutput = false;
        }
        const message: UpdateCellMessage = {
          type: "darknoon.updateCell",
          ident,
          value: {
            string: String(value),
          },
        };
        const editor = vscode.notebook.activeNotebookEditor;
        if (editor) {
          editor.postMessage(message);
          console.log(debugName, "Told document to update", value);
        } else {
          console.warn(
            debugName,
            "Can't tell document to update, enqueue",
            value
          );
          (async () => {
            const editor = await whenEditorActive(doc);
            console.log(
              debugName,
              "After waiting, told document to update",
              value
            );
            editor.postMessage(message);
          })();
        }
      },
      rejected(error) {
        console.error(debugName, "Runtime error:", error);
        cell.metadata.statusMessage = error.message;
        cell.metadata.runState = vscode.NotebookCellRunState.Error;
      },
    };
  };
}
