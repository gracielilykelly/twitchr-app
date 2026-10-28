"use strict";
const account = require("./account");
const { getSightings } = require("../utils/local-data");
const { buildInsights } = require("../utils/feeder-insights");
module.exports = {
  async index(request, response) {
    const user = await account.getLoggedInUserOrRedirect(request, response);
    if (!user) return;
    const range = ["7", "30", "all"].includes(request.query.range) ? request.query.range : "7";
    const rows = await getSightings();
    response.render("feeder-insights", { pageTitle: "Feeder insights", user, ...buildInsights(rows, range) });
  },
};
