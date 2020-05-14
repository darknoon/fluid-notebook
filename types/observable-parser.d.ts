// Just definitions to get our thing working, not a real typing

declare module "@observablehq/parser" {
  // Acorn doesn't completely adhere to ESTree spec, so manually define these
  import * as Acorn from "acorn";

  interface TemplateLiteral extends Acorn.Node {
    type: "TemplateLiteral";
    quasis: {
      type: "TemplateElement";
      value: { cooked: string; raw: string };
    }[];
    expressions: Acorn.Node[];
  }

  interface TemplateElement extends Acorn.Node {}

  interface Identifier {
    type: "Identifier";
    name: string;
  }

  interface TaggedTemplateExpression extends Acorn.Node {
    type: "TaggedTemplateExpression";
    tag: Identifier;
    quasi: TemplateLiteral;
  }

  interface Module extends Acorn.Node {
    type: "Module";
    cells: Cell[];
  }

  interface Cell extends Acorn.Node {
    type: "Cell";
    body: Acorn.Node;
    async: boolean;
    generator: boolean;
    id: Acorn.Node | null;
    references: Identifier[];
    input: string;
  }

  interface Options {
    globals?: string[];
  }

  export function parseModule(input: string, options?: Options): Module;
  export function parseCell(input: string, options?: Options): Cell;
}
