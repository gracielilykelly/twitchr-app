"use strict";

const express = require("express");
const router = express.Router();
const handle = fn => (request, response, next) => Promise.resolve().then(() => fn(request, response, next)).catch(next);
const dashboard = require("./controllers/dashboard.js");
const account = require("./controllers/account.js");
const api = require("./controllers/api.js");
const fieldStudy = require("./controllers/field-study.js");
const dailyJournal = require("./controllers/daily-journal.js");

// App
router.get("/", handle(dashboard.index));
router.get("/login", handle(account.login));
router.post("/authenticate", handle(account.authenticate));
router.get("/logout", handle(account.logout));
router.post("/logout", handle(account.logout));
router.get("/users/:id", handle(account.edit));
router.post("/users/:id/save-details", handle(account.saveDetails));
router.get("/field-study", handle(fieldStudy.index));
router.get("/field-study/:species", handle(fieldStudy.wiki));
router.get("/daily-journal", handle(dailyJournal.index));
router.get("/feeder-insights", handle(require("./controllers/feeder-insights").index));
router.get("/archive", handle(require("./controllers/archive").index));

// API
router.get("/api/update-weather", handle(api.updateWeather));
router.post("/api/update-weather", handle(api.updateWeather));
router.post("/api/send-update", handle(api.sendUpdate));

module.exports = router;
