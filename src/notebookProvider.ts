import * as vscode from "vscode";
import { NotebookExecution } from "./runtime/notebookExecution";
import { load } from "./ojs/loadNotebook";
import { serialize } from "./ojs/serialize";

export class NotebookContentProvider implements vscode.NotebookContentProvider {
  // Register ourselves for notebooks when asked
  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new NotebookContentProvider(context);
    const r = vscode.notebook.registerNotebookContentProvider(
      NotebookContentProvider.notebookType,
      provider
    );
    return vscode.Disposable.from(r);
  }

  constructor(private readonly context: vscode.ExtensionContext) {}

  static supportedLanguages = ["javascript", "markdown", "python"];

  // TODO: make a separate notebook thingy for each execution
  runtimes = new Map<vscode.NotebookDocument, NotebookExecution>();

  async openNotebook(uri: vscode.Uri): Promise<vscode.NotebookData> {
    const fileData = await vscode.workspace.fs.readFile(uri);
    const content = fileData.toString();

    const { cells } = load(content);

    // This event is broken (never called in VSCode source code)
    // vscode.notebook.onDidOpenNotebookDocument(
    //   (doc: vscode.NotebookDocument) => {
    //     console.log("Did open document: ", doc);
    //   }
    // );

    vscode.notebook.onDidChangeNotebookDocument(
      (e: vscode.NotebookDocumentChangeEvent) => {
        this.ensureRuntime(e.document);
      }
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

  // Event emitter in case we need to tell VSCode we changed the notebook content?
  private changeEmitter = new vscode.EventEmitter<
    vscode.NotebookDocumentChangeEvent
  >();

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
