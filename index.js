#!/usr/bin/env node

const udp = require('dgram');
const config = require('config');

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

  server.on('message', (msg, info) => {
    console.log(`Data received from client : ${msg.toString()}`);
    console.log(`Received ${msg.length} bytes from ${info.address}:${info.port}`);
  });

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
