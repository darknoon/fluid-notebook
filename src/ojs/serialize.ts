import * as vscode from "vscode";

export function serialize(document: vscode.NotebookDocument): string {
  const cellStrings = document.cells.map((cell) => {
    switch (cell.cellKind) {
      // Right now all code is js / typescript
      case vscode.CellKind.Code: {
        if (cell.language === "python") {
          return `py\`${cell.source}\`\;`;
        } else {
          return cell.source;
        }
      }

      case vscode.CellKind.Markdown:
        return `md\`${cell.source}\`\;`;
    }
  });

  return cellStrings.join("\n\n");
}
