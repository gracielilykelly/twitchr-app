"use strict";

const account = require("./account.js");

const species = [
  {
    slug: "cyanistes-caeruleus",
    commonName: "Blue tit",
    initial: "B",
    scientificName: "Cyanistes caeruleus",
    description: "A small, active garden bird recognised by its blue crown and yellow breast.",
    habitat: "Gardens, woodland edges and hedgerows",
    diet: "Seeds, insects and small invertebrates",
    behaviour: "Often visits feeders in quick, repeated movements.",
    sightings: 2,
    lastSeen: "20 Aug 2026",
    image: "",
  },
  {
    slug: "erithacus-rubecula",
    commonName: "European robin",
    initial: "E",
    scientificName: "Erithacus rubecula",
    description: "A familiar garden bird with a bright orange-red face and breast.",
    habitat: "Gardens, parks and woodland undergrowth",
    diet: "Insects, worms, berries and seeds",
    behaviour: "Usually seen alone, often close to the ground or a quiet perch.",
    sightings: 1,
    lastSeen: "20 Aug 2026",
    image: "",
  },
  {
    slug: "passer-domesticus",
    commonName: "House sparrow",
    initial: "H",
    scientificName: "Passer domesticus",
    description: "A familiar small passerine that is comfortable around human habitation.",
    habitat: "Gardens, buildings and urban green spaces",
    diet: "Seeds, grains and small invertebrates",
    behaviour: "A social visitor that commonly feeds in small groups.",
    sightings: 1,
    lastSeen: "20 Aug 2026",
    image: "",
  },
  {
    slug: "turdus-merula",
    commonName: "Common blackbird",
    initial: "C",
    scientificName: "Turdus merula",
    description: "A dark thrush with a clear, varied song and a preference for cover near gardens.",
    habitat: "Gardens, parks and woodland",
    diet: "Worms, insects, fruit and berries",
    behaviour: "Often forages on the ground beneath shrubs and trees.",
    sightings: 1,
    lastSeen: "18 Aug 2026",
    image: "",
  },
];

const contextData = {
  pageTitle: "Field study",
  species,
  overview: {
    speciesCount: species.length,
    totalVisits: species.reduce((total, item) => total + item.sightings, 0),
    mostFrequent: species.reduce((current, item) => item.sightings > current.sightings ? item : current, species[0]),
    latestDiscovery: species[0],
  },
};

const fieldStudy = {
  index(request, response) {
    const user = account.getLoggedInUserOrRedirect(request, response);
    if (!user) return;
    response.render("field-study", { ...contextData, user });
  },

  wiki(request, response) {
    const user = account.getLoggedInUserOrRedirect(request, response);
    if (!user) return;
    const selectedSpecies = species.find((item) => item.slug === request.params.species);
    if (!selectedSpecies) return response.render("404");
    response.render("species-wiki", { pageTitle: selectedSpecies.commonName, user, species: selectedSpecies });
  },
};

module.exports = fieldStudy;
