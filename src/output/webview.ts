/// <reference lib="dom" />

console.log("hello from webview");
console.log("webview document is ", document);

addEventListener("message", (e) => {
  console.log("webview message:", e.data);

  // Not sure what origin to reply to
  postMessage({ message: "reply" }, "*");
});
