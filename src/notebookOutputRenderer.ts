import * as vscode from "vscode";
import { UpdateCellMessage } from "./output/webview";
import { getNonce } from "./util";

const OutputMimeType = "application/vnd.darknoon.fluid-notebook";

export interface NotebookOutput extends vscode.CellDisplayOutput {
  data: {
    [OutputMimeType]: {
      ident: string;
    };
  };
}

export class NotebookOutputRenderer implements vscode.NotebookOutputRenderer {
  static mimeType = OutputMimeType;

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new NotebookOutputRenderer(context);
    const providerRegistration = vscode.notebook.registerNotebookOutputRenderer(
      "darknoon.fluid-notebook.dom",
      { type: "display_data", subTypes: [NotebookOutputRenderer.mimeType] },
      provider
    );
    return vscode.Disposable.from(providerRegistration);
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

  private cellToIdent = new Map<vscode.CellDisplayOutput, string>();

  render(
    notebook: vscode.NotebookDocument,
    output: NotebookOutput,
    mimeType: string
  ): string {
    if (mimeType !== OutputMimeType) {
      throw new Error(`Asked to render unknown MIME type ${mimeType}`);
    }
    const data = output.data[OutputMimeType];
    const { ident } = data as { ident: string };

    // Doesn't work since we might not be the active notebook yet
    // const uri = vscode.notebook.activeNotebookEditor?.asWebviewUri(
    //   this.preloads[0]
    // );

    return /* html */ `
      <!DOCTYPE html>
      <html lang="en">
        <body>
        <div id="${ident}">Placeholder for <code>${ident}</code></div>
        <script type="text/javascript">
          console.log("Yo it's ${ident}");
          console.log("window is " + JSON.stringify(Object.keys(window)));

          setTimeout(() => window.subscribeCell("${ident}"), 15);
        </script>
        </body>
      </html>`;
  }

  preloads: vscode.Uri[];
}
