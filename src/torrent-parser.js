'use strict';

const bencode = require('bencode');
const crypto = require('crypto');

module.exports.size = torrent => {
  if (torrent.info.files) {
    return torrent.info.files.map(file => file.length).reduce((a, b) => a + b);
  } else {
    return torrent.info.length;
  }
};

module.exports.infoHash = torrent => {
  const info = bencode.encode(torrent.info);
  return crypto.createHash('sha1').update(info).digest();
};