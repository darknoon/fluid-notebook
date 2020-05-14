import * as vscode from "vscode";
import {
  parseModule,
  Cell,
  TaggedTemplateExpression,
  parseCell,
} from "@observablehq/parser";

interface MarkdownStructure extends TaggedTemplateExpression {
  tag: {
    type: "Identifier";
    name: "md";
  };
}

// Markdown cells stored as "md`...`"
function nodeIsMarkdown(body: acorn.Node): body is MarkdownStructure {
  return (
    body.type === "TaggedTemplateExpression" &&
    (body as TaggedTemplateExpression).tag.type === "Identifier" &&
    (body as TaggedTemplateExpression).tag.name === "md"
  );
}

interface PythonStructure extends TaggedTemplateExpression {
  tag: {
    type: "Identifier";
    name: "py";
  };
}

function nodeIsPython(body: acorn.Node): body is PythonStructure {
  return (
    body.type === "TaggedTemplateExpression" &&
    (body as TaggedTemplateExpression).tag.type === "Identifier" &&
    (body as TaggedTemplateExpression).tag.name === "py"
  );
}

interface CompiledCell {
  // Cells don't have to be named
  name: string | null;
  inputs: string[];
  value: Function;
}

function isDefined<T>(v: T | undefined): v is T {
  return v !== undefined;
}

/*
From https://github.com/hpcc-systems/Visualization/blob/61f184fbcf95588cc82043920d4c7c9260d5fac2/packages/observable-md/src/util.ts#L11
*/
//  Dynamic Functions ---
export const FuncTypes = new Function(`
return {
    functionType: Object.getPrototypeOf(function () { }).constructor,
    asyncFunctionType: Object.getPrototypeOf(async function () { }).constructor,
    generatorFunctionType: Object.getPrototypeOf(function* () { }).constructor,
    asyncGeneratorFunctionType: Object.getPrototypeOf(async function* () { }).constructor
};
`)();

function funcType(async: boolean = false, generator: boolean = false) {
  if (!async && !generator) return FuncTypes.functionType;
  if (async && !generator) return FuncTypes.asyncFunctionType;
  if (!async && generator) return FuncTypes.generatorFunctionType;
  return FuncTypes.asyncGeneratorFunctionType;
}
/*
 */

// When user changes document, this is what we need to actually provide to the runtime
export function compileCell(content: string): CompiledCell | undefined {
  // Just grab first cell right now, might make more sense to parse cell instea
  // const [c] = parseModule(content).cells;
  const c = parseCell(content);
  if (typeof c !== "object") {
    throw new Error("Missing cell");
  }

  const getSource = ({ start, end }: { start: number; end: number }) =>
    content.slice(start, end);

  // Compile the source to something that can acutally execute
  const makeFunction = (
    source: string,
    async: boolean,
    generator: boolean,
    blockStatement: boolean,
    inputs: string[]
  ): Function => {
    return new (funcType(async, generator))(
      ...inputs,
      blockStatement ? source : `{ return (${source}); }`
    );
  };

  // Any references need to get turned into an argument string (a, b, c) for the function
  const inputs: string[] = c.references
    .map((r) => (r.type === "Identifier" ? r.name : undefined))
    .filter(isDefined);

  return {
    name: c.id ? getSource(c.id) : "",
    inputs,
    value: makeFunction(
      getSource(c.body),
      c.async,
      c.generator,
      c.body.type === "BlockStatement",
      inputs
    ),
  } as CompiledCell;
}

export function load(content: string): { cells: vscode.NotebookCellData[] } {
  const module = parseModule(content);

  const getSource = (start: number, end: number) => content.slice(start, end);

  const cells = module.cells.map(
    (cell): vscode.NotebookCellData => {
      if (nodeIsMarkdown(cell.body)) {
        const qs = cell.body.quasi.quasis || [];
        const xs = cell.body.quasi.expressions || [];

        let mdString = "";
        for (let i = 0; i < qs.length; i++) {
          if (i < qs.length) mdString += qs[i].value.cooked;
          if (i < xs.length) {
            const source = getSource(xs[i].start, xs[i].end);
            mdString += `\$\{${source}\}`;
          }
        }

        return {
          cellKind: vscode.CellKind.Markdown,
          source: mdString,
          language: "markdown",
          outputs: [
            {
              outputKind: vscode.CellOutputKind.Rich,
              data: {
                "text/plain": getSource(cell.body.start, cell.body.end),
              },
            },
          ],
          metadata: {
            editable: true,
            runState: vscode.NotebookCellRunState.Idle,
          },
        };
      } else if (nodeIsPython(cell.body)) {
        const pythonString = cell.body.quasi.quasis
          .map((e) => e.value.cooked)
          .join("");
        return {
          cellKind: vscode.CellKind.Code,
          source: pythonString,
          language: "python",
          outputs: [],
          metadata: {
            editable: true,
            runState: vscode.NotebookCellRunState.Idle,
          },
        };
      } else {
        return {
          cellKind: vscode.CellKind.Code,
          source: getSource(cell.start, cell.end),
          language: "javascript",
          outputs: [],
          metadata: {
            editable: true,
          },
        };
      }
    }
  );
  return { cells };
}
