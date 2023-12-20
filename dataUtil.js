const { dataCache } = require('./server.js');

function getPlayers() {
  return dataCache.players;
}

function getTactics() {
  return dataCache.tactics;
}

function getClubs() {
  return dataCache.clubs;
}

module.exports = {
  getPlayers,
  getTactics,
  getClubs
};
