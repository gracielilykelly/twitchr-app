"use strict";
const users = require("../models/user-store");
const session = require("./session");
module.exports = async (request, response, { machineOnly = false } = {}) => {
  const key = request.get("x-api-key");
  // An invalid supplied key must never fall back to a browser session.
  if (key) {
    const user = await users.getByApiKey(key);
    if (user) request.feederAccess = user.authorization;
    return user;
  }
  if (machineOnly) return null;
  const user = await session.get(request, response);
  if (!user?.isAdmin) return null;
  request.feederAccess = { token: request.accessToken, ownerId: user.id };
  return user;
};
