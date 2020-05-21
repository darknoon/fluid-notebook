import * as vscode from "vscode";
import { load } from "./ojs/loadNotebook";
import { serialize } from "./ojs/serialize";
import { FluidKernel } from "./runtime/kernel";

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

  // "Builtin" kernels are supported vs going through the registry
  kernel: FluidKernel;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.kernel = new FluidKernel(this.context);
  }

  static supportedLanguages = ["javascript", "markdown", "python"];

  private _disposables: vscode.Disposable[] = [];

  async openNotebook(uri: vscode.Uri): Promise<vscode.NotebookData> {
    const fileData = await vscode.workspace.fs.readFile(uri);
    const content = fileData.toString();

    const { cells } = load(content);

    // This event is broken (never called in VSCode source code)
    this._disposables.push(
      vscode.notebook.onDidOpenNotebookDocument(
        (doc: vscode.NotebookDocument) => {
          console.log("Did open document: ", doc.uri);
        }
      )
    );

    // This helps document start running immediately, but causes some complexity b/c editor isn't really ready
    this._disposables.push(
      vscode.notebook.onDidChangeVisibleNotebookEditors((eds) => {
        console.log(
          `Visible editors changed: ${JSON.stringify(
            eds.map((ed) => ed.document.uri.toString())
          )}`
        );
      })
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

  private _changeEmitter = new vscode.EventEmitter<
    vscode.NotebookDocumentEditEvent
  >();

  onDidChangeNotebook = this._changeEmitter.event;

  static notebookType = "darknoon.fluid-notebook";
}
