"use strict";
const options = () => ({ httpOnly: true, secure: process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL), sameSite: "lax", path: "/" });
module.exports = { options };
