"use strict";
const moment = require("moment-timezone");
const getSightings = (now = new Date()) => {
  const current = moment(now).tz("Europe/Dublin"), rows = [];
  const add = (time, cat, magpie, index) => {
    if (time.isAfter(current)) return;
    rows.push({ id: `${time.format("YYYY-MM-DD")}-${cat ? "cat" : "bird"}-${index}`, timestamp: time.toISOString(), species: cat ? "Cat detected" : magpie ? "Pica pica" : "Cyanistes caeruleus", kind: cat ? "cat" : "bird", type: cat ? "Cat detected" : "Bird spotted", image: `/captures/${cat ? "cat.jpg" : magpie ? "magpie.png" : "blue.jpg"}`, durationSeconds: cat ? 18 + index % 43 : 6 + index % 27, confidence: .9 + index % 10 / 100 });
  };
  for (let day = 0; day < 180; day++) {
    const start = current.clone().startOf("day").subtract(day, "days");
    for (let index = 0; index < 18 + (day * 7 % 19); index++) {
      add(start.clone().add(6 + (index * 3 + day) % 13, "hours").add((index * 17 + day * 11) % 60, "minutes"), false, (index + day) % 4 === 0, index);
    }
    for (let index = 0; index < 1 + day % 4; index++) add(start.clone().add(7 + (index * 4 + day) % 12, "hours").add((index * 23 + day * 13) % 60, "minutes"), true, false, index);
  }
  const elapsed = current.diff(current.clone().startOf("day"), "seconds");
  add(current.clone().subtract(Math.min(120, elapsed), "seconds"), false, false, 1001);
  add(current.clone().subtract(Math.min(420, elapsed), "seconds"), false, true, 1002);
  add(current.clone().subtract(Math.min(720, elapsed), "seconds"), true, false, 1003);
  return rows.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
};
const descriptions = [
  { slug: "cyanistes-caeruleus", commonName: "Blue tit", scientificName: "Cyanistes caeruleus", description: "A small, active garden bird recognised by its blue crown and yellow breast.", habitat: "Gardens, woodland edges and hedgerows", habitatEnvironments: ["Gardens", "Woodland edges", "Hedgerows"], diet: "Seeds, insects and small invertebrates", foods: ["Seeds", "Insects", "Small invertebrates"], behaviour: "Often visits feeders in quick, repeated movements.", image: "/captures/blue.jpg" },
  { slug: "pica-pica", commonName: "Magpie", scientificName: "Pica pica", description: "A black-and-white garden visitor with a long tail and an iridescent sheen.", habitat: "Gardens, farmland and woodland edges", habitatEnvironments: ["Gardens", "Farmland", "Woodland edges"], diet: "Insects, seeds and fruit", foods: ["Insects", "Seeds", "Fruit"], behaviour: "An alert, inquisitive bird that often forages on the ground.", image: "/captures/magpie.png" },
];
const getSpecies = (rows = getSightings()) => descriptions.map(species => {
  const matches = rows.filter(row => row.species === species.scientificName);
  return { ...species, initial: species.description[0], descriptionBody: species.description.slice(1), sightings: matches.length, lastSeen: matches.length ? moment(matches[0].timestamp).tz("Europe/Dublin").format("D MMM YYYY") : "Not yet seen" };
});
module.exports = { getSightings, getSpecies };
