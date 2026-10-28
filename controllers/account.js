"use strict";
const users = require("../models/user-store");
const text = value => typeof value === "string" ? value.trim().slice(0,200) : "";
const context = user => ({ pageTitle: "Settings", user, postUrl: `/users/${user.id}/save-details` });
const preference = (body, kind) => ({ receive: body[`enable${kind[0].toUpperCase()+kind.slice(1)}Notifications`] === "true", commTypes: [body[`${kind}Email`], body[`${kind}SMS`]].filter(value=>["email","sms"].includes(value)) });
module.exports = {
  login(request,response) { response.redirect("/"); },
  authenticate(request,response) { response.redirect("/"); },
  logout(request,response) { response.redirect("/"); },
  getLoggedInUserOrRedirect(request) { return users.get(request); },
  edit(request,response) {
    const user=users.get(request);
    if (user.id!==request.params.id) return response.status(404).render("404");
    response.render("editdetails",context(user));
  },
  saveDetails(request,response) {
    const user=users.get(request);
    if (user.id!==request.params.id) return response.status(404).render("404");
    const updated={...user,firstName:text(request.body.firstName),lastName:text(request.body.lastName),email:text(request.body.email),phoneNumber:text(request.body.phone),notificationSettings:Object.fromEntries(["bird","cat","weather"].map(kind=>[kind,preference(request.body,kind)]))};
    if (!updated.firstName || !updated.lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updated.email)) return response.status(400).render("editdetails",{...context(user),error:"Enter your name and a valid email address."});
    const latitude=Number(request.body.feederLatitude),longitude=Number(request.body.feederLongitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude)>90 || Math.abs(longitude)>180) return response.status(400).render("editdetails",{...context(user),error:"Enter a valid feeder location."});
    updated.feeder={latitude,longitude};
    users.save(response,updated);
    response.redirect(`/users/${user.id}`);
  },
};
