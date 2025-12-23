import KafkaMicro from './src/kafka.js';

const myVariable = process.env.ENV;

if (myVariable) {
  console.log(`The value of ENV is: ${myVariable}`);
} else {
  console.log('ENV is not set.');
}

// Requiring module
import http from "http";
import express from "express";

import * as promClient from "prom-client";


import fs from "fs";
import url from "url";

import * as THREE from 'three';

import os from 'os';
const hostname = os.hostname().toLowerCase();



import { Server } from "socket.io";
import { update } from 'three/examples/jsm/libs/tween.module.js';
// import UTMLatLng from 'utm-latlng/index.js';
import UTMLatLng from 'utm-latlng';


const app = express();
let myhttp = http.createServer(app);


let origin = process.env.VIEWER_URL || "http://" + hostname + ":8080";
console.log("This streamer only accepts connections from " + origin);

let io = new Server(myhttp, {
  cors: {
    origin: origin,
    methods: ["GET", "POST"],
  //   // transports: ["websocket", "polling"],
    credentials: true,
  },
  allowEIO3: true,
});

myhttp.listen(8088);


// Create a custom metric to track active socket.io connections
const activeConnections = new promClient.Gauge({
  name: 'socket_io_active_connections',
  help: 'Number of active socket.io connections'
});

// Expose metrics endpoint for Prometheus to scrape
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

function handler(req, res) {
  var q = url.parse(req.url, true);
  var filename = "." + q.pathname;
  if (filename == "./") {
    filename = "./index.html";
    // console.log(filename);
  }
  console.log(filename);

  if ( filename == "./metrics") {

    // res.set('Content-Type', promClient.register.contentType);
    res.writeHead(200, { "Content-Type": promClient.register.contentType });
    res.end( promClient.register.metrics());
  } else {



    res.end("404 Not Found");
  }
}

let socketHandlers = [];

// let installs = [];
// let calibration = [];
let states = [];
io.sockets.on("connection", function (socket) {
  // WebSocket Connection
  let socketHandler = {
    socket: socket, 
    frustum: null,
    viewable_installations: []
  };
  socketHandlers.push(socketHandler);

  // console.log("socketHandlers.length = " + socketHandlers.length);
  // Increment the counter for active connections
  activeConnections.inc();

  // mySock = socket;
  // console.log("New client!");
  var clientIp = socket.request.connection.remoteAddress;

  console.log('New connection from ' + clientIp + ' total clients (maybe): ' + socketHandlers.length);

  socket.onAny((event, ...args) => {
    // console.log('got from ' + clientIp + ` ${event}`);
  });
  
  // var lightvalue = 0; //static variable for current status
  var frustum;
  socket.on("frustum", function (data) {
    //get light switch status from client
//     console.log(data);


    let planes = [];

    for( const plane of data.planes) {
      // console.log(plane.constant);
      planes.push(new THREE.Plane(  new THREE.Vector3(plane.normal.x, plane.normal.y, plane.normal.z), 
                                    plane.constant
                                  )
                                );

    }

    frustum = new THREE.Frustum( planes[0], planes[1], planes[2], planes[3], planes[4], planes[5]);
    // console.log(frustum);

    var sphere = new THREE.Sphere(new THREE.Vector3(0,0,0), 1);

    // console.log(frustum.intersectsSphere(sphere));

    socketHandler.frustum = frustum;

    // for(let ouster of ousters) {
    //   ouster.updateFrustum(frustum);
    // }


//     for(let kafka of kafkas) {
//       kafka.updateFrustum(frustum);
// //        console.log("frustum");
//     }
    // lightvalue = data;
    // if (lightvalue) {
    //   //console.log(lightvalue); //turn LED on or off, for now we will just show it in console.log
    // }
  });

  socket.on("viewable_installations", function (data) {
    // console.log(data);
    socketHandler.viewable_installations = data;
  });

  // if(calibration) {
  //   socket.emit('calibration', calibration);
  // }

  // var states = [];
  // for(var g in geminis) {
  //   states.push(geminis[g].getState());
  // }
  

  socket.emit('states', states);
  // socket.emit('installs', installs);

  socket.on('disconnect', function (reason) {
    // Decrement the counter when a connection disconnects
    activeConnections.dec();

    socketHandlers = socketHandlers.filter(item => item.socket.id !== socket.id);
    console.log("Client left: " + clientIp + " total connections: " + socketHandlers.length);

    notifyClientCountChange( socketHandlers.length );
  });

  // socket.on('calibration', function (data) {
  //   console.log(data);
  //   kafka.sendCalibration(data);
  // });

  notifyClientCountChange( socketHandlers.length );

});

function notifyClientCountChange( socketCount ) {

  // let point = new Point('clients')
  // .tag('count', 'count1')
  // .intField('total', socketCount);

  // console.log('!! writing ' + point);
  // influxClient.writePoint(point);
  if(kafka) {
    kafka.updateSocketHandlers(socketHandlers);
  }

  io.sockets.emit('clients', socketCount);

}

// var ousters = [];
// var geminis = [];
var kafkas = [];

// console.log("Hello! Importing intersection-config.json...");

const topics = {
  "nashville-sleigh": sleigh_callback
}

var kafka = new KafkaMicro("live-sleigh", io.sockets, socketHandlers, topics); // using ouster instead
kafkas.push(kafka);
console.log("Added kafka Sleigh listener");

function sleigh_callback ( update ) { 
  // console.log("In sleigh_callback ");
  const object = JSON.parse(update);
  // console.log(object);
  // console.log(object.milemarker);

  io.sockets.emit("nashville_sleigh", object);
}

