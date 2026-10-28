"use strict";

const { safeUrl } = require("../utils/archive");
const account = require("./account.js");
const { getSightings } = require("../utils/local-data");
const { buildObservations } = require("../utils/species-observations");

const { getSpecies } = require("../utils/local-data");

const getOverview = (species) => ({
  speciesCount: species.length,
  totalVisits: species.reduce((total, item) => total + item.sightings, 0),
  mostFrequent: species.reduce((current, item) => item.sightings > current.sightings ? item : current, species[0]),
  latestDiscovery: species[0],
});

const fieldStudy = {
  async index(request, response) {
    const user = await account.getLoggedInUserOrRedirect(request, response);
    if (!user) return;
    const species = await getSpecies();
    response.render("field-study", { pageTitle: "Field study", user, species, overview: getOverview(species) });
  },

  async wiki(request, response) {
    const user = await account.getLoggedInUserOrRedirect(request, response);
    if (!user) return;
    const species = await getSpecies();
    const selectedSpecies = species.find((item) => item.slug === request.params.species);
    if (!selectedSpecies) return response.render("404");
    const sightings = await getSightings();
    const observations = buildObservations(selectedSpecies, sightings);
    const behaviourNotes = [
      { label: "Flight", note: selectedSpecies.flight },
      { label: "Social", note: selectedSpecies.social || selectedSpecies.behaviour },
      { label: "Migration", note: selectedSpecies.migration },
      { label: "Nesting", note: selectedSpecies.nesting },
    ].map(item => ({ ...item, note: item.note || "No notes recorded yet." }));
    response.render("species-wiki", { pageTitle: selectedSpecies.commonName, user, species: selectedSpecies, observations, behaviourNotes });
  },
};

module.exports = fieldStudy;
