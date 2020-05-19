import * as vscode from "vscode";
import { NotebookExecution } from "./runtime/notebookExecution";
import { load } from "./ojs/loadNotebook";
import { serialize } from "./ojs/serialize";
import { whenEditorActive } from "./hackNotebookEditorEvent";
import {
  isCellBootedMessage,
  CellBootedMessage,
  UpdateCellMessage,
} from "./webview/webview";

/* Notes:

https://github.com/microsoft/vscode/issues/88243

Reference julia impl:
https://github.com/julia-vscode/julia-vscode/pull/980/files
->
https://github.com/julia-vscode/julia-vscode/blob/efcc643633016c7991774dcce5fc4d055041d067/src/notebookProvider.ts
*/

export class NotebookContentProvider implements vscode.NotebookContentProvider {
  // Register ourselves for notebooks
  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new NotebookContentProvider(context);
    const providerRegistration = vscode.notebook.registerNotebookContentProvider(
      NotebookContentProvider.notebookType,
      provider
    );
    return providerRegistration;
  }

  constructor(private readonly context: vscode.ExtensionContext) {}

  static supportedLanguages = ["javascript", "markdown", "python"];

  // TODO: make a separate notebook thingy for each execution
  runtimes = new Map<vscode.NotebookDocument, NotebookExecution>();

  private _disposables: vscode.Disposable[] = [];

  async openNotebook(uri: vscode.Uri): Promise<vscode.NotebookData> {
    const fileData = await vscode.workspace.fs.readFile(uri);
    const content = fileData.toString();

    const { cells } = load(content);

    // This event is broken (never called in VSCode source code)
    vscode.notebook.onDidOpenNotebookDocument(
      (doc: vscode.NotebookDocument) => {
        console.log("Did open document: ", doc.uri);
      }
    );

    // This helps document start running immediately, but causes some complexity b/c editor isn't really ready
    this._disposables.push(
      vscode.notebook.onDidChangeNotebookDocument(
        (e: vscode.NotebookDocumentChangeEvent) => {
          if (e.document.uri.toString() === uri.toString()) {
            this.ensureRuntimeWhenActive(e.document);
          }
        }
      )
    );

    return {
      cells,
      languages: NotebookContentProvider.supportedLanguages,
      metadata: {
        editable: true,
        hasExecutionOrder: false,
      },
    };
  }

  private async ensureRuntimeWhenActive(document: vscode.NotebookDocument) {
    const ourEditor = await whenEditorActive(document);
    console.log(
      "subscribing to webview messages for document",
      document.uri.toString()
    );
    this._disposables.push(
      ourEditor.onDidReceiveMessage((message) => {
        if (isCellBootedMessage(message)) {
          this._handleMessage(ourEditor, message);
        }
      })
    );
    this.ensureRuntime(document);
  }

  private _handleMessage(editor: vscode.NotebookEditor, m: CellBootedMessage) {
    const { ident } = m;
    // send the cell a message with the current value
    const runtime = this.runtimes.get(editor.document);
    const latest = runtime?.latestValues.get(m.ident);
    if (latest !== undefined) {
      const m: UpdateCellMessage = {
        type: "darknoon.updateCell",
        ident,
        value: {
          string: String(latest),
        },
      };
      console.log(`Reply to webview boot: ${ident}: ${String(latest)}`);
      editor.postMessage(m);
    }
  }

  serialize(document: vscode.NotebookDocument): Buffer {
    return Buffer.from(serialize(document));
  }

  async saveNotebook(
    document: vscode.NotebookDocument,
    cancellation: vscode.CancellationToken
  ): Promise<void> {
    return vscode.workspace.fs.writeFile(
      document.uri,
      this.serialize(document)
    );
  }

  async saveNotebookAs(
    targetResource: vscode.Uri,
    document: vscode.NotebookDocument,
    cancellation: vscode.CancellationToken
  ): Promise<void> {
    // TODO: move runtime over?
    return vscode.workspace.fs.writeFile(
      targetResource,
      this.serialize(document)
    );
  }

  changeEmitter = new vscode.EventEmitter<vscode.NotebookDocumentChangeEvent>();

  onDidChangeNotebook = this.changeEmitter.event;

  ensureRuntime(document: vscode.NotebookDocument): NotebookExecution {
    let runtime = this.runtimes.get(document);
    if (runtime === undefined) {
      runtime = new NotebookExecution(document);
      this.runtimes.set(document, runtime);
      runtime.load();
    }
    return runtime;
  }

  executeCell(
    document: vscode.NotebookDocument,
    cell: vscode.NotebookCell | undefined,
    token: vscode.CancellationToken
  ): Promise<void> {
    // This is where we get told that the user changed something with the notebook

    const runtime = this.ensureRuntime(document);

    if (cell !== undefined) {
      runtime.updateCell(cell);
    } else {
      // Else update all cells in document?
    }

    console.log("asked to execute cell:", cell);
    return Promise.resolve();
  }

  static notebookType = "darknoon.fluid-notebook";
}
