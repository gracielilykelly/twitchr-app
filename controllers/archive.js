"use strict";
const account = require("./account");
const { getSightings } = require("../utils/local-data");
const { buildArchive } = require("../utils/archive");
module.exports = {
  async index(request, response) {
    const user = await account.getLoggedInUserOrRedirect(request, response);
    if (!user) return;
    try {
      const sightings = await getSightings();
      response.render("archive", { pageTitle:"Archive", user, ...buildArchive(sightings, request.query) });
    } catch (_) {
      response.status(503).render("archive", { pageTitle:"Archive", user, loadError: true, ...buildArchive([], request.query) });
    }
  },
};
