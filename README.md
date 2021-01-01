# PalCode Runner
This Node.JS app is responsible for PalCode's most server-intense operation: code execution. It hosts a WebSocket server (wss://runner.palcode.dev/xterm in our cloud-hosted environment) and follows a slightly customised compression protocol defined by [palcode-oss/sockets](https://github.com/palcode-oss/sockets).

It's written in TypeScript and uses the `ws` module from NPM (the frontend uses the browser's built-in `WebSocket` API).

## On-premises hosting
Setting PalCode Runner up is extremely easy, and you can even use it with non-PalCode frontends in your own projects.

For an on-premises hosting setup, PalCode Runner currently supports Linux-based servers only, running on either arm64 or amd64. Windows Server support is, however, being considered.

To make your life as easy as possible, PalCode Runner is deployed as a Docker image — this means you just need to set some environment variables, run a single command, and you're good to go.

0. Ensure Docker is installed. How you do this depends on your distro, but it's generally really easy:
    - [CentOS/RHEL](https://docs.docker.com/engine/install/centos/)
    - [Debian](https://docs.docker.com/engine/install/debian/)
    - [Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
    - [Fedora](https://docs.docker.com/engine/install/fedora/)

    Also, make sure you have a Google Cloud Platform project, and a JSON-format service account key with the `Storage Admin` role (or any other role with Cloud Storage read/write permissions).
    
1. Configure some environment variables. See [palcode/runner on Docker Hub](https://hub.docker.com/r/palcode/runner) for a guide.

2. Pull and run PalCode Runner (replace the specified values):
    ```
    docker run -d -p <your host port>:<PalCode Runner port (PAL_PORT)> \
        -v /var/run/docker.sock:/var/run/docker.sock \
        -v <your host path>:<PalCode Runner path (PAL_STORAGE_ROOT)> \
        --name palcode-runner
        palcode/runner
    ```

And that's it! PalCode Runner will take a few minutes to automatically install the language-specific images it uses — the server won't be responsive during this period. Assuming you followed the above command exactly, you can run this  to check whether it's ready:

```
docker logs palcode-runner --watch
```

When it's done, it will log a message like this:

```
Ready on port 80
```

You can now access the WebSocket API at ws://<your-ip-or-domain>/xterm. Use the [palcode-sockets](https://github.com/palcode-oss/sockets) library to send properly encoded messages to and from the server.

### Updates
Updating PalCode Runner is really easy. Versioning is done in compliance with SemVer — ensure you review any applicable changelogs before attempting to upgrade major versions.

1. Visit [palcode/runner on Docker Hub](https://hub.docker.com/r/palcode/runner/tags?page=1&ordering=last_updated) and find the 'tag' (e.g. 'v1.0.0') you'd like to use.
2. On your server, run this:
```
docker pull palcode/runner:<your tag here>
```

3. Run the command in step 2 of the previous section, but using `palcode/runner:<your tag here>` as the image name, instead of just `palcode/runner`.

## Support
Need help setting up on-premises PalCode? Email [contact@palcode.dev](mailto:contact@palcode.dev) to get free support (within reason, and in compliance with the MIT license). Please remember that none of PalCode comes with any warranty.

## Kubernetes
This repository also contains the Kubernetes annotations used in PalCode's cloud environment (powered by Google Kubernetes Engine). These annotations aren't currently intended to work with your own deployment. However, an official deployment guide will be published soon.
