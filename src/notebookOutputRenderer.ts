import * as vscode from "vscode";

export class NotebookOutputRenderer implements vscode.NotebookOutputRenderer {
  static mimeType = "application/vnd.darknoon.fluid-notebook";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new NotebookOutputRenderer(context);
    const providerRegistration = vscode.notebook.registerNotebookOutputRenderer(
      "darknoon.fluid-notebook.dom",
      { type: "display_data", subTypes: [NotebookOutputRenderer.mimeType] },
      provider
    );
    return providerRegistration;
  }

  constructor(context: vscode.ExtensionContext) {
    this.preloads = [
      vscode.Uri.joinPath(context.extensionUri, "out", "output", "webview.js"),
    ];
  }

  private _subs: vscode.Disposable[] = [];

  dispose() {
    this._subs.forEach((d) => d.dispose());
  }

  render(
    a: vscode.NotebookDocument,
    output: vscode.CellDisplayOutput,
    mimeType: string
  ): string {
    if (mimeType === NotebookOutputRenderer.mimeType) {
      const nbe = vscode.notebook.activeNotebookEditor;

      // if (nbe !== undefined) {
      //   const pm = async () => {
      //     console.log("posting message");
      //     const ret = await nbe.postMessage({
      //       message: "test test",
      //     });
      //     if (ret) {
      //       console.log("posted mesasge");
      //     }
      //   };
      //   pm();
      // }
      const data = output.data[NotebookOutputRenderer.mimeType];
      return `<div><b>${data.stringValue}</b></div>`;
    } else {
      return `<div>Can't render this</div>`;
    }
  }

  preloads: vscode.Uri[];
}
