'use strict';

const bignum = require('bignum');
const Buffer = require('buffer').Buffer;
const net = require('net');
const tracker = require('./tracker');
const torrentParser = require('./torrent-parser');

module.exports.download = (torrent, id) => {
  //const peersP = tracker.requestPeers(torrent, id);
  //peersP.then(peers => {
  //  peers.forEach(peer => {
  //    downloadFromPeer(peer, torrent, id);
  //  });
  //});
  downloadFromPeer({ host: '109.242.224.61', port: 28568 }, torrent, id);
};

const downloadFromPeer = (peer, torrent, id) => {
  const socket = new net.Socket();
  socket.on('error', console.log);
  console.log('connecting to peer', peer);
  socket.connect(peer.port, peer.host, () => {
    console.log('connected successfully: ', peer);
    onMsg(socket, responder);
    socket.write(buildHandshake(torrent, id));
  });
};

const onMsg = (socket, callback) => {
  let savedBuf = Buffer.alloc(0);
  let handshake = true;

  socket.on('data', recvBuf => {
    const msgLen = () => handshake ? savedBuf.readInt8(0) + 49 : savedBuf.readInt32BE(0) + 4;
    savedBuf = Buffer.concat([savedBuf, recvBuf]);
    while (savedBuf.length >= 4 && savedBuf.length >= msgLen()) {
      callback(socket, savedBuf.slice(0, msgLen()));
      savedBuf = savedBuf.slice(msgLen());
      handshake = false;
    }
  });
};

const responder = (socket, msg) => {
  const msgLen = msg.readInt32BE(0);
  const msgId = msgLen > 0 ? msg.readInt8(4) : null;
  const payload = msgLen > 0 ? msg.slice(5) : null;

  console.log(msg);
};

const buildHandshake = (torrent, id) => {
  const pstrlen = bignum.toBuffer(19, {size: 1});
  const pstr = Buffer.from('BitTorrent protocol');
  const reserved = bignum.toBuffer(0, {size: 8});
  const infoHash = torrentParser.infoHash(torrent);
  const peerId = Buffer.from(id);
  return Buffer.concat([pstrlen, pstr, reserved, infoHash, peerId]);
};