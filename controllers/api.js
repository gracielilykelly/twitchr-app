"use strict";
module.exports = {
  sendUpdate(request,response) {
    const { type, sound }=request.body || {};
    if (type!=="play_sound" || !["insect","birds","water","bark"].includes(sound)) return response.status(400).json({error:{message:"Invalid feeder update."}});
    response.status(204).end();
  },
  updateWeather(request,response) { response.json({ok:true}); },
};
