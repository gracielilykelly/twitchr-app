"use strict";
const moment = require("moment-timezone");
const ZONE = "Europe/Dublin";
const safeUrl = (value) => {
  if (typeof value !== "string") return "";
  if (/^\/captures\/[a-z0-9._-]+$/i.test(value)) return value;
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? value : ""; } catch (_) { return ""; }
};
const buildArchive = (rows, query = {}) => {
  const options = (values, selected) => values.map(([value, label]) => ({ value, label, selected: value === selected }));
  const kind = ["bird", "cat"].includes(query.kind) ? query.kind : "all";
  const media = ["image", "video", "none"].includes(query.media) ? query.media : "all";
  const sort = ["species", "confidence"].includes(query.sort) ? query.sort : "date";
  const order = query.order === "asc" ? "asc" : "desc";
  const date = typeof query.date === "string" && moment(query.date, "YYYY-MM-DD", true).isValid() ? query.date : "";
  const species = typeof query.species === "string" ? query.species : "";
  const all = rows.filter((row) => row.timestamp && Number.isFinite(new Date(row.timestamp).getTime())).map((row, index) => {
    const url = safeUrl(row.videoUrl || row.imageUrl || row.image);
    // Some legacy video_url values contain still images; inspect the extension first.
    const imageExtension = /\.(?:jpe?g|png|webp|gif|avif)(?:[?#]|$)/i.test(url);
    const videoExtension = /\.(?:mp4|webm|mov|m4v|ogg)(?:[?#]|$)/i.test(url);
    const isVideo = Boolean(url && !imageExtension && (videoExtension || row.mediaType === "video" || row.videoUrl));
    const mediaKind = !url ? "none" : isVideo ? "video" : "image";
    const confidenceValue = typeof row.confidence === "number" && row.confidence >= 0 && row.confidence <= 100 ? (row.confidence <= 1 ? row.confidence * 100 : row.confidence) : null;
    const timestamp = moment(row.timestamp).tz(ZONE);
    return { ...row, index, url, isVideo, mediaKind, confidenceValue, confidenceLabel: confidenceValue == null ? "Not recorded" : `${Math.round(confidenceValue)}%`, species: row.kind === "cat" ? "Cat detected" : row.species || "Unknown bird", dateKey: timestamp.format("YYYY-MM-DD"), dateLabel: timestamp.format("D MMM YYYY"), timeLabel: timestamp.format("HH:mm"), mediaLabel: mediaKind === "none" ? "No media" : isVideo ? "Video" : "Image" };
  });
  const speciesNames = [...new Set(all.filter((row) => row.kind === "bird").map((row) => row.species))].sort((a,b) => a.localeCompare(b));
  const filtered = all.filter((row) => (kind === "all" || row.kind === kind) && (media === "all" || row.mediaKind === media) && (!species || row.species === species) && (!date || row.dateKey === date));
  filtered.sort((a,b) => {
    if (sort === "confidence") {
      if (a.confidenceValue == null && b.confidenceValue != null) return 1;
      if (b.confidenceValue == null && a.confidenceValue != null) return -1;
    }
    const comparison = sort === "species" ? a.species.localeCompare(b.species) : sort === "confidence" ? (a.confidenceValue || 0) - (b.confidenceValue || 0) : new Date(a.timestamp) - new Date(b.timestamp);
    return (order === "asc" ? comparison : -comparison) || a.index - b.index;
  });
  const pageSize = [9,18,36].includes(Number(query.size)) ? Number(query.size) : 9;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(pageCount, Math.max(1, Number.parseInt(query.page,10) || 1));
  const link = (target) => {
    const params = new URLSearchParams({ kind, media, sort, order, size: String(pageSize), page: String(target) });
    if (species) params.set("species", species);
    if (date) params.set("date", date);
    return `/archive?${params}`;
  };
  const start = (page - 1) * pageSize;
  const pageNumbers = [...new Set([1, ...Array.from({length:5},(_,i)=>page-2+i).filter(value=>value>=1 && value<=pageCount), pageCount])].sort((a,b)=>a-b);
  return {
    date, total: filtered.length, from: filtered.length ? start + 1 : 0, to: Math.min(start + pageSize, filtered.length), page, pageCount,
    sightings: filtered.slice(start, start + pageSize),
    speciesOptions: options([["", "All species"], ...speciesNames.map(name=>[name,name])], species),
    kindOptions: options([["all","Birds and cats"],["bird","Birds"],["cat","Cats"]],kind),
    mediaOptions: options([["all","All media"],["image","Images"],["video","Videos"],["none","No media"]],media),
    sortOptions: options([["date","Date"],["species","Species"],["confidence","Confidence"]],sort),
    orderOptions: options([["desc","Descending"],["asc","Ascending"]],order),
    sizeOptions: options([["9","9 per page"],["18","18 per page"],["36","36 per page"]],String(pageSize)),
    previous: page > 1 ? link(page-1) : null, next: page < pageCount ? link(page+1) : null,
    pages: pageNumbers.map((number,index)=>({number,url:link(number),active:number===page,gap:index>0 && number-pageNumbers[index-1]>1})),
    resetUrl: "/archive",
  };
};
module.exports = { buildArchive, safeUrl };
