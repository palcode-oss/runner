const express = require("express");
const app = express();
const api = require("./api/index");
const socket = require("./socket/run");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const cors = require("cors");
const sanitize = require("sanitize-filename");
const indexHtml = require("./environment");

app.use(bodyParser.json());

if (process.env.NODE_ENV !== 'production') {
    app.use(cors());
}

if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.hostname !== process.env.PAL_HOST) {
            res.redirect("https://" + process.env.PAL_HOST);
        } else {
            next();
        }
    });
}

app.use("/api", api);

app.get('/*', (req, res) => {
    if (req.path.startsWith('/static/')) {
        res.sendFile(path.resolve('build/' + req.path));
        return;
    }

    const files = fs.readdirSync(path.resolve('build'));
    const isFile = files.some(file => {
        return req.path.startsWith('/' + file);
    });

    if (isFile && req.path !== '/index.html') {
        res.sendFile(path.resolve('build/' + sanitize(req.path)));
        return;
    }

    res.set('Content-Type', 'text/html')
    res.send(indexHtml);
});

let server;
if (process.env.NODE_ENV !== 'production') {
    server = require("http").createServer(app);
} else {
    const https = require("https");
    const options = {
        key: fs.readFileSync('key.pem'),
        cert: fs.readFileSync('cert.pem'),
    }

    server = https.createServer(options, app);
}

const io = require("socket.io")(server);
socket(io);

server.listen(process.env.PAL_PORT, () => {
    console.log("Ready on port " + process.env.PAL_PORT);
});
