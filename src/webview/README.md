# Webview build

This folder contains the code that is imported inside the webview.

We have to build it as an ES Module to work around a race condition in the way VSCode is going to load scripts for our extension.
