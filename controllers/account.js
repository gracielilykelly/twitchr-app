"use strict";

const userstore = require("../models/user-store");
const uuid = require("uuid");
const logger = require("../utils/logger.js");

const LoginContextData = {
  pageTitle: "Login",
};

const editUserContextData = {
  pageTitle: "Settings",
};

const account = {
  login(request, response) {
    response.render("login", LoginContextData);
  },

  logout(request, response) {
    response.clearCookie("user");
    response.redirect("/login");
  },

  authenticate(request, response) {
    const user = userstore.getByEmail(request.body.email);
    if (user && user.password === request.body.password) {
      response.cookie("user", user.email);
      response.redirect("/");
    } else {
      const errorContextData = { ...LoginContextData };
      errorContextData.error = "Invalid Credentials. Please try again.";
      response.render("login", errorContextData);
    }
  },

  getLoggedInUserOrRedirect(request, response) {
    const user = userstore.getByEmail(request.cookies.user);
    if (!user) {
      response.redirect("/login");
    }
    return user;
  },

  edit(request, response) {
    const user = userstore.getByEmail(request.cookies.user);
    // only allow user to edit their own details
    if (!user || user.id !== request.params.id) {
      return response.render("404");
    } else {
      editUserContextData.user = user;
      editUserContextData.postUrl = "/users/" + user.id + "/save-details";
      response.render("editdetails", editUserContextData);
    }
  },

  saveDetails(request, response) {
    const user = userstore.getByEmail(request.cookies.user);
    // only allow user to save their own details
    if (!user || user.id !== request.params.id) {
      response.render("404");
    } else {
      const updatedUser = {
        firstName: request.body.firstName,
        lastName: request.body.lastName,
        email: request.body.email,
        // The settings page does not expose the existing password. Preserve it unless a future
        // password-change flow explicitly supplies a new value.
        password: request.body.password || user.password,
        phoneNumber: request.body.phone,
        notificationSettings: {
          bird: {
            receive: request.body.enableBirdNotifications,
            commTypes: [request.body.birdEmail, request.body.birdSMS],
          },
          cat: {
            receive: request.body.enableCatNotifications,
            commTypes: [request.body.catEmail, request.body.catSMS],
          },
        },
      };
      if (user.isAdmin) {
        updatedUser.notificationSettings.weather = {
          receive: request.body.enableWeatherNotifications,
          commTypes: [request.body.weatherEmail, request.body.weatherSMS],
        };
        updatedUser.feeder = {
          latitude: request.body.feederLatitude,
          longitude: request.body.feederLongitude,
        };
      }
      try {
        userstore.updateUser(user, updatedUser);
        response.cookie("user", user.email);
        response.redirect("/users/" + user.id);
      } catch (e) {
        const errorContextData = { ...editUserContextData };
        errorContextData.error = e;
        response.render("editdetails", errorContextData);
      }
    }
  },
};

module.exports = account;
