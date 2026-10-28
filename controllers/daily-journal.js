"use strict";

const moment = require("moment-timezone");
const account = require("./account.js");
const { getSightings } = require("../utils/firebase-sightings.js");

const getDateLabel = (day, month, year) => new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

const getDaySightings = (day, month, year, sightingData) => sightingData.filter((sighting) => {
  const date = moment(sighting.timestamp).tz("Europe/Dublin");
  return date.date() === day && date.month() + 1 === month && date.year() === year;
});

const getHourlyActivity = (daySightings, kind) => {
  const activity = new Array(24).fill(0);
  daySightings.filter((sighting) => sighting.kind === kind).forEach((sighting) => {
    const hour = moment(sighting.timestamp).tz("Europe/Dublin").hour();
    activity[hour] += 1;
  });
  return activity;
};

const getDays = (selectedDay, month, year, sightingData) => {
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const mondayOffset = (firstDay.getUTCDay() + 6) % 7;
  const days = Array.from({ length: mondayOffset }, () => ({ empty: true }));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let number = 1; number <= daysInMonth; number += 1) {
    const daySightings = getDaySightings(number, month, year, sightingData);
    days.push({ number, selected: number === selectedDay, active: daySightings.length > 0, birds: daySightings.some((sighting) => sighting.kind === "bird"), cats: daySightings.some((sighting) => sighting.kind === "cat") });
  }
  return days;
};

const buildContext = (selectedDay, month, year, sightingData) => {
  const currentYear = new Date().getFullYear();
  const daySightings = getDaySightings(selectedDay, month, year, sightingData);
  const birdSightings = daySightings.filter((sighting) => sighting.kind === "bird");
  const catSightings = daySightings.filter((sighting) => sighting.kind === "cat");
  const speciesCounts = {};
  birdSightings.forEach((sighting) => { speciesCounts[sighting.species] = (speciesCounts[sighting.species] || 0) + 1; });
  const species = Object.keys(speciesCounts).map((name) => ({ name, count: speciesCounts[name] }));
  const hours = new Array(24).fill(0);
  birdSightings.forEach(row => { hours[moment(row.timestamp).tz("Europe/Dublin").hour()] += 1; });
  const peakTime = birdSightings.length ? `${String(hours.indexOf(Math.max(...hours))).padStart(2,"0")}:00` : "—";
  return {
    distribution: require("../utils/species-distribution").buildDistribution(species),
    pageTitle: "Daily journal",
    month: new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-IE", { month: "long", year: "numeric", timeZone: "UTC" }),
    selectedDate: getDateLabel(selectedDay, month, year),
    selectedMonth: month,
    selectedYear: year,
    previousMonth: month === 1 ? 12 : month - 1,
    previousYear: month === 1 ? year - 1 : year,
    nextMonth: month === 12 ? 1 : month + 1,
    nextYear: month === 12 ? year + 1 : year,
    days: getDays(selectedDay, month, year, sightingData),
    years: [currentYear - 2, currentYear - 1, currentYear],
    summary: { birds: birdSightings.length, species: species.length, peak: peakTime, cats: catSightings.length },
    hourlyActivity: getHourlyActivity(daySightings, "bird"),
    catHourlyActivity: getHourlyActivity(daySightings, "cat"),
    species,
    birdSightings: birdSightings.map((sighting, index) => ({ ...sighting, id: index, time: new Date(sighting.timestamp).toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Dublin" }) })),
    catSightings: catSightings.map((sighting, index) => ({ ...sighting, id: index, time: new Date(sighting.timestamp).toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Dublin" }) })),
    highlights: birdSightings.length ? { species: species[0].name, note: `${birdSightings.length} bird visit${birdSightings.length === 1 ? " was" : "s were"} recorded on this day.` } : { species: "No species recorded", note: "There were no sightings recorded on this day." },
    sightings: daySightings.map((sighting) => ({ ...sighting, time: new Date(sighting.timestamp).toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Dublin" }), duration: "Live frame" })),
  };
};

const dailyJournal = {
  async index(request, response) {
    const user = await account.getLoggedInUserOrRedirect(request, response);
    if (!user) return;
    const requestedMonth = Number.parseInt(request.query.month, 10);
    const requestedYear = Number.parseInt(request.query.year, 10);
    const now = moment().tz("Europe/Dublin");
    const earliestYear = now.year() - 2;
    const month = requestedMonth >= 1 && requestedMonth <= 12 ? requestedMonth : now.month() + 1;
    const year = requestedYear >= earliestYear && requestedYear <= now.year() ? requestedYear : now.year();
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const requestedDay = Number.parseInt(request.query.day, 10);
    const defaultDay = month === now.month() + 1 && year === now.year() ? now.date() : 1;
    const selectedDay = requestedDay >= 1 && requestedDay <= daysInMonth ? requestedDay : defaultDay;
    const sightingData = await getSightings({ token: request.accessToken });
    response.render("daily-journal", { ...buildContext(selectedDay, month, year, sightingData), user });
  },
};

module.exports = dailyJournal;
