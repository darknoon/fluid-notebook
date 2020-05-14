import {
  Runtime,
  Module,
  VariableInspector,
  Inspector,
  Variable,
  Value,
} from "@observablehq/runtime";
import * as vscode from "vscode";
import { compileCell, CompiledCell } from "../ojs/loadNotebook";

// Holds onto the runtime and lets you execute cells
// TODO: collect together runtime Disposables so we can dispose ourselves on close
export class NotebookExecution {
  runtime = new Runtime();
  main: Module;

  variables = new Map<vscode.NotebookCell, Variable>();

  document: vscode.NotebookDocument;

  constructor(document: vscode.NotebookDocument) {
    console.log("starting runtime...");

    this.document = document;
    this.main = this.runtime.module();
  }

  load() {
    console.log("loading all cells...", this.document.cells);
    for (let c of this.document.cells) {
      this.updateCell(c);
    }
  }

  updateCell(cell: vscode.NotebookCell) {
    if (cell.cellKind == vscode.CellKind.Code) {
      // You could enter multiple variables in the cell?
      // Actually that's not syntactically valid. I should make that more explicit...

      const compiled = compileCell(cell.source);
      if (compiled) {
        const { name, inputs, value } = compiled;
        console.log(name, "created value update function: ", value.toString());

        // Is there an existing variable?

        let v = this.variables.get(cell);
        if (v === undefined) {
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
      }
    }
  }

  createInspector = (
    cell: vscode.NotebookCell,
    compiled: CompiledCell,
    name: string | null
  ): VariableInspector => {
    // @ts-ignore
    // Using some private api (handle) for debugging
    const debugName = name || cell?.handle;

    console.log("asked for inspector for name: ", name);
    return {
      pending() {
        cell.metadata.statusMessage = "pending";
        cell.metadata.runState = vscode.NotebookCellRunState.Running;
      },
      fulfilled(value) {
        // Find the right cell for this, how??
        // set every cell's output to this lol
        cell.outputs = [
          {
            outputKind: vscode.CellOutputKind.Text,
            text: String(value),
          },
        ];
        if (compiled.generator) {
          cell.metadata.statusMessage = "";
          cell.metadata.runState = vscode.NotebookCellRunState.Running;
        } else {
          cell.metadata.statusMessage = "";
          cell.metadata.runState = vscode.NotebookCellRunState.Idle;
        }

        console.log(debugName, "fulfilled value", value);
      },
      rejected(error) {
        console.error(debugName, "Runtime error:", error);
        cell.metadata.runState = vscode.NotebookCellRunState.Error;
      },
    };
  };
}
