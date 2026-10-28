"use strict";
const fs=require("fs"),path=require("path");
for(const file of ["views/layouts/main.hbs","public/captures/blue.jpg","public/captures/magpie.png","public/captures/cat.jpg"]){
  if(!fs.existsSync(path.join(__dirname,"..",file))){console.error(`Missing ${file}`);process.exitCode=1;}
}
if(!process.exitCode){
  const rows=require("../utils/local-data").getSightings();
  console.log(`${rows.length} local sightings available. No external service credentials are needed.`);
}
