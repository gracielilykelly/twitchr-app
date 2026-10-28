"use strict";
const defaults = {
  id: "garden-observer", firstName: "Garden", lastName: "Observer", email: "garden@example.com", phoneNumber: "+353 00 000 0000", isAdmin: true,
  feeder: { latitude: 53.3498, longitude: -6.2603 },
  notificationSettings: { bird: { receive: true, commTypes: ["email"] }, cat: { receive: true, commTypes: ["email", "sms"] }, weather: { receive: true, commTypes: ["email"] } },
};
const fields = ["firstName", "lastName", "email", "phoneNumber"];
const get = request => {
  const user = structuredClone(defaults);
  try {
    const encoded = request.cookies["twitchr-preferences"];
    if (!encoded || encoded.length > 3500) return user;
    const saved = JSON.parse(Buffer.from(encoded, "base64url").toString());
    for (const field of fields) if (typeof saved[field] === "string") user[field] = saved[field].slice(0,200);
    if (saved.feeder && Number.isFinite(saved.feeder.latitude) && Math.abs(saved.feeder.latitude) <= 90 && Number.isFinite(saved.feeder.longitude) && Math.abs(saved.feeder.longitude) <= 180) user.feeder = saved.feeder;
    for (const kind of ["bird", "cat", "weather"]) {
      const preference = saved.notificationSettings?.[kind];
      if (preference && typeof preference.receive === "boolean" && Array.isArray(preference.commTypes)) user.notificationSettings[kind] = { receive: preference.receive, commTypes: preference.commTypes.filter(value => ["email", "sms"].includes(value)) };
    }
  } catch (_) {}
  return user;
};
const save = (response, user) => {
  const encoded = Buffer.from(JSON.stringify(user)).toString("base64url");
  if (encoded.length > 3500) throw new Error("Settings are too long.");
  response.cookie("twitchr-preferences", encoded, { httpOnly: true, secure: process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL), sameSite: "lax", path: "/", maxAge: 86400000 });
};
module.exports = { get, save };
