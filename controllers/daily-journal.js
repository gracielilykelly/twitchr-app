"use strict";

const account = require("./account.js");

const sightings = [];

const getDateLabel = (day, month, year) => new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

const getDaySightings = (day, month, year) => sightings.filter((sighting) => {
  const date = new Date(sighting.timestamp);
  return date.getUTCDate() === day && date.getUTCMonth() + 1 === month && date.getUTCFullYear() === year;
});

const getHourlyActivity = (daySightings) => {
  const activity = new Array(13).fill(0);
  daySightings.forEach((sighting) => {
    const hour = new Date(sighting.timestamp).getUTCHours();
    if (hour >= 6 && hour <= 18) activity[hour - 6] += 1;
  });
  return activity;
};

const getDays = (selectedDay, month, year) => {
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const mondayOffset = (firstDay.getUTCDay() + 6) % 7;
  const days = Array.from({ length: mondayOffset }, () => ({ empty: true }));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let number = 1; number <= daysInMonth; number += 1) {
    const daySightings = getDaySightings(number, month, year);
    days.push({ number, selected: number === selectedDay, active: daySightings.length > 0, birds: daySightings.length });
  }
  return days;
};

const buildContext = (selectedDay, month, year) => {
  const daySightings = getDaySightings(selectedDay, month, year);
  const speciesCounts = {};
  daySightings.forEach((sighting) => { speciesCounts[sighting.species] = (speciesCounts[sighting.species] || 0) + 1; });
  const species = Object.keys(speciesCounts).map((name) => ({ name, count: speciesCounts[name] }));
  const peak = daySightings.length ? daySightings[0].timestamp : null;
  const peakTime = peak ? new Date(peak).toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }) : "—";
  return {
    pageTitle: "Daily journal",
    month: new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-IE", { month: "long", year: "numeric", timeZone: "UTC" }),
    selectedDate: getDateLabel(selectedDay, month, year),
    selectedMonth: month,
    selectedYear: year,
    previousMonth: month === 1 ? 12 : month - 1,
    previousYear: month === 1 ? year - 1 : year,
    nextMonth: month === 12 ? 1 : month + 1,
    nextYear: month === 12 ? year + 1 : year,
    days: getDays(selectedDay, month, year),
    years: [2025, 2026, 2027],
    summary: { birds: daySightings.length, species: species.length, peak: peakTime, cats: 0 },
    hourlyActivity: getHourlyActivity(daySightings),
    species,
    highlights: daySightings.length ? { species: species[0].name, note: `${daySightings.length} bird visit${daySightings.length === 1 ? " was" : "s were"} recorded on this day.` } : { species: "No species recorded", note: "There were no sightings recorded on this day." },
    sightings: daySightings.map((sighting) => ({ ...sighting, time: new Date(sighting.timestamp).toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }), duration: "Live frame" })),
  };
};

const dailyJournal = {
  index(request, response) {
    const user = account.getLoggedInUserOrRedirect(request, response);
    if (!user) return;
    const requestedMonth = Number.parseInt(request.query.month, 10);
    const requestedYear = Number.parseInt(request.query.year, 10);
    const month = requestedMonth >= 1 && requestedMonth <= 12 ? requestedMonth : 8;
    const year = requestedYear >= 2025 && requestedYear <= 2027 ? requestedYear : 2026;
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const requestedDay = Number.parseInt(request.query.day, 10);
    const defaultDay = month === 8 && year === 2026 ? 20 : 1;
    const selectedDay = requestedDay >= 1 && requestedDay <= daysInMonth ? requestedDay : defaultDay;
    response.render("daily-journal", { ...buildContext(selectedDay, month, year), user });
  },
};

module.exports = dailyJournal;
