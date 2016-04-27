'use strict';

const bignum = require('bignum');
const Buffer = require('buffer').Buffer;
const torrentParser = require('./torrent-parser');
const udp = require('./udp');
const util = require('./util');

/**
 * @typedef Torrent
 * @type Object
 * @property {string} announce Url of the torrent's tracker.
 */

/**
 * Gets a list of the torrent's peers from its announce url.
 *
 * @param {Torrent} torrent
 * @param {string} id
 * @returns {*}
 */
module.exports.requestPeers = (torrent, id) => {
  const scheme = torrent.announce.toString('utf8').slice(0, 3);
  if (scheme === 'udp') {
    return udpRequestTracker(torrent, id).then(resp => resp.peers);
  }
};

const udpRequestTracker = (torrent, id) => {
  const url = torrent.announce.toString('utf8');

  console.log('connect request');
  const connResp = udp.send(url, buildConnReq());
  const announceResp = connResp.then(resp => {
    console.log('received connect response');
    return udp.send(url, buildAnnounceReq(torrent, id, parseConnRes(resp)));
  });

  console.log('announce request');
  return announceResp.then(resp => {
    console.log('received announce response');
    return parseAnnounceRes(resp);
  });
};

/**
 * Returns a Buffer object containing the raw bits to be sent to the tracker to
 * request a connection. Bits in the Buffer have the following structure:
 * <pre>
 *   Size            Name            Value
 *   64-bit integer  connection_id   0x41727101980
 *   32-bit integer  action          0 // connect
 *   32-bit integer  transaction_id
 * <pre>
 * `connection_id` is 0x41727101980 by default. `action` value of 0 indicates
 * this message is a request for connection. `transaction_id` is a randomly
 * generated 32-bit integer.
 *
 * @returns {Buffer}
 */
function buildConnReq() {
  const buf = Buffer.allocUnsafe(16);
  buf.writeUIntBE(0x41727101980, 0, 8);
  buf.writeUInt32BE(0, 8);
  buf.writeUInt32BE(util.randInt32(), 12);
  return buf;
}

function parseConnRes(resp) {
  return {
    action: resp.slice(0, 4).readUInt32BE(0),
    transactionId: resp.slice(4, 8).readUInt32BE(0),
    connectionId: resp.slice(8)
  }
}

function buildAnnounceReq(torrent, id, connResp) {
  const connectionId = connResp.connectionId;
  const action = bignum.toBuffer(1, {size: 4});
  const transactionId = bignum.toBuffer(util.randInt32(), {size: 4});
  const infoHash = torrentParser.infoHash(torrent);
  const peerId = Buffer.from(id);
  const downloaded = Buffer.alloc(8, 0);
  const left = bignum.toBuffer(torrentParser.size(torrent), {size: 8});
  const uploaded = Buffer.alloc(8, 0);
  const event = Buffer.alloc(4, 0);
  const ipAddress = Buffer.alloc(4, 0);
  const key = bignum.toBuffer(util.randInt32(), {size: 4});
  const numWant = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  const port = bignum.toBuffer(6881, {size: 2});

  const buffers = [connectionId, action, transactionId, infoHash, peerId,
    downloaded, left, uploaded, event, ipAddress, key, numWant, port];

  return Buffer.concat(buffers, 98);
}

function parseAnnounceRes(resp) {
  const peers = util.chunk(resp.slice(20), 6).map(address => {
    return {
      host: address.slice(0, 4).join('.'),
      port: address.slice(4).readUInt16BE(0)
    }
  });
  return {
    action: resp.slice(0, 4).readUInt32BE(0),
    transactionId: resp.slice(4, 8).readUInt32BE(0),
    leechers: resp.slice(8, 12).readUInt32BE(0),
    seeders: resp.slice(12, 16).readUInt32BE(0),
    peers: peers
  }
}