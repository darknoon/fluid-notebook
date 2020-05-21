// @ts-check
const path = require("path");
const webpack = require("webpack");

// const CopyPlugin = require("copy-webpack-plugin");

// const extConfig: webpack.Configuration = {
//   target: "node",
//   entry: "./src/extension.ts",
//   output: {
//     filename: "extension.js",
//     libraryTarget: "commonjs2",
//     path: path.resolve(__dirname, "out"),
//   },
//   resolve: { extensions: [".ts", ".js"] },
//   module: { rules: [{ test: /\.ts$/, loader: "ts-loader" }] },
//   externals: { vscode: "vscode" },
// };

const webviewConfig /* webpack.Configuration */ = {
  target: "web",
  entry: "./src/webview/index.ts",
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "out", "webview"),
  },
  resolve: {
    extensions: [".js", ".ts", ".tsx"],
  },
  module: {
    rules: [{ test: /\.tsx?$/, loaders: ["babel-loader", "ts-loader"] }],
  },
  // externals: { react: "React", "react-dom": "ReactDOM" },
  // plugins: [new CopyPlugin([{ from: "react" }])],
};

module.exports = [webviewConfig];
