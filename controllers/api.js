"use strict";
const moment = require("moment-timezone");
const users = require("../models/user-store");
const comms = require("../utils/comms");
const mqtt = require("../utils/mqtt");
const authorize = require("../utils/authAPI");
const denied = response => response.status(403).json({ error: { code: 403, message: "Unauthorized" } });
module.exports = {
  async sendUpdate(request, response) {
    const admin = await authorize(request, response);
    if (!admin) return denied(response);
    const { type, sound } = request.body || {};
    if (!["bird", "cat", "play_sound"].includes(type) || (type === "play_sound" && !["insect", "birds", "water", "bark"].includes(sound))) return response.status(400).json({ error: { message: "Invalid feeder update." } });
    await mqtt.publishMsg(JSON.stringify(request.body));
    if (["bird", "cat"].includes(type)) await comms.sendComms(request.body, await users.getNotificationRecipients(type, request.feederAccess));
    response.status(204).end();
  },
  async updateWeather(request, response) {
    const admin = await authorize(request, response, { machineOnly: request.method === "GET" });
    if (!admin) return denied(response);
    const { latitude, longitude } = admin.feeder;
    const key = process.env.OPENWEATHER_API_KEY || process.env.OPENWEATHERMAP_API_KEY;
    if (!key || latitude == null || longitude == null) return response.status(503).json({ error: { message: "Weather is not configured." } });
    const weatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?${new URLSearchParams({ lat: latitude, lon: longitude, units: "metric", appid: key })}`, { signal: AbortSignal.timeout(12000) });
    if (!weatherResponse.ok) throw new Error("Unable to fetch weather.");
    const weather = await weatherResponse.json();
    const now = moment().tz("Europe/Dublin");
    const sunset = moment.unix(weather.sys.sunset).tz("Europe/Dublin");
    const reading = { timestamp: now.toISOString(), temperature: weather.main.temp, windSpeed: weather.wind.speed, weather: weather.weather[0].main, sunset: sunset.toISOString() };
    await mqtt.publishMsg(JSON.stringify(reading));
    if (admin.notificationSettings.weather.receive) {
      const logs = { ...admin.notificationsLog, weather: { ...admin.notificationsLog.weather } };
      const alerts = [];
      const untilSunset = sunset.diff(now, "minutes");
      if (untilSunset >= 0 && untilSunset <= 120) alerts.push("sunset");
      if (reading.temperature <= 4) alerts.push("cold");
      if (reading.temperature >= 22) alerts.push("hot");
      for (const alert of alerts) {
        const last = logs.weather[alert];
        if (last && now.isSame(moment(last).tz("Europe/Dublin"), "day")) continue;
        if (now.hour() < 7 || now.hour() >= 22) continue;
        await comms.sendComms({ type: "weather", alert, temperature: reading.temperature }, [admin]);
        logs.weather[alert] = now.toISOString();
        await users.recordWeatherAlert(alert, request.feederAccess);
      }
    }
    response.json({ ok: true });
  },
};
