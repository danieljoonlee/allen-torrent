'use strict';

const dgram = require('dgram');
const urlParse = require('url').parse;

module.exports.send = (url, msg, maxTries=8, tries=0) => new Promise((resolve, reject) => {
  console.log('request attempt ', tries + 1, 'at ', url);
  const timeout = 1000 * Math.pow(2, tries) * 2;

  if (tries > maxTries) {
    reject('Upd request: max tries exceeded.');
  } else {
    sendOnce(url, msg, timeout).then(resolve).catch(() => {
      module.exports.send(url, msg, maxTries, tries + 1).then(resolve).catch(reject);
    });
  }
});

const sendOnce = (url, msg, timeout) => new Promise((resolve, reject) => {
  url = urlParse(url);
  const socket = dgram.createSocket('udp4');

  socket.on('message', resolve);

  setTimeout(() => {
    reject('UDP request timed out.');
    socket.close();
  }, timeout);

  socket.send(msg, 0, msg.length, url.port, url.hostname, () => {});
});