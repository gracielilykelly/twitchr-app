"use strict";
const firebase = require("./firebase");
const users = require("../models/user-store");
const production = () => process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
const names = () => production() ? { access: "__Host-twitchr-firebase-access", refresh: "__Host-twitchr-firebase-refresh" } : { access: "twitchr-firebase-access", refresh: "twitchr-firebase-refresh" };
const options = () => ({ httpOnly: true, secure: production(), sameSite: "lax", path: "/" });
const set = (response, session) => {
  response.cookie(names().access, session.access_token, { ...options(), maxAge: Math.max(0,session.expires_in || 3600)*1000 });
  response.cookie(names().refresh, session.refresh_token, { ...options(), maxAge: 7*86400000 });
};
const clear = response => {
  response.clearCookie(names().access,options());
  response.clearCookie(names().refresh,options());
  response.clearCookie("user",{path:"/"});
};
const get = (request,response) => {
  if (request.accountPromise) return request.accountPromise;
  request.accountPromise=(async()=>{
    response.set("Cache-Control","private, no-store");
    let access=request.cookies[names().access];
    const refresh=request.cookies[names().refresh];
    if (!access && !refresh) return null;
    let identity;
    if (access) {
      try { identity=await firebase.lookup(access); }
      catch(error) { if (![400,401,403].includes(error.status)) throw error; }
    }
    if (!identity && refresh) {
      try {
        const session=await firebase.refreshSession(refresh);
        identity=await firebase.lookup(session.access_token);
        access=session.access_token;
        set(response,session);
      } catch(error) { if (![400,401,403].includes(error.status)) throw error; }
    }
    if (!identity) { clear(response);return null; }
    const user=await users.getById(identity.id,access);
    if (!user || user.isFeeder) { clear(response);return null; }
    if (user.email !== identity.email) {
      if (!refresh) { clear(response);return null; }
      const renewed=await firebase.refreshSession(refresh);
      const freshIdentity=await firebase.lookup(renewed.access_token);
      if (freshIdentity.id !== user.id) { clear(response);return null; }
      access=renewed.access_token;
      identity=freshIdentity;
      set(response,renewed);
      await users.syncEmail(user,identity.email,access);
    }
    request.accessToken=access;
    return {...user,email:identity.email};
  })();
  return request.accountPromise;
};
module.exports={get,set,clear,names,options};
