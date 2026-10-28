"use strict";
const moment = require("moment-timezone");
const firebase = require("./firebase");
const { safeUrl } = require("./archive");
const timestamp = value => {
  if (value == null || value === "") return null;
  if (typeof value === "number" || /^\d+(\.\d+)?$/.test(String(value))) value = Number(value) * (Number(value) < 1e11 ? 1000 : 1);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) return moment.tz(value,"YYYY-MM-DD HH:mm:ss","Europe/Dublin").toISOString();
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
};
const storagePath = value => {
  if (typeof value !== "string" || !value || value.length > 2048) return "";
  if (value.startsWith("gs://")) {
    const remainder = value.slice(5), split = remainder.indexOf("/");
    if (split < 0 || remainder.slice(0,split) !== firebase.config().bucket) return "";
    value = remainder.slice(split+1);
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return "";
  if (value.startsWith("/") || value.split("/").some(part => part === ".." || part === ".") || /[\u0000-\u001f]/.test(value)) return "";
  return value;
};
const media = row => {
  let url = safeUrl(row.video_url) || safeUrl(row.image_url) || safeUrl(row.image);
  const object = storagePath(row.storage_path || (!url ? row.image || row.video_url : ""));
  const isImage = /\.(jpe?g|png|webp|gif|avif)(?:[?#]|$)/i.test(url || object);
  const video = Boolean((url || object) && !isImage && (row.video_url || /\.(mp4|webm|mov|m4v)(?:[?#]|$)/i.test(object) || row.media_type === "video"));
  if (!url && object) url = `/media?path=${encodeURIComponent(object)}&kind=${video ? "video" : "image"}`;
  return { image: url || "", imageUrl: video ? "" : url || "", videoUrl: video ? url || "" : "", mediaType: video ? "video" : "image" };
};
const mapEvent = row => {
  const rows = [], shared = media(row);
  const created = timestamp(row.created_at ?? row.timestamp ?? row.start_time);
  const duration = Number(row.duration_seconds);
  const add = (kind, item, index) => {
    const time = timestamp(item.timestamp) || created;
    if (!time) return;
    const confidence = Number(item.classification_confidence ?? item.confidence ?? row.max_confidence);
    rows.push({ ...shared, id: `${row.id || created}-${kind}-${item.id ?? index}`, timestamp: time, kind, type: kind === "cat" ? "Cat detected" : "Bird spotted", species: kind === "cat" ? "Cat detected" : typeof item.species === "string" && item.species ? item.species : "Unknown bird", confidence: Number.isFinite(confidence) ? confidence : null, durationSeconds: row.duration_seconds != null && Number.isFinite(duration) && duration >= 0 ? duration : null, duration: row.duration_seconds != null && Number.isFinite(duration) && duration >= 0 ? `${duration} sec` : "Live frame" });
  };
  if (Array.isArray(row.bird_sightings) && row.bird_sightings.length) row.bird_sightings.forEach((item,index) => add("bird",item,index));
  else if (row.species && typeof row.species === "object" && Object.keys(row.species).length) {
    for (const [species,count] of Object.entries(row.species)) for (let i=0;i<Math.min(1000,Math.max(0,Math.floor(Number(count)||0)));i++) add("bird",{species},`${species}-${i}`);
  } else if (row.type === "bird" || row.type === "mixed" || row.bird_detected) add("bird",{species:row.species},0);
  if (Array.isArray(row.cat_events) && row.cat_events.length) row.cat_events.forEach((item,index)=>add("cat",item,index));
  else if (row.cat_detected || row.type === "cat" || row.type === "mixed") add("cat",{},0);
  return rows;
};
const entries = value => Object.entries(value || {}).map(([id,row])=>({...row,id}));
const getSightings = async ({token}={}) => {
  if (!token) throw new firebase.FirebaseError(401,"SIGN_IN_REQUIRED");
  let events;
  if (firebase.config().source === "realtime") {
    const [birds,cats] = await Promise.all([firebase.realtime("bird_sightings",token),firebase.realtime("cat_sightings",token)]);
    events = [...entries(birds).map(row=>({...row,type:"bird"})),...entries(cats).map(row=>({...row,type:"cat"}))];
  } else events = await firebase.list(process.env.FIREBASE_EVENTS_COLLECTION || "bird_events",token);
  return events.flatMap(mapEvent).sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
};
module.exports = { getSightings, mapEvent, timestamp, media, storagePath };
