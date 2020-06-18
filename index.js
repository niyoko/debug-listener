#!/usr/bin/env node

const udp = require('dgram');
const config = require('config');
const os = require('os');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const isNil = require('lodash/isNil');
const split = require('lodash/split');
const join = require('lodash/join');
const dropWhile = require('lodash/dropWhile');
const take = require('lodash/take');
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

      if (isNil(prevTime) || diff(tm, prevTime) > 2) {
      }

      prevTime = tm;

      reportNewLog(item);
    }),
  );

  server.bind(config.get('listenerPort'));
}

function startViewer() {
  const server = express();
  server.set('view engine', 'pug');
  server.get('/', function(req, res) {
    res.render('index', {title: 'Hey', message: 'Hello there!'});
  });

  const httpServer = http.createServer(server);
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

function truncateMessage(message) {
  let lines = split(message, /\r\n|\r|\n/);
  lines = dropWhile(lines, x => !x);
  lines = take(lines, 4);

  return join(lines, os.EOL);
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
