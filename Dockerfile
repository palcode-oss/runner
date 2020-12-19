FROM node:14-slim
WORKDIR /opt/palcode-runner

COPY package.json ./
COPY yarn.lock ./

RUN yarn install --production
COPY . ./

CMD [ "yarn", "run", "start" ]
