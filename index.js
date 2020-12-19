const express = require("express");
const app = express();
const socket = require("./container-manager/run");

app.enable('trust proxy');

app.get(['/', '/runner/'], (req, res) => {
    res.send('');
});

const server = require("http").createServer(app);

const io = require("socket.io")(server, {
    path: '/runner/socket',
});
socket(io);

server.listen(process.env.PAL_PORT, () => {
    console.log("Ready on port " + process.env.PAL_PORT);
});
