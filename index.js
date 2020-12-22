const express = require("express");
const app = express();
const socket = require("./container-manager/run");
const installImages = require("./container-manager/install-images");

app.enable('trust proxy');

app.get(['/', '/runner/'], (req, res) => {
    res.send('');
});

const server = require("http").createServer(app);

const io = require("socket.io")(server, {
    path: '/runner/socket',
    cors: {
        origin: ['https://palcode.dev', 'http://localhost:3000'],
        credentials: true,
        allowedHeaders: [
            // some of these are safelisted, but adding anyway for definitive support: https://developer.mozilla.org/en-US/docs/Glossary/CORS-safelisted_request_header
            'Content-Type',
            'Authorization',
            'Connection',
            'Upgrade',
            'Sec-WebSocket-Version',
            'Sec-WebSocket-Key',
            'Sec-WebSocket-Extensions',
            'Cache-Control',
        ],
        methods: ['GET', 'POST'],
    }
});
socket(io);

installImages()
    .then(() => {
        server.listen(process.env.PAL_PORT, () => {
            console.log("Ready on port " + process.env.PAL_PORT);
        });
    })
    .catch(() => {
        process.exit(1);
    });
