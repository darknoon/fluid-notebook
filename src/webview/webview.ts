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

let _has_initialized = false;

function initializeIfNeeded(doc: Document) {
  if (!_has_initialized) {
    _has_initialized = true;
    console.log("webview.ts initializing for document: ", doc.nodeName);
    addEventListener("message", listener);
  }
}

const listener = (e: MessageEvent) => {
  const { data } = e;
  if (isUpdateCellMessage(data)) {
    const { ident } = data;
    const elem = document.getElementById(ident);
    if (elem) {
      updateCell(elem, data);
    } else {
      console.warn("message for nonexistent cell:", ident);
    }
  }
};

const updateCell = (elem: Element, message: UpdateCellMessage) => {
  if (elem) {
    elem.innerHTML = message.value.string;
  }
};

export function subscribeCell(ident: string) {
  initializeIfNeeded(document);
  const elem = document.getElementById(ident);
  if (elem === null) {
    throw new Error(`Can't subscribe cell #${ident} because id doesn't exist!`);
  }

  const vscode = acquireVsCodeApi();
  vscode.postMessage({
    type: "darknoon.cellBooted",
    ident,
  } as CellBootedMessage);
  elem.innerHTML = `<div>Booted ${ident}, waiting for value...</div>`;
}
