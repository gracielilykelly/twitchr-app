"use strict";
const users = require("../models/user-store");
const firebase = require("../utils/firebase");
const session = require("../utils/session");
const profileContext = user => ({ pageTitle: "Settings", user, postUrl: `/users/${user.id}/save-details` });
const text = value => typeof value === "string" ? value.trim().slice(0, 200) : "";
const preference = (body, kind) => ({ receive: body[`enable${kind[0].toUpperCase() + kind.slice(1)}Notifications`] === "true", commTypes: [body[`${kind}Email`], body[`${kind}SMS`]].filter(value => ["email", "sms"].includes(value)) });

module.exports = {
  login(request, response) { response.set("Cache-Control", "private, no-store").render("login", { pageTitle: "Login" }); },
  async authenticate(request, response) {
    response.set("Cache-Control", "private, no-store");
    const email = text(request.body.email).toLowerCase();
    const password = request.body.password;
    if (!email || typeof password !== "string" || !password || password.length > 1024) return response.status(400).render("login", { pageTitle: "Login", error: "Enter your email and password." });
    try {
      const result = await firebase.signIn(email,password);
      const identity = await firebase.lookup(result.access_token);
      const user = await users.getById(identity.id, result.access_token);
      if (!user || user.isFeeder) return response.status(403).render("login", { pageTitle: "Login", error: "Your account has not been granted access to Twitchr." });
      if (user.email !== identity.email) await users.syncEmail(user,identity.email,result.access_token);
      session.set(response, result);
      response.clearCookie("user", { path: "/" });
      response.redirect("/");
    } catch (error) {
      if ([400, 401, 403, 422].includes(error.status)) return response.status(401).render("login", { pageTitle: "Login", error: "Invalid credentials. Please try again." });
      if (error.status === 429) return response.status(429).render("login", { pageTitle: "Login", error: "Too many sign-in attempts. Please wait and try again." });
      throw error;
    }
  },
  async logout(request, response) {
    // These tokens belong only to this browser. Removing both ends its local session.
    session.clear(response);
    response.redirect("/login");
  },
  async getLoggedInUserOrRedirect(request, response) {
    const user = await session.get(request, response);
    if (!user) response.redirect("/login");
    return user;
  },
  async edit(request, response) {
    const user = await session.get(request, response);
    if (!user) return response.redirect("/login");
    if (user.id !== request.params.id) return response.status(404).render("404");
    response.render("editdetails", { ...profileContext(user), emailPending: request.query.email === "pending" });
  },
  async saveDetails(request, response) {
    const user = await session.get(request, response);
    if (!user) return response.redirect("/login");
    if (user.id !== request.params.id) return response.status(404).render("404");
    const updated = { firstName: text(request.body.firstName), lastName: text(request.body.lastName), phoneNumber: text(request.body.phone), notificationSettings: { ...user.notificationSettings, bird: preference(request.body, "bird"), cat: preference(request.body, "cat") } };
    if (!updated.firstName || !updated.lastName) return response.status(400).render("editdetails", { ...profileContext(user), error: "Enter your first and last name." });
    if (user.isAdmin) {
      updated.notificationSettings.weather = preference(request.body, "weather");
      const latitude = Number(request.body.feederLatitude), longitude = Number(request.body.feederLongitude);
      if (request.body.feederLatitude === "" || request.body.feederLongitude === "" || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return response.status(400).render("editdetails", { ...profileContext(user), error: "Enter a valid feeder latitude and longitude." });
      updated.feeder = { latitude, longitude };
    }
    const email = text(request.body.email).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return response.status(400).render("editdetails", { ...profileContext(user), error: "Enter a valid email address." });
    if (email !== user.email.toLowerCase()) await firebase.auth("sendOobCode", { requestType: "VERIFY_AND_CHANGE_EMAIL", idToken: request.accessToken, newEmail: email });
    await users.updateUser(user, updated, request.accessToken);
    response.redirect(`/users/${user.id}${email !== user.email.toLowerCase() ? "?email=pending" : ""}`);
  },
};
