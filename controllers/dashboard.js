"use strict";
const uuid = require("uuid");
const account = require("./account.js");
const logger = require("../utils/logger.js");

let contextData = {
  pageTitle: "Dashboard",
};

const dashboard = {
  index(request, response) {
    const user = account.getLoggedInUserOrRedirect(request, response);
    contextData.firebaseAPIKey = process.env.FIREBASE_API_KEY || "";
    contextData.firebaseId = process.env.FIREBASE_ID || "";
    contextData.firebaseDatabase = process.env.FIREBASE_DATABASE || "";
    contextData.firebaseAppId = process.env.FIREBASE_APP_ID || "";
    contextData.user = user;
    contextData.isAdmin = user.isAdmin;
    response.render("dash", contextData);
  },
};

module.exports = dashboard;
