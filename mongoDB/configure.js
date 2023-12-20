const mongoose = require("mongoose");
const schema = new mongoose.Schema({}, { strict: false });
const playerDatas = mongoose.model("playerdatas", schema);
const tacticDatas = mongoose.model("tacticdatas", schema);
const clubDatas = mongoose.model("clubdatas", schema);
const penStats = mongoose.model("penstats", schema);

module.exports = {
  getPlayers: async function () {
    try {
        var players = await playerDatas.find({})
        return players[0]
    } catch (error) {
        console.error("Error finding userData:", error);
    }
  },
  getTactics: async function () {
    try {
        var tactics = await tacticDatas.find({})
        return tactics[0]
    } catch (error) {
        console.error("Error finding userData:", error);
    }
  },
  getClubs: async function () {
    try {
        var clubs = await clubDatas.find({})
        return clubs
    } catch (error) {
        console.error("Error finding userData:", error);
    }
  },
  updatePen: async function (userID, obj) {
    try {
      let userStats = await penStats.findOne({ userID });
  
      if (!userStats) {
        userStats = new penStats({ userID, ...obj });
        await userStats.save();
      } else {
        for (const property in obj) {
          if (obj.hasOwnProperty(property)) {
            userStats.set(property, userStats[property] + obj[property]);
          }
        }
        await userStats.save();
      }
  
      return obj;
    } catch (error) {
      console.error("Error finding or updating user data:", error);
    }
  },
  getPen: async function (userID) {
    try {
      let userStats = await penStats.findOne({ userID });
      return userStats;
    } catch (error) {
      console.error("Error finding or updating user data:", error);
    }
  }   
}