"use strict";
require("dotenv").config({ path: ".env.local" });
const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const { engine } = require("express-handlebars");
const logger = require("./utils/logger");
const app = express();
app.disable("x-powered-by");
app.use(express.urlencoded({ extended: false, limit: "32kb" }));
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.engine(".hbs", engine({ extname: ".hbs", defaultLayout: "main", layoutsDir: path.join(__dirname, "views/layouts"), partialsDir: path.join(__dirname, "views/partials"), helpers: require("./utils/helpers").helpers }));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", ".hbs");
app.use((request, response, next) => {
  response.set("Cache-Control", "private, no-store");
  response.set("X-Content-Type-Options", "nosniff");
  response.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.set("X-Frame-Options", "DENY");
  next();
});
app.use(require("./utils/csrf"));
app.use(require("./routes"));
app.use((request, response) => response.status(404).render("404"));
app.use((error, request, response, next) => {
  // Provider errors can contain credentials. Log only a safe category/status.
  logger.error(`Request failed (${Number(error.status) || 500})`);
  if (response.headersSent) return next(error);
  const status = error.status === 503 ? 503 : error.type === "entity.too.large" ? 413 : 500;
  if (request.path.startsWith("/api/")) return response.status(status).json({ error: { message: "The request could not be completed. Check the service configuration and try again." } });
  response.status(status).render("error", { pageTitle: "Service unavailable" });
});
if (require.main === module && !process.env.VERCEL) {
  const listener = app.listen(process.env.PORT || 4000, () => logger.info(`twitchr app started on port ${listener.address().port}`));
}
module.exports = app;
