FROM node:latest
WORKDIR /usr/src/app
COPY package.json ./
RUN npm install
# RUN npm install --save @influxdata/influxdb-client
# RUN npm install gtfs -g
COPY . .

EXPOSE 8088
CMD [ "node", "app.js" ]