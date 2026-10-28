const register = function (Handlebars) {
  const helpers = {
    toJson: (obj) => JSON.stringify(obj ?? null).replace(/[<>&\u2028\u2029]/g, (character) => "\\u" + character.charCodeAt(0).toString(16).padStart(4, "0")),
    includes: (arr, value) => Array.isArray(arr) && arr.includes(value),
    eq: (a, b) => a == b,
  };
  if (Handlebars && typeof Handlebars.registerHelper === "function") {
    for (const prop in helpers) Handlebars.registerHelper(prop, helpers[prop]);
  } else return helpers;
};
module.exports.register = register;
module.exports.helpers = register(null);
