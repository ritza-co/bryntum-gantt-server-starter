var express = require("express");
var bodyParser = require("body-parser");
var cors = require("cors");
require("dotenv").config();

var port = 1337;
var app = express();

var corsOptions = {
  origin: process.env.frontendURL,
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  credentials: true,
};

app.use(cors(corsOptions));

app.use(bodyParser.json());

app.listen(port, function () {
  console.log(`server is running on port "${port}"...`);
});

const Promise = require("bluebird");
require("date-format-lite");

// get the client
const mysql = require("mysql2/promise");

async function serverСonfig() {
  const db = mysql.createPool({
    host: process.env.host,
    user: process.env.user,
    password: process.env.password,
    database: process.env.database,
  });

  function sendResponse(
    res,
    action,
    requestId,
    error,
    taskUpdates,
    dependencyUpdates,
    tasksRemoved,
    dependenciesRemoved
  ) {
    if (action == "error") console.log(error);

    let result = {
      success: action === "error" ? false : true,
    };
    if (requestId !== undefined && requestId !== null)

      result.requestId = requestId;

    // updated tasks
    result.tasks = {};
    result.tasks.rows = [];

    if (taskUpdates.length) {
      result.tasks.rows = [...result.tasks.rows, ...taskUpdates];
    }

    // deleted tasks
    result.tasks.removed = [];

    if (tasksRemoved.length) {
      result.tasks.removed = [...result.tasks.removed, ...tasksRemoved];
    }

    // updated dependencies
    result.dependencies = {};
    result.dependencies.rows = [];

    if (dependencyUpdates.length) {
      result.dependencies.rows = [
        ...result.dependencies.rows,
        ...dependencyUpdates,
      ];
    }

    // deleted dependencies
    result.dependencies.removed = [];

    if (dependenciesRemoved.length) {
      result.dependencies.removed = [
        ...result.dependencies.removed,
        ...dependenciesRemoved,
      ];
    }

    res.send(result);
    return;
  }
}

serverСonfig();