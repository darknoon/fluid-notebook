declare global {
  function acquireVsCodeApi(): VSCodeWebviewAPI;

  interface VSCodeWebviewAPI {
    postMessage(message: any): void;
    setState(state: any): void;
    getState(): any;
  }
}

export {};
