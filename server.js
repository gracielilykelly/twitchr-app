"use strict";

const express = require("express");
const logger = require("./utils/logger");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");
var cors = require('cors')

const app = express();
app.use(cookieParser());
const exphbs = require("express-handlebars");

app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));
app.use(fileUpload());
app.engine(
  ".hbs",
  exphbs({
    extname: ".hbs",
    defaultLayout: "main",
    helpers: require("./utils/helpers.js").helpers
  })
);
app.set("view engine", ".hbs");

const routes = require("./routes");
app.use("/", routes);

app.all("*", (req, res) => {
  res.status(404).render("404");
});

const listener = app.listen(process.env.PORT || 4000, function() {
  logger.info(`twitchr app started on port ${listener.address().port}`);
});
