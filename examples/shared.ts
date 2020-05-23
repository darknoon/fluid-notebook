import ts from "typescript";

// interface Port {
//   // Type can be a single type or union of types
//   type: ts.Type;
//   name: string;
// }

interface Node {
  input: ts.FunctionDeclaration[];
  output: ts.FunctionDeclaration[];
  //   output: Port[];
}

export function computeSum(arr: number[]) {
  return arr.reduce((p, v) => p + v, 0);
}
