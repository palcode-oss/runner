import express from 'express';
import WebSocket from 'ws';
import {installImages} from './install-images';
import {initListeners} from './socket/listeners';

const app = express();
app.enable('trust proxy');

app.get(['/', '/runner/'], (req, res) => {
    res.send('');
});

const server = require("http").createServer(app);
const ws = new WebSocket.Server({
    server,
    path: '/xterm',
});

initListeners(ws);

installImages()
    .then(() => {
        server.listen(process.env.PAL_PORT, () => {
            console.log("Ready on port " + process.env.PAL_PORT);
        });
    })
    .catch(() => {
        process.exit(1);
    });
