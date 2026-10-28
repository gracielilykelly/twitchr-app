"use strict";
require("dotenv").config({path:".env.local",quiet:true});
const fs=require("fs"),path=require("path");
const firebase=require("../utils/firebase");
let failed=false;
const check=(ok,label)=>{console.log(`${ok?"OK":"MISSING"}: ${label}`);if(!ok)failed=true;};
try {
  const config=firebase.config();
  check(true,"Firebase web API key and project ID (no administrative private key)");
  check(["firestore","realtime"].includes(config.source),"Firebase sightings data source");
  if(config.source==="realtime")check(Boolean(config.databaseURL),"Realtime Database URL");
  check(Boolean(config.bucket),"Firebase Storage bucket");
} catch(_){check(false,"Firebase web API key and project ID");}
check(fs.existsSync(path.join(__dirname,"../views/layouts/main.hbs")),"Handlebars templates");
check(Boolean(process.env.OPENWEATHER_API_KEY||process.env.OPENWEATHERMAP_API_KEY),"Weather API key");
check(Boolean(process.env.MQTT_HOST&&process.env.MQTT_USERNAME&&process.env.MQTT_PASSWORD),"MQTT credentials");
console.log("Configuration-only check: no connections, commands or notifications are sent.");
if(failed)process.exitCode=1;
