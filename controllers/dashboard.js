"use strict";
const account = require("./account.js");
const { getSightings } = require("../utils/firebase-sightings.js");

const getWeatherIcon = (weather) => {
  const condition = String(weather?.main || "").toLowerCase();
  if (condition === "clear") return "fa-sun";
  if (condition === "clouds") return weather.id === 801 || weather.id === 802 ? "fa-cloud-sun" : "fa-cloud";
  if (condition === "rain" || condition === "drizzle") return "fa-droplet";
  if (condition === "thunderstorm") return "fa-cloud-bolt";
  if (condition === "snow") return "fa-snowflake";
  if (["mist", "fog", "haze", "smoke", "dust", "sand", "ash"].includes(condition)) return "fa-smog";
  if (["squall", "tornado"].includes(condition)) return "fa-wind";
  return "fa-cloud";
};

const getWeather = async (user) => {
  const key = process.env.OPENWEATHER_API_KEY || process.env.OPENWEATHERMAP_API_KEY;
  const latitude = user.feeder?.latitude;
  const longitude = user.feeder?.longitude;
  if (!key || latitude == null || longitude == null) return {};
  try {
    const weatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&units=metric&appid=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(10000) });
    if (!weatherResponse.ok) return {};
    const weather = await weatherResponse.json();
    const currentWeather = weather.weather?.[0];
    return { temperature: `${Math.round(weather.main.temp)}°C`, humidity: `${weather.main.humidity}%`, pressure: `${weather.main.pressure} hPa`, condition: currentWeather?.main === "Clear" ? "Clear sky" : currentWeather?.main || "Unavailable", icon: getWeatherIcon(currentWeather) };
  } catch (error) {
    return {};
  }
};



const dashboard = {
  async index(request, response) {
    const user = await account.getLoggedInUserOrRedirect(request, response);
    if (!user) return;
    const sightings = await getSightings({ token: request.accessToken });
    const contextData = {
      pageTitle: "Today's feed", user, isAdmin: user.isAdmin,
      weather: await getWeather(user),
      ...require("../utils/dashboard").buildDashboard(sightings),
    };
    response.render("dash", contextData);
  },
};

module.exports = dashboard;
