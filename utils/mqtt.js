"use strict";
const mqtt = require("mqtt");
module.exports = {
  publishMsg(message) {
    if (!process.env.MQTT_HOST || !process.env.MQTT_USERNAME || !process.env.MQTT_PASSWORD) return Promise.reject(new Error("MQTT is not configured."));
    return new Promise((resolve, reject) => {
      const client = mqtt.connect({ host: process.env.MQTT_HOST, port: Number(process.env.MQTT_PORT || 8883), protocol: "mqtts", username: process.env.MQTT_USERNAME, password: process.env.MQTT_PASSWORD, reconnectPeriod: 0, connectTimeout: 10000 });
      let finished = false;
      const finish = (error) => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        if (error) { client.end(true); reject(error); }
        else client.end(false, {}, resolve);
      };
      const timeout = setTimeout(() => finish(new Error("MQTT publish timed out.")), 12000);
      client.once("error", finish);
      client.once("connect", () => client.publish(process.env.MQTT_TOPIC || "twitchr", message, { qos: 2, retain: false }, finish));
    });
  },
};
