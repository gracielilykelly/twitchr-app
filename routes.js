"use strict";

const express = require("express");
const router = express.Router();
const dashboard = require("./controllers/dashboard.js");
const account = require("./controllers/account.js");
const api = require("./controllers/api.js");
const fieldStudy = require("./controllers/field-study.js");
const dailyJournal = require("./controllers/daily-journal.js");

// App
router.get("/", dashboard.index);
router.get("/login", account.login);
router.post("/authenticate", account.authenticate);
router.get("/logout", account.logout);
router.get("/users/:id", account.edit);
router.post("/users/:id/save-details", account.saveDetails);
router.get("/field-study", fieldStudy.index);
router.get("/field-study/:species", fieldStudy.wiki);
router.get("/daily-journal", dailyJournal.index);

// API
router.get("/api/update-weather", api.updateWeather);
router.post("/api/send-update", api.sendUpdate);

module.exports = router;
