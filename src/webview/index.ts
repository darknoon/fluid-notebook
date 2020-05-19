import { subscribeCell, initializeForDocument } from "./webview";

declare global {
  interface Window {
    subscribeCell: typeof subscribeCell;
  }
}

console.log("Hello from webpack");

if (typeof document !== "undefined") {
  initializeForDocument(document);
}

window.subscribeCell = subscribeCell;
