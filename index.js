'use strict';

const bencode = require('bencode');
const fs = require('fs');
const Downloader = require('./src/Downloader');

const peerId = '-AZ2060-123456789098';
const torrent = bencode.decode(fs.readFileSync('test2.torrent'));

const downloader = new Downloader(torrent, peerId);
downloader.download();

// catch promise errors
process.on('unhandledRejection', function(reason) {
  console.log(reason.stack);
});
