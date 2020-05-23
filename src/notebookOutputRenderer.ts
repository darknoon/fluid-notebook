import * as vscode from "vscode";
import { CellValue, CellBootedMessage } from "./webview/webview";

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

  private _context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
    this.preloads = [
      // this.localResourceUri("main.js")
    ];
  }

  localResourceUri(name: string) {
    return vscode.Uri.joinPath(
      this._context.extensionUri,
      "out",
      "webview",
      name
    );
  }

  private disposables: vscode.Disposable[] = [];

  dispose() {
    this.disposables.forEach((d) => d.dispose());
  }

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

    const editor = vscode.notebook.visibleNotebookEditors.find(
      (ne) => ne.document === notebook
    );
    const uri = editor?.asWebviewUri(this.localResourceUri("esm/webview.js"));

    if (uri === undefined) {
      console.error(
        "Need to output HTML for cell, but we don't have an active editor!"
      );
    }

    return /* html */ `
        <div class="darknoon-fluid-notebook-output unbooted" id="${ident}">Unbooted <code>${ident}</code></div>
        <script type="module">
          ${uri ? `import {subscribeCell} from "${uri?.toString()}";` : ""}
          if (typeof subscribeCell !== "undefined") {
            console.info("Subscribed via ES6 import for id ${ident}");
            subscribeCell("${ident}");
          } else {
            console.error("Couldn't subscribe for id ${ident}. Waiting for our preload script.");
          }
        </script>
      `;
  }

  preloads: vscode.Uri[];
}
