FROM node:14
WORKDIR /usr/src/app
EXPOSE 3000
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8080
CMD [ "node", "server.mjs" ]