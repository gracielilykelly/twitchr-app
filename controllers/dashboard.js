"use strict";
const account = require("./account.js");
const { getSightings } = require("../utils/local-data");

const dashboard = {
  async index(request, response) {
    const user = await account.getLoggedInUserOrRedirect(request, response);
    if (!user) return;
    const sightings = await getSightings();
    const contextData = {
      pageTitle: "Today's feed", user, isAdmin: user.isAdmin,
      weather: { temperature: "13°C", condition: "Partly cloudy", icon: "fa-cloud-sun" },
      ...require("../utils/dashboard").buildDashboard(sightings),
    };
    response.render("dash", contextData);
  },
};

module.exports = dashboard;
