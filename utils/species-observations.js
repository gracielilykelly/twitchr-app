"use strict";
const { buildArchive } = require("./archive");
const buildObservations = (species, rows) => {
  const names = [species.commonName, species.scientificName].filter(Boolean).map(name=>name.trim().toLowerCase());
  const matches = rows.filter(row=>row.kind === "bird" && names.includes(String(row.species || "").trim().toLowerCase()) && row.timestamp && Number.isFinite(new Date(row.timestamp).getTime())).sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
  const recentCaptures = [];
  for (const row of matches) {
    const media = buildArchive([row]).sightings[0];
    if (media.url) recentCaptures.push({ ...media, name: species.commonName });
    if (recentCaptures.length === 2) break;
  }
  return { total:matches.length, lastSeen:matches[0] ? new Date(matches[0].timestamp).toLocaleDateString("en-IE",{day:"numeric",month:"short",year:"numeric",timeZone:"Europe/Dublin"}) : "Not yet seen", recentCaptures, archiveUrl:`/archive?species=${encodeURIComponent(species.scientificName || species.commonName)}` };
};
module.exports = { buildObservations };
