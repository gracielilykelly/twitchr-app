"use strict";
const { randomBytes, timingSafeEqual } = require("crypto");
const session = require("./session");
const valid = value => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
module.exports = (request, response, next) => {
  const cookieName = session.options().secure ? "__Host-twitchr-csrf" : "twitchr-csrf";
  let token = request.cookies[cookieName];
  if (!valid(token)) {
    token = randomBytes(32).toString("hex");
    response.cookie(cookieName, token, session.options());
  }
  response.locals.csrfToken = token;
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const supplied = request.get("x-csrf-token") || request.body?._csrf;
    if (!valid(supplied) || !timingSafeEqual(Buffer.from(token), Buffer.from(supplied))) {
      return response.status(403).send("Your form has expired. Refresh the page and try again.");
    }
  }
  next();
};
