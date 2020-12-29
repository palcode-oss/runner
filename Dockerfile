FROM node:14-slim

ENV PAL_PORT=80
ENV NODE_ENV=production
ENV PAL_STORAGE_ROOT=/var/tmp/palcode-projects
ENV PAL_PYTHON_VERSION=3.9.1
ENV PAL_NODEJS_VERSION=14.15.3
ENV PAL_BASH_VERSION=1.0.0
ENV PAL_JAVA_VERSION=16
ENV PAL_PROLOG_VERSION=8.3.13
ENV PAL_GO_VERSION=1.15.6

RUN mkdir /opt/palcode-runner
WORKDIR /opt/palcode-runner

COPY package.json ./
COPY yarn.lock ./

RUN yarn install --production
COPY . ./

CMD [ "yarn", "run", "start" ]
