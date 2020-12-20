FROM node:14-slim

RUN mkdir /opt/palcode-runner
WORKDIR /opt/palcode-runner

COPY package.json ./
COPY yarn.lock ./

RUN yarn install --production
COPY . ./

CMD [ "yarn", "run", "start" ]
