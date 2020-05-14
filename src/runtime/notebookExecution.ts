import {
  Runtime,
  Module,
  VariableInspector,
  Inspector,
  Variable,
  Value,
} from "@observablehq/runtime";
import * as vscode from "vscode";
import { compileCell } from "../ojs/loadNotebook";

// For testing, just use this define func
// https://observablehq.com/@tmcw/hello-world@7
function helloWorldModule(runtime: Runtime, observer: Inspector) {
  const main = runtime.module();

  // md function is currently not working / not defined. investigate!
  // main
  //   .variable(observer("hello"))
  //   .define(
  //     "hello",
  //     ["md", "name"],
  //     (
  //       md: (strs: TemplateStringsArray, ...rest: any[]) => any,
  //       name: string
  //     ): any => {
  //       return md`# Hello ${name}`;
  //     }
  //   );
  main.variable(observer("name")).define("name", () => "world");
  return main;
}

// TODO: fix naked expressions

interface ValueUpdateEvent {}

// Holds onto the runtime and lets you execute cells
export class NotebookExecution {
  runtime = new Runtime();
  main: Module;

  variables = new Map<vscode.NotebookCell, Variable>();

  private _valueChanged = new vscode.EventEmitter<ValueUpdateEvent>();
  valueChanged = this._valueChanged.event;

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
          v = this.main.variable(this.createInspector(cell, name));
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
    name: string | null
  ): VariableInspector => {
    // @ts-ignore
    // Using some private api (handle) for debugging
    const debugName = name || cell?.handle;

    console.log("asked for inspector for name: ", name);
    return {
      pending() {
        console.log(debugName, "pending value");
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

        console.log(debugName, "fulfilled value", value);
      },
      rejected(error) {
        console.error(debugName, "Runtime error:", error);
      },
    };
  };
}
