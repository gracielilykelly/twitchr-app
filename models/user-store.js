"use strict";
const { createHash, timingSafeEqual } = require("crypto");
const firebase = require("../utils/firebase");
const collection = () => process.env.FIREBASE_USERS_COLLECTION || "users";
const subscriptions = () => process.env.FIREBASE_SUBSCRIPTIONS_COLLECTION || "notification_subscriptions";
const notifications = (value = {}) => Object.fromEntries(["bird", "cat", "weather"].map(kind => [kind, {
  receive: value[kind]?.receive === true || value[kind]?.receive === "true",
  commTypes: Array.isArray(value[kind]?.commTypes) ? value[kind].commTypes.filter(type => ["email", "sms"].includes(type)) : [],
}]));
const mapUser = row => row ? ({
  id: row.id, email: row.email, firstName: row.firstName || "", lastName: row.lastName || "",
  phoneNumber: row.phoneNumber || "", isAdmin: row.isAdmin === true,
  isFeeder: row.isFeeder === true, ownerId: row.ownerId,
  notificationSettings: notifications(row.notificationSettings), feeder: row.feeder || {},
  notificationsLog: row.notificationLogs || { weather: {} },
}) : null;
let machineSession;
const userStore = {
  async getById(id, token) {
    if (!token || typeof id !== "string" || !id || id.length > 128 || id.includes("/")) return null;
    return mapUser(await firebase.getDocument(collection(), id, token));
  },
  async getByApiKey(key) {
    const expected = process.env.TWITCHR_API_KEY || process.env.FEEDER_API_KEY;
    if (typeof key !== "string" || key.length < 16 || key.length > 512 || !expected) return null;
    const digest = value => createHash("sha256").update(value).digest();
    if (!timingSafeEqual(digest(key),digest(expected))) return null;
    if (!process.env.FIREBASE_FEEDER_EMAIL || !process.env.FIREBASE_FEEDER_PASSWORD) throw new firebase.FirebaseError(503,"FEEDER_NOT_CONFIGURED");
    if (!machineSession || machineSession.expiresAt <= Date.now()) {
      const signedIn = await firebase.signIn(process.env.FIREBASE_FEEDER_EMAIL,process.env.FIREBASE_FEEDER_PASSWORD);
      const identity = await firebase.lookup(signedIn.access_token);
      machineSession = { token: signedIn.access_token, id: identity.id, expiresAt: Date.now() + Math.max(0,signedIn.expires_in-60)*1000 };
    }
    const machine = await userStore.getById(machineSession.id,machineSession.token);
    if (!machine?.isFeeder || !machine.ownerId) return null;
    const owner = await userStore.getById(machine.ownerId,machineSession.token);
    if (!owner?.isAdmin || owner.isFeeder) return null;
    return { ...owner, authorization: { token: machineSession.token, ownerId: owner.id } };
  },
  async getNotificationRecipients(type, { token } = {}) {
    if (!["bird","cat"].includes(type) || !token) return [];
    const rows = await firebase.query(subscriptions(),`notificationSettings.${type}.receive`,true,token);
    return rows.map(mapUser);
  },
  async updateUser(current, updated, token) {
    if (!token) throw new Error("A verified session is required.");
    const values = { firstName: updated.firstName, lastName: updated.lastName, phoneNumber: updated.phoneNumber, notificationSettings: notifications(updated.notificationSettings) };
    if (current.isAdmin && updated.feeder) values.feeder = updated.feeder;
    await firebase.commit([
      { collection: collection(), id: current.id, values, exists: true },
      { collection: subscriptions(), id: current.id, values: { email: current.email, phoneNumber: values.phoneNumber, notificationSettings: values.notificationSettings }, replace: true },
    ],token);
  },
  async syncEmail(current, email, token) {
    await firebase.commit([
      { collection: collection(), id: current.id, values: { email }, exists: true },
      { collection: subscriptions(), id: current.id, values: { email, phoneNumber: current.phoneNumber, notificationSettings: current.notificationSettings }, replace: true },
    ],token);
  },
  async recordWeatherAlert(alert, { token, ownerId } = {}) {
    if (!["sunset","cold","hot"].includes(alert) || !token || !ownerId) throw new Error("Invalid weather alert.");
    const owner = await userStore.getById(ownerId,token);
    if (!owner) throw new Error("No feeder owner profile.");
    await firebase.write(collection(),ownerId,{ notificationLogs: { ...owner.notificationsLog, weather: { ...owner.notificationsLog.weather, [alert]: new Date().toISOString() } } },token);
  },
};
module.exports = { ...userStore, notifications };
