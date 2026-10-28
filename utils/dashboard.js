"use strict";
const moment = require("moment-timezone");
const { buildArchive } = require("./archive");
const names = {
  "Cyanistes caeruleus": "Blue tit", "Pica pica": "Magpie", "Erithacus rubecula": "European robin", "Passer domesticus": "House sparrow", "Turdus merula": "Common blackbird",
};
const buildDashboard = (rows, now = new Date()) => {
  const current = moment(now).tz("Europe/Dublin");
  const valid = rows.filter(row => row.timestamp && Number.isFinite(new Date(row.timestamp).getTime()) && new Date(row.timestamp) <= now).sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
  const today = valid.filter(row => moment(row.timestamp).tz("Europe/Dublin").isSame(current,"day"));
  const decorate = row => {
    const media = buildArchive([row]).sightings[0];
    return { ...media, name: names[row.species] || media.species, scientificName: names[row.species] ? row.species : "", typeLabel: row.kind === "cat" ? "Cat" : "Bird" };
  };
  const birds = today.filter(row => row.kind === "bird"), cats = today.filter(row=>row.kind === "cat");
  const birdHours = Array(24).fill(0), catHours = Array(24).fill(0);
  today.forEach(row => { (row.kind === "cat" ? catHours : birdHours)[moment(row.timestamp).tz("Europe/Dublin").hour()] += 1; });
  return {
    dashboardStats: { status: valid[0]?.kind === "cat" ? "Cat detected" : valid[0]?.kind === "bird" ? "Bird spotted" : "No activity", statusClass: valid[0]?.kind === "cat" ? "status-cat" : valid[0]?.kind === "bird" ? "status-bird" : "status-neutral", visits: birds.length, cats: cats.length, species: new Set(birds.map(row=>row.species).filter(name=>name && name !== "Unknown bird")).size },
    latest: valid[0] ? decorate(valid[0]) : null,
    recentActivity: valid.slice(0,3).map(decorate), timeline: today.map(decorate),
    activityJson: JSON.stringify({ labels:birdHours.map((_,i)=>`${String(i).padStart(2,"0")}:00`), birds:birdHours, cats:catHours }),
  };
};
module.exports = { buildDashboard };
