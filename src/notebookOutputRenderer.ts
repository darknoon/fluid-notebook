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
    this.preloads = [this.localResourceUri("main.js")];
  }

  localResourceUri(name: string) {
    return vscode.Uri.joinPath(
      this._context.extensionUri,
      "out",
      "webview",
      name
    );
  }

  private _subs: vscode.Disposable[] = [];

  dispose() {
    this._subs.forEach((d) => d.dispose());
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

    // Doesn't work since we might not be the active notebook yet
    // const uri = vscode.notebook.activeNotebookEditor?.asWebviewUri(
    //   this.localResourceUri("main.js")
    // );

    // console.log("booting cell with uri: ", uri.toString());

    // Couldn't get it to work without a delay here
    // const timeout = 100;

    const bootMessage: CellBootedMessage = {
      type: "darknoon.cellBooted",
      ident,
    };

    return /* html */ `
        <div class="darknoon-fluid-notebook-output unbooted" id="${ident}">Unbooted <code>${ident}</code></div>
        <script>
            (() => {
              const vscode = acquireVsCodeApi();
              vscode.postMessage(${JSON.stringify(bootMessage)})
            })()

            // I saw this in the julia-vega example, but for whatever reason our preload doesn't load early enough... :(
            if ("subscribeCell" in window) {
              console.error("Subscribed for id ${ident}");
              subscribeCell("${ident}");
            } else {
              console.error("Couldn't subscribe for id ${ident}. Waiting for our preload script.");
            }
        </script>
      `;
  }

  preloads: vscode.Uri[];
}
