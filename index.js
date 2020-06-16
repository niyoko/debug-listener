#!/usr/bin/env node

const udp = require('dgram');
const config = require('config');
const chalk = require('chalk');
const os = require('os');
const isNil = require('lodash/isNil');
const split = require('lodash/split');
const join = require('lodash/join');
const dropWhile = require('lodash/dropWhile');
const take = require('lodash/take');
const diff = require('date-fns/differenceInSeconds');
const parseIso = require('date-fns/parseISO');
const format = require('date-fns/format');

require('yargs')
  .command(['listen', '$0'], 'Listen incoming debug message', {}, listen)
  .help()
  .parse();

function listen() {
  const server = udp.createSocket('udp4');
  server.on('error', error => {
    console.log(`Error: ${error}`);
    server.close();
  });

  server.on('message', wrapTry(onMessage));
  server.on('listening', () => {
    const address = server.address();
    const {port, family, ipaddr} = address;

    console.log(`Server is listening at port ${port}`);
    console.log(`Server ip: ${ipaddr}`);
    console.log(`Server is IP4/IP6: ${family}`);
  });

  server.on('close', () => {
    console.log('Socket is closed !');
  });

  server.bind(config.get('port'));
}

let prevTime = null;
function onMessage(msg) {
  const item = JSON.parse(msg.toString());
  if (!isEnabled(item)) return;

  const {time} = item;
  const tm = parseIso(time);

  if (isNil(prevTime) || diff(tm, prevTime) > 2) {
    console.log('=====================');
    console.log(format(tm, 'HH:mm:ss'));
    console.log();
  }

  prevTime = tm;
  renderItem(console.log, item);
}

function renderItem(display, item) {
  const {category, message} = item;
  const color = getColor(item);
  display(formatTitle(color, category));
  display(formatText(color, truncateMessage(message)));
  display('');
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

function getColor(logItem) {
  const {levelName} = logItem;
  if (levelName === 'error') return 'red';
  if (levelName === 'warning') return 'yellow';
  if (levelName === 'info') return 'blue';
  if (levelName === 'trace') return 'green';
  return 'white';
}

function formatTitle(color, message) {
  return chalk[color].underline(message);
}

function formatText(color, message) {
  return chalk[color](message);
}

function bgColor(color) {
  return 'bg' + capitalizeFirstLetter(color);
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
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
