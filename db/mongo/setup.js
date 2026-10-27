db = db.getSiblingDB("esports_logs");
db.match_events.drop();
db.createCollection("match_events");
db.match_events.createIndex({ match_id: 1, timestamp: 1 });
db.match_events.createIndex({ player_id: 1 });
db.match_events.insertMany([
  { match_id: 1, player_id: 3, type: "kill", weapon: "rifle", timestamp: new Date(), meta: { round: 2, headshot: true } },
  { match_id: 1, player_id: 5, type: "death", timestamp: new Date(), meta: { round: 2 } },
  { match_id: 1, player_id: 3, type: "kill", weapon: "pistol", timestamp: new Date(), meta: { round: 3, headshot: false } },
  { match_id: 1, player_id: 5, type: "kill", weapon: "rifle", timestamp: new Date(), meta: { round: 4, headshot: true } },
  { match_id: 1, player_id: 3, type: "death", timestamp: new Date(), meta: { round: 4 } }
]);
printjson(db.match_events.aggregate([
  { $match: { type: "kill" } },
  { $group: { _id: "$player_id", kills: { $sum: 1 }, headshots: { $sum: { $cond: ["$meta.headshot", 1, 0] } } } },
  { $sort: { kills: -1 } }
]).toArray());
