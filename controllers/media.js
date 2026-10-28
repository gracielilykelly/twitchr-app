"use strict";
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");
const account = require("./account");
const firebase = require("../utils/firebase");
const { storagePath } = require("../utils/firebase-sightings");
module.exports = {
  async get(request,response) {
    const user = await account.getLoggedInUserOrRedirect(request,response);
    if (!user) return;
    const path = storagePath(request.query.path);
    if (!path) return response.status(400).send("Invalid capture path.");
    const range = request.get("range");
    if (range && !/^bytes=\d*-\d*$/.test(range)) return response.status(416).end();
    const url = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(firebase.config().bucket)}/o/${encodeURIComponent(path)}?alt=media`;
    const upstream = await fetch(url,{headers:{Authorization:`Firebase ${request.accessToken}`,...(range?{Range:range}:{})},signal:AbortSignal.timeout(45000)});
    if (upstream.status===416) { if(upstream.headers.has("content-range")) response.set("Content-Range",upstream.headers.get("content-range")); return response.status(416).end(); }
    if (![200,206].includes(upstream.status)) return response.status(upstream.status===404?404:502).send("Capture unavailable.");
    const type = upstream.headers.get("content-type") || "application/octet-stream";
    response.status(upstream.status).set("Content-Type",/^(image\/(?!svg)|video\/)/.test(type)?type:"application/octet-stream");
    response.set("Content-Security-Policy","sandbox");
    response.set("Cache-Control","private, no-store");
    for (const header of ["content-length","content-range","accept-ranges"]) if (upstream.headers.has(header)) response.set(header,upstream.headers.get(header));
    await pipeline(Readable.fromWeb(upstream.body),response);
  },
};
