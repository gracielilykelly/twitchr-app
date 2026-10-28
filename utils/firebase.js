"use strict";
class FirebaseError extends Error {
  constructor(status, code = "REQUEST_FAILED") { super("The Firebase service could not complete the request."); this.status = status; this.code = code; }
}
const segment = value => encodeURIComponent(String(value));
const config = () => {
  const apiKey = process.env.FIREBASE_API_KEY;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_ID;
  if (!apiKey || !projectId) throw new FirebaseError(503, "NOT_CONFIGURED");
  if (!["firestore","realtime"].includes(process.env.FIREBASE_DATA_SOURCE || "firestore")) throw new FirebaseError(503,"INVALID_DATA_SOURCE");
  return { apiKey, projectId, database: process.env.FIREBASE_FIRESTORE_DATABASE || "(default)", bucket: process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`, databaseURL: process.env.FIREBASE_DATABASE_URL || process.env.FIREBASE_DATABASE, source: process.env.FIREBASE_DATA_SOURCE || "firestore" };
};
const request = async (url, { token, method = "GET", body, headers = {} } = {}) => {
  const response = await fetch(url, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...headers }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000) });
  let data;
  try { data = await response.json(); } catch (_) { data = null; }
  if (!response.ok) {
    const code = String(data?.error?.message || "REQUEST_FAILED").split(" : ")[0];
    throw new FirebaseError(response.status, /^[A-Z_]+$/.test(code) ? code : "REQUEST_FAILED");
  }
  return data;
};
const auth = (operation, body) => request(`https://identitytoolkit.googleapis.com/v1/accounts:${operation}?key=${segment(config().apiKey)}`, { method: "POST", body });
const signIn = async (email, password) => {
  const result = await auth("signInWithPassword", { email, password, returnSecureToken: true });
  return { access_token: result.idToken, refresh_token: result.refreshToken, expires_in: Number(result.expiresIn) };
};
const lookup = async token => {
  const result = await auth("lookup", { idToken: token });
  const user = result.users?.[0];
  if (!user || user.disabled) throw new FirebaseError(401, "INVALID_ID_TOKEN");
  return { id: user.localId, email: user.email };
};
// Secure Token's endpoint uses form encoding rather than JSON.
const refreshSession = async refreshToken => {
  const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${segment(config().apiKey)}`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }), signal: AbortSignal.timeout(15000) });
  const result = await response.json();
  if (!response.ok) throw new FirebaseError(response.status, "INVALID_REFRESH_TOKEN");
  return { access_token: result.id_token, refresh_token: result.refresh_token, expires_in: Number(result.expires_in) };
};
const decode = value => {
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decode);
  if ("mapValue" in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, item]) => [key, decode(item)]));
  return null;
};
const encode = value => {
  if (value == null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)])) } };
};
const document = result => result ? ({ ...Object.fromEntries(Object.entries(result.fields || {}).map(([key, value]) => [key, decode(value)])), id: result.name.split("/").pop() }) : null;
const base = () => { const c = config(); return `https://firestore.googleapis.com/v1/projects/${segment(c.projectId)}/databases/${segment(c.database)}/documents`; };
const collectionName = name => { if (!/^[a-zA-Z0-9_-]+$/.test(name || "")) throw new FirebaseError(503,"INVALID_COLLECTION"); return name; };
const getDocument = async (collection, id, token) => {
  try { return document(await request(`${base()}/${collectionName(collection)}/${segment(id)}`, { token })); }
  catch (error) { if (error.status === 404) return null; throw error; }
};
const list = async (collection, token) => {
  const rows = [];
  let pageToken;
  do {
    const params = new URLSearchParams({ pageSize: "300", ...(pageToken ? { pageToken } : {}) });
    const result = await request(`${base()}/${collectionName(collection)}?${params}`, { token });
    rows.push(...(result.documents || []).map(document));
    pageToken = result.nextPageToken;
  } while (pageToken);
  return rows;
};
const query = async (collection, field, value, token) => {
  const result = await request(`${base()}:runQuery`, { method: "POST", token, body: { structuredQuery: { from: [{ collectionId: collectionName(collection) }], where: { fieldFilter: { field: { fieldPath: field }, op: "EQUAL", value: encode(value) } } } } });
  return result.filter(row => row.document).map(row => document(row.document));
};
const write = async (collection, id, values, token) => {
  const params = new URLSearchParams();
  for (const field of Object.keys(values)) params.append("updateMask.fieldPaths",field);
  await request(`${base()}/${collectionName(collection)}/${segment(id)}?${params}`, { method: "PATCH", token, body: { fields: Object.fromEntries(Object.entries(values).map(([key,value])=>[key,encode(value)])) } });
};
const realtime = async (path, token) => {
  const { databaseURL } = config();
  if (!databaseURL) throw new FirebaseError(503,"DATABASE_NOT_CONFIGURED");
  const url = new URL(databaseURL);
  if (url.protocol !== "https:" || !/(\.firebaseio\.com|\.firebasedatabase\.app)$/.test(url.hostname)) throw new FirebaseError(503,"INVALID_DATABASE_URL");
  url.pathname = `/${path.split("/").map(segment).join("/")}.json`;
  url.search = new URLSearchParams({ auth: token }).toString();
  return request(url.toString());
};
const commit = (writes, token) => request(`${base()}:commit`, { method: "POST", token, body: { writes: writes.map(({ collection, id, values, exists = false, replace = false }) => ({
  update: { name: `${base().replace("https://firestore.googleapis.com/v1/", "")}/${collectionName(collection)}/${id}`, fields: Object.fromEntries(Object.entries(values).map(([key,value])=>[key,encode(value)])) },
  ...(!replace ? { updateMask: { fieldPaths: Object.keys(values) } } : {}),
  ...(exists ? { currentDocument: { exists: true } } : {}),
})) } });
module.exports = { config, request, auth, signIn, lookup, refreshSession, encode, decode, document, base, getDocument, list, query, write, commit, realtime, FirebaseError };
