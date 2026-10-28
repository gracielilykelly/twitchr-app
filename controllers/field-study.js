"use strict";

const { safeUrl } = require("../utils/archive");
const account = require("./account.js");
const { getSightings } = require("../utils/firebase-sightings");
const { buildObservations } = require("../utils/species-observations");

const firebase = require("../utils/firebase");

const parseBird = (bird, index) => {
  let details = bird.data || {};
  if (typeof details === "string") {
    try { details = JSON.parse(details); } catch (error) { details = {}; }
  }
  const slug = `${bird.id || index}-${String(bird.name || "bird").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const description = details.description || "No field description has been added yet.";
  return {
    slug,
    commonName: bird.name || bird.commonName || "Unnamed bird",
    initial: description.trim().charAt(0).toUpperCase() || "N",
    scientificName: details.scientificName || bird.scientificName || "",
    description,
    descriptionBody: description.trim().slice(1).trimStart(),
    habitat: details.habitat?.summary || "No habitat notes have been added yet.",
    habitatEnvironments: details.habitat?.environments || [],
    nestingSites: details.habitat?.nestingSites || [],
    dietType: details.diet?.type || "",
    diet: details.diet?.feedingBehaviour || details.diet?.type || "No diet notes have been added yet.",
    foods: details.diet?.foods || [],
    flight: details.behaviour?.flight || "",
    social: details.behaviour?.social || "",
    migration: details.behaviour?.migration || "",
    nesting: details.behaviour?.nesting || "",
    behaviour: details.behaviour?.social || details.behaviour?.flight || "No behaviour notes have been added yet.",
    image: safeUrl(bird.image_url) || safeUrl(bird.image) || require("../utils/firebase-sightings").media({image:bird.image}).image,
    audio: safeUrl(bird.audio_url),
    sightings: Number(bird.sightings || 0),
    lastSeen: bird.created_at ? new Date(bird.created_at).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" }) : "Not recorded",
  };
};

const getSpecies = async (token, sightings) => {
  const catalogue = (await firebase.list(process.env.FIREBASE_SPECIES_COLLECTION || "birds",token)).map(parseBird);
  const names = new Set(catalogue.flatMap(item=>[item.commonName,item.scientificName]).filter(Boolean).map(name=>name.toLowerCase()));
  for (const row of sightings.filter(row=>row.kind==="bird")) {
    if (!names.has(row.species.toLowerCase())) {
      catalogue.push(parseBird({id:require("crypto").createHash("sha256").update(row.species).digest("hex").slice(0,8),name:row.species,image_url:row.image},catalogue.length));
      names.add(row.species.toLowerCase());
    }
  }
  return catalogue.map(item=>{
    const matches=sightings.filter(row=>row.kind==="bird" && [item.commonName,item.scientificName].some(name=>name && name.toLowerCase()===row.species.toLowerCase()));
    return {...item,sightings:matches.length,lastSeen:matches[0]?new Date(matches[0].timestamp).toLocaleDateString("en-IE",{day:"numeric",month:"short",year:"numeric",timeZone:"Europe/Dublin"}):"Not yet seen"};
  });
};

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
    const sightings = await getSightings({ token: request.accessToken });
    const species = await getSpecies(request.accessToken,sightings);
    response.render("field-study", { pageTitle: "Field study", user, species, overview: getOverview(species) });
  },

  async wiki(request, response) {
    const user = await account.getLoggedInUserOrRedirect(request, response);
    if (!user) return;
    const sightings = await getSightings({ token: request.accessToken });
    const species = await getSpecies(request.accessToken,sightings);
    const selectedSpecies = species.find((item) => item.slug === request.params.species);
    if (!selectedSpecies) return response.render("404");
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
