#!/usr/bin/env node

const udp = require('dgram');
const config = require('config');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const isNil = require('lodash/isNil');
const diff = require('date-fns/differenceInSeconds');
const parseIso = require('date-fns/parseISO');

require('yargs')
  .command('$0', 'Listen incoming debug message', {}, execute)
  .help()
  .parse();

function execute() {
  const {reportNewLog} = startViewer();
  startListener({reportNewLog});
}

let prevTime = null;
let cluster = 0;
function startListener({reportNewLog}) {
  const server = udp.createSocket('udp4');
  server.on('error', error => {
    console.log(`Error: ${error}`);
    server.close();
  });

  server.on(
    'message',
    wrapTry(msg => {
      const item = JSON.parse(msg.toString());
      if (!isEnabled(item)) return;

      const {time} = item;
      const tm = parseIso(time);

      if (isNil(prevTime) || diff(tm, prevTime) > 5) {
        cluster++;
      }

      prevTime = tm;

      reportNewLog({...item, cluster});
    }),
  );

  server.bind(config.get('listenerPort'));
}

function startViewer() {
  const app = express();
  app.set('view engine', 'pug');
  app.get('/', function(req, res) {
    res.render('index');
  });

  app.use(express.static('public'));

  const httpServer = http.createServer(app);
  const wss = new WebSocket.Server({
    server: httpServer,
  });

  httpServer.listen(config.get('viewerPort'));

  return {
    reportNewLog: item => {
      for (const client of wss.clients) {
        client.send(JSON.stringify(item));
      }
    },
  };
}

function isEnabled(logItem) {
  const {level} = logItem;
  return level <= 10;
}

function wrapTry(fn) {
  return (...args) => {
    try {
      return fn(...args);
    } catch (e) {
      console.error(e);
    }
  };
}
