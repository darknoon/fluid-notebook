/// <reference lib="dom" />

export interface CellValue {
  string: string;
}

export interface UpdateCellMessage {
  type: "darknoon.updateCell";
  // Which cell this applies to
  ident: string;
  value: CellValue;
}
export function isUpdateCellMessage(data: any): data is UpdateCellMessage {
  return typeof data === "object" && data.type === "darknoon.updateCell";
}

export interface CellBootedMessage {
  type: "darknoon.cellBooted";
  ident: string;
}
export function isCellBootedMessage(data: any): data is CellBootedMessage {
  return typeof data === "object" && data.type === "darknoon.cellBooted";
}

let _is_initted = false;

function initializeForDocument(doc: Document) {
  if (!_is_initted) {
    _is_initted = true;
    console.log("webview.ts initializing for document: ", doc.nodeName);
    addEventListener("message", listener);
  }
}

console.log("hello from webview script");

function arrayFromNodeList<T extends Node>(nl: NodeListOf<T>): T[] {
  const a: T[] = [];
  nl.forEach((t) => a.push(t));
  return a;
}

// When we get events for cells that don't exist yet, save the most recent
const messages = new Map<string, UpdateCellMessage>();

const listener = (e: MessageEvent) => {
  // console.log(`> message event ${JSON.stringify(e.data)}`);
  const { data } = e;
  if (isUpdateCellMessage(data)) {
    const { ident } = data;
    const elem = document.getElementById(ident);
    if (elem) {
      updateCell(elem, data);
    } else {
      console.log("queueing message for cell:", ident);
      messages.set(ident, data);
    }
  }
};

const updateCell = (elem: Element, message: UpdateCellMessage) => {
  if (elem) {
    elem.innerHTML = message.value.string;
  }
};

// Shared API for webview cells, will recieve
export function subscribeCell(ident: string) {
  initializeForDocument(document);
  const elem = document.getElementById(ident);
  if (elem === null) {
    throw new Error(`Can't subscribe cell #${ident} because id doesn't exist!`);
  }

  const data = messages.get(ident);
  if (data) {
    updateCell(elem, data);
    console.log(`updating ${ident} with old message ${JSON.stringify(data)}`);
    messages.delete(ident);
  } else {
    // TODO: get the type of this API?
    const vscode = acquireVsCodeApi();
    vscode.postMessage({
      type: "darknoon.cellBooted",
      ident,
    } as CellBootedMessage);
    elem.innerHTML = `<div>Booted ${ident}, waiting for value...</div>`;
  }
}
