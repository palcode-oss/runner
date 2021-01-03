import express from 'express';
import WebSocket from 'ws';
import {installImages} from './install-images';
import { initLspListeners, initStdListeners } from './socket/listeners';
import http from 'http';
import type { Socket } from 'net';
import * as url from 'url';

const app = express();
app.enable('trust proxy');

app.get('/', (req, res) => {
    res.send('');
});

const server = http.createServer(app);
const stdServer = new WebSocket.Server({
    noServer: true,
});
const lspServer = new WebSocket.Server({
    perMessageDeflate: false,
    noServer: true,
});
server.on('upgrade', (request: http.IncomingMessage, socket: Socket, head: Buffer) => {
    const path = url.parse(request.url || '').pathname;
    if (!path) {
        socket.destroy();
        return;
    }

    let wsServer: WebSocket.Server;
    if (path === '/xterm') {
        wsServer = stdServer;
    } else if (path === '/lsp') {
        wsServer = lspServer;
    } else {
        socket.destroy();
        return;
    }

    wsServer.handleUpgrade(request, socket, head, client => {
        wsServer.emit('connection', client, request);
    });
});

initStdListeners(stdServer);
initLspListeners(lspServer);

installImages()
    .then(() => {
        server.listen(process.env.PAL_PORT, () => {
            console.log("Ready on port " + process.env.PAL_PORT);
        });
    })
    .catch(() => {
        process.exit(1);
    });
