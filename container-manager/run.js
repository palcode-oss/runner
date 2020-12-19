const path = require("path");
const {getTag, getStorageRoot, isValidLanguage} = require("../helpers");
const Docker = require("dockerode");
const docker = Docker();
const uuid = require("uuid").v4;
const sanitize = require("sanitize-filename");
const installImages = require("./install-images");
const cloneCode = require("./clone-code");

installImages();

function execCode(projectId, language, socket, io) {
    io.to(projectId).emit('run', {
        status: 200,
        message: 'Starting...'
    });
    docker.createContainer({
        Image: getTag(language),
        name: projectId,
        WorkingDir: '/opt/runner',
        Binds: [
            path.resolve(getStorageRoot(), sanitize(projectId)) + ':/usr/src/app:rw',
        ],
        Entrypoint: [
            // Maximum run time for Python script (ensures infinite loops aren't left running)
            // written in minutes as a string
            // see https://linux.die.net/man/1/timeout
            `./run.sh`, parseInt(process.env.PAL_TIMEOUT || 15).toString() + "m",
        ],
        OpenStdin: true,
        Tty: true,
        // Maximum concurrent process IDs (PIDs) allowed within container
        // essential to preventing forkbomb/DDoS attacks
        // https://github.com/aaronryank/fork-bomb/blob/master/fork-bomb.py
        PidsLimit: parseInt(process.env.PAL_PID_LIMIT || 25),
        // Maximum RAM consumption of container in bytes
        // written as megabytes * 1048576
        Memory: parseInt(process.env.PAL_MEMORY_QUOTA || 100 * 1048576),
        // Maximum disk size of container in bytes
        // written as megabytes * 1048576
        DiskQuota: parseInt(process.env.PAL_DISK_QUOTA || 50 * 1048576),
        // CPU quota in units of 10^-9 CPUs/vCPUs
        // written as cores * 10^-9
        NanoCPUs: parseInt(process.env.PAL_CPU_QUOTA || 0.20 * Math.pow(10, 9)),
    }, (err, container) => {
        if (err) {
            console.log(err);
            io.to(projectId).emit('run', {
                status: 500,
                message: 'Run failed. Try again.',
                running: false,
            });
            return;
        }

        io.to(projectId).emit('run', {
            status: 200,
            message: 'Container created! Mounting...',
            running: true,
        });

        container.start();
        container.attach({
            stream: true,
            stdout: true,
            stderr: true,
        }, (err, stream) => {
            stream.on('data', (chunk) => {
                const stdout = chunk.toString('utf8');
                const stdoutID = uuid();
                io.to(projectId).emit('run', {
                    status: 200,
                    stdout,
                    stdoutID,
                    running: true,
                });
            });

            stream.on('end', () => {
                // ensure we fully delete the container once it has stopped
                containerStop(projectId);
                io.to(projectId).emit('run', {
                    status: 200,
                    running: false,
                });
            });
        });
    });
}

async function containerStdin(projectId, stdin) {
    const container = docker.getContainer(projectId);
    container.attach({
        stream: true,
        stdin: true,
        hijack: true,
    }, (err, stream) => {
        if (stream) {
            stream.write(stdin, () => {
                stream.end();
            });
        }
        return container.wait();
    });
}

async function containerStop(projectId) {
    try {
        await docker.getContainer(projectId).remove({
            force: true,
        });
    } catch (e) {}
}

module.exports = (io) => {
    io.on('connection', (socket) => {
        socket.on('start', async (data) => {
            if (!data.projectId || !isValidLanguage(data.language) || !data.schoolId) {
                socket.emit('run', {
                    status: 400,
                });
                return;
            }

            await containerStop(data.projectId);

            // clone latest code
            try {
                await cloneCode(data.projectId, data.schoolId);
            } catch (e) {
                socket.emit('run', {
                    status: 404,
                });
                return;
            }

            // ensure we aren't broadcasting any other projects
            // this function is undocumented (?) but does exist: https://github.com/socketio/socket.io/blob/1decae341c80c0417b32d3124ca30c005240b48a/lib/socket.js#L287
            socket.leaveAll();

            socket.join(data.projectId);
            execCode(data.projectId, data.language, socket, io);
        });

        socket.on('stdin', (data) => {
            if (!data.projectId || !data.stdin) {
                socket.emit('run', {
                    status: 400,
                });
                return;
            }

            containerStdin(data.projectId, data.stdin);
        });

        socket.on('stop', (data) => {
            if (!data.projectId) {
                socket.emit('run', {
                    status: 400,
                });
                return;
            }

            containerStop(data.projectId);
        });
    });
}
