"use strict";
const moment = require("moment-timezone");
const ZONE = "Europe/Dublin";
const hourLabel = (hour) => `${String(hour).padStart(2, "0")}:00`;

const buildInsights = (sightings, range = "7", now = new Date()) => {
  const end = moment(now).tz(ZONE);
  const valid = sightings.filter((row) => row.timestamp && Number.isFinite(new Date(row.timestamp).getTime()) && new Date(row.timestamp) <= now);
  const start = range === "all" ? (valid.length ? moment(Math.min(...valid.map((row) => new Date(row.timestamp).getTime()))).tz(ZONE).startOf("day") : end.clone().startOf("day")) : end.clone().startOf("day").subtract(Number(range) - 1, "days");
  const rows = valid.filter((row) => moment(row.timestamp).isSameOrAfter(start));
  const birds = rows.filter((row) => row.kind === "bird");
  const cats = rows.filter((row) => row.kind === "cat");
  const hourly = (items) => {
    const counts = Array(24).fill(0);
    items.forEach((row) => { counts[moment(row.timestamp).tz(ZONE).hour()] += 1; });
    return counts;
  };
  const birdHours = hourly(birds), catHours = hourly(cats);
  const peak = (counts) => counts.some(Boolean) ? hourLabel(counts.indexOf(Math.max(...counts))) : "—";
  const counts = new Map();
  birds.forEach((row) => { const name = String(row.species || "Unknown bird"); counts.set(name, (counts.get(name) || 0) + 1); });
  const species = [...counts].map(([name, count]) => ({ name, count, percent: Math.round(count / birds.length * 1000) / 10 })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const weekdays = Array(7).fill(0);
  birds.forEach((row) => { weekdays[moment(row.timestamp).tz(ZONE).day()] += 1; });
  const durations = cats.map((row) => row.durationSeconds).filter((value) => typeof value === "number" && Number.isFinite(value) && value >= 0);
  return {
    distribution: require("./species-distribution").buildDistribution(species),
    range, hasData: rows.length > 0, hasBirds: birds.length > 0, hasCats: cats.length > 0,
    dateLabel: `${start.format("D MMM YYYY")} – ${end.format("D MMM YYYY")}`,
    summary: { birds: birds.length, cats: cats.length, species: species.filter((item) => item.name !== "Unknown bird").length, peak: peak(birdHours) },
    averageCats: (cats.length / (end.clone().startOf("day").diff(start, "days") + 1)).toFixed(1),
    averageDuration: durations.length ? `${(durations.reduce((sum, value) => sum + value, 0) / durations.length).toFixed(1)}s` : "Not recorded",
    durationCoverage: `${durations.length} of ${cats.length} detections have a duration`,
    catPeak: peak(catHours), species, topSpecies: species.slice(0, 5),
    weekly: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((name, index) => ({ name, count: weekdays[index], width: Math.max(...weekdays) ? weekdays[index] / Math.max(...weekdays) * 100 : 0 })),
    chartData: JSON.stringify({ labels: birdHours.map((_, index) => hourLabel(index)), birds: birdHours, cats: catHours, species }).replace(/</g, "\\u003c"),
  };
};
module.exports = { buildInsights };
