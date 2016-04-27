'use strict';

const bignum = require('bignum');
const Buffer = require('buffer').Buffer;
const net = require('net');
const tracker = require('./tracker');
const torrentParser = require('./torrent-parser');

module.exports = class Downloader {
  constructor(torrent, id) {
    this.torrent = torrent;
    this.id = id;
    this.peerHaves = {};
    this.iHaves = {};
  }

  download() {
    //const peersP = tracker.requestPeers(this.torrent, this.id);
    //peersP.then(peers => {
    //  peers.forEach(peer => {
    //    const conn = new PeerConn(peer, this);
    //  });
    //});
    new PeerConn({ host: '177.100.139.125', port: 23012 }, this);
  }

  buildHandshake() {
    const pstrlen = bignum.toBuffer(19, {size: 1});
    const pstr = Buffer.from('BitTorrent protocol');
    const reserved = bignum.toBuffer(0, {size: 8});
    const infoHash = torrentParser.infoHash(this.torrent);
    const peerId = Buffer.from(this.id);
    return Buffer.concat([pstrlen, pstr, reserved, infoHash, peerId]);
  }
};

class PeerConn {
  constructor(peer, downloader) {
    this.socket = new net.Socket();
    this.peer = peer;
    this.downloader = downloader;

    this.socket.on('error', console.log);
    this.socket.connect(peer.port, peer.host, () => {
      this.onWholeMsg(this.responder.bind(this));
      this.socket.write(this.downloader.buildHandshake());
    });
  }

  onWholeMsg(callback) {
    let savedBuf = Buffer.alloc(0);
    let handshake = true;

    this.socket.on('data', recvBuf => {
      const msgLen = () => handshake ? savedBuf.readInt8(0) + 49 : savedBuf.readInt32BE(0) + 4;
      savedBuf = Buffer.concat([savedBuf, recvBuf]);

      while (savedBuf.length >= 4 && savedBuf.length >= msgLen()) {
        if (!handshake) callback(savedBuf.slice(0, msgLen()));
        savedBuf = savedBuf.slice(msgLen());
        handshake = false;
      }
    });
  }

  responder(msg) {
    console.log(msg)
    const msgLen = msg.readInt32BE(0);
    const msgId = msgLen > 0 ? msg.readInt8(4) : null;
    const payload = msgLen > 0 ? msg.slice(5) : null;

    if (msgId === 4) this.haveHandler(payload);
    if (msgId === 5) this.bitfieldHandler(payload);
  }
  
  haveHandler(payload) {
    const pieceIndex = payload.readInt32BE(payload);
    this.addPeerHave(pieceIndex);
  }

  bitfieldHandler(payload) {debugger
    for (let i = 0; i < payload.length; i++) {
      for (let j = 0; j < 8; j++) {
        const bitIdx = i * 8 + j;
        const bitmask = Math.pow(2, 7 - j);
        if ((payload[i] & bitmask) === bitmask) {
          this.addPeerHave(bitIdx);
        }
      }
    }
    console.log(this.downloader.peerHaves[this.peer.host]);
  }

  addPeerHave(pieceIndex) {
    let haves = this.downloader.peerHaves[this.peer.host];
    this.downloader.peerHaves[this.peer.host] = haves ?
      haves.concat([pieceIndex]) :
      [pieceIndex];
  }
}