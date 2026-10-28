"use strict";

const moment = require("moment-timezone");
const nodemailer = require("nodemailer");
const twilio = require("twilio");


const comms = {
  _craftMsg(updateData) {
    const birdMsgBase = "\n\n🐦 Bird Spotted!! 🐦\n\nSpotted a "
    const msgMap = {
      unknownBird: birdMsgBase + "bird, but not sure what kind \n",
      bird: birdMsgBase + "{1}\n\nRead more about it here: {2}",
      cat: "\n\n😼🚨 Cat Spotted!! 😼🚨",
      sunset: "\n\n🌛 Sunset soon, time to bring in the bird feeder",
      cold: "\n\n🥶 Temperature is {1}, you should put more food out",
      hot: "\n\n🌡️ Temperature is {1}, you should put more water out"
    }
  let msg = "";
    // craft message based on type
  if (updateData.type == "bird") {
    let birdSpecies = typeof updateData.species === "string" ? updateData.species : "Unknown";
    if(birdSpecies == "Unknown"){
      msg = msgMap.unknownBird
    } else {
      let birdUrl = "https://en.wikipedia.org/wiki/" + birdSpecies.replace(/ /g, '_');
      msg = msgMap.bird.replace("{1}", birdSpecies).replace("{2}", birdUrl);
    }
  } else if (updateData.type == "cat") {
    msg = msgMap.cat
  } else if (updateData.type == "weather") {
    msg = msgMap[updateData.alert]
    if(updateData.temperature){
      msg = msg.replace('{1}', updateData.temperature)
    }
  }
  return msg;
}, 
  
  async sendComms(updateData, users) {
    const currentHour = moment().tz("Europe/Dublin").hour();
    if (currentHour < 7 || currentHour >= 22) return;
    const message = this._craftMsg(updateData);
    const emailRecipients = [], smsRecipients = [];
    for (const user of users) {
      const settings = user.notificationSettings?.[updateData.type];
      if (settings?.receive !== true && settings?.receive !== "true") continue;
      if (settings.commTypes?.includes("email") && user.email) emailRecipients.push(user.email);
      if (settings.commTypes?.includes("sms") && user.phoneNumber) smsRecipients.push(user.phoneNumber);
    }
    if (smsRecipients.length && (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM_NUMBER)) throw new Error("SMS notifications are not configured.");
    if (emailRecipients.length && (!process.env.MAILGUN_DOMAIN || !process.env.MAILGUN_SMTP_PASS)) throw new Error("Email notifications are not configured.");
    const jobs = [];
    if (smsRecipients.length) {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN, { timeout: 10000, autoRetry: false });
      for (const to of smsRecipients) jobs.push(client.messages.create({ body: message, from: process.env.TWILIO_FROM_NUMBER, to }));
    }
    if (emailRecipients.length) {
      const transport = nodemailer.createTransport({ host: "smtp.mailgun.org", port: 587, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000, auth: { user: `postmaster@${process.env.MAILGUN_DOMAIN}`, pass: process.env.MAILGUN_SMTP_PASS } });
      jobs.push(transport.sendMail({ from: `Twitchr <twitchrapp@${process.env.MAILGUN_DOMAIN}>`, bcc: emailRecipients, subject: ["bird", "cat"].includes(updateData.type) ? `${updateData.type === "bird" ? "Bird" : "Cat"} spotted!` : "Weather update", text: message }));
    }
    // Wait for every provider call even when another provider fails.
    const results = await Promise.allSettled(jobs);
    if (results.some(result => result.status === "rejected")) throw new Error("One or more notifications could not be delivered.");
  },
};
module.exports = comms;
