# PalCode Runner
This Node.JS app is responsible for PalCode's most server-intense operation: code execution. It hosts a WebSocket server (wss://runner.palcode.dev/xterm in our cloud-hosted environment) and follows a slightly customised compression protocol defined by [palcode-oss/sockets](https://github.com/palcode-oss/sockets).

It's written in TypeScript and uses the `ws` module from NPM (the frontend uses the browser's built-in `WebSocket` API).

## Kubernetes
This repository also contains the official Kubernetes annotations used in PalCode's cloud environment (powered by Google Kubernetes Engine). These annotations aren't currently intended to work with your own deployment. However, an official deployment guide will be published soon.
