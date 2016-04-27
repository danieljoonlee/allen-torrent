'use strict';

module.exports.chunk = (iterable, chunkSize) => {
  let chunks = [];
  for (let i = 0; i < iterable.length; i += chunkSize) {
    chunks.push(iterable.slice(i, i + chunkSize));
  }
  return chunks;
};

module.exports.randInt32 = () => {
  return Math.floor(Math.random() * Math.pow(2, 32));
};