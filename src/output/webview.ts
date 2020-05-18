/// <reference lib="dom" />

import { Disposable } from "vscode";

export interface UpdateCellMessage {
  type: "darknoon.updateCell";
  // Which cell this applies to
  ident: string;
  value: {
    string: string;
  };
}

export function isUpdateCellMessage(data: any): data is UpdateCellMessage {
  return typeof data === "object" && data.type === "darknoon.updateCell";
}

console.log("hello from webview");
console.log("webview document is ", document);

// Shared API for webview cells
function subscribeCell(ident: string): Disposable {
  const setContent = (content: string) => {
    const elem = document.getElementById(ident);
    if (elem) {
      elem.innerHTML = content;
    }
  };

  const listener = (e: MessageEvent) => {
    const { data } = e;
    if (isUpdateCellMessage(data) && data.ident === ident) {
      setContent(data.value.string);
    }
  };
  setContent(`${ident}: listening...`);
  addEventListener("message", listener);
  return {
    dispose() {
      removeEventListener("message", listener);
    },
  };
}

declare global {
  interface Window {
    subscribeCell: typeof subscribeCell;
  }
}

window.subscribeCell = subscribeCell;
