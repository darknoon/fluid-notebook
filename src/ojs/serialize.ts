import * as vscode from "vscode";

export function serialize(document: vscode.NotebookDocument): string {
  const cellStrings = document.cells.map((cell) => {
    switch (cell.cellKind) {
      // Right now all code is js / typescript
      case vscode.CellKind.Code: {
        if (cell.language === "python") {
          return `py\`${cell.document.getText()}\`\;`;
        } else {
          return cell.document.getText();
        }
      }

      case vscode.CellKind.Markdown:
        return `md\`${cell.document.getText()}\`\;`;
    }
  });

  return cellStrings.join("\n\n");
}
