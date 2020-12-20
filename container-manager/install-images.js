const Docker = require("dockerode");
const docker = Docker();
const {getTags} = require("../helpers");

function pullWithPromise(tag) {
    return new Promise((resolve, reject) => {
        docker.pull(tag, function (err, stream) {
            if (err) {
                reject(err);
                return;
            }

            docker.modem.followProgress(
                stream,
                () => resolve(),
                () => undefined,
            );
        });
    });
}

module.exports = async () => {
    const tags = getTags();
    for (const tag of tags) {
        try {
            await pullWithPromise(tag);
            console.log(`Installed ${tag}.`);
        } catch (e) {
            console.error(`Pulling ${tag} failed!`, e);
            throw new Error(e);
        }
    }
}
