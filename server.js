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

  app.get("/data", (req, res) => {
    Promise.all([
      db.query("SELECT * FROM tasks"),
      db.query("SELECT * FROM dependencies"),
    ])
      .then((results) => {
        let tasks = results[0][0],
          dependencies = results[1][0];

        res.send({
          success: true,
          tasks: {
            rows: tasks,
          },
          dependencies: {
            rows: dependencies,
          },
        });
      })
      .catch((error) => {
        sendResponse(res, "error", null, error, [], [], [], []);
      });
  });

  app.post("/api", async function (req, res) {
    let requestId = "";
    let lastKey = "";
    let err = null;

    let taskUpdates = [];
    let tasksRemoved = [];
    let dependencyUpdates = [];
    let dependenciesRemoved = [];
    console.log(
      `\n${req.method} ${req.url} --> ${JSON.stringify(req.body, `\t`, 2)}`
    );

    for (const [key, value] of Object.entries(req.body)) {
      if (key === "requestId") {
        requestId = value;
      }
      if (key === "tasks") {
        for (const [key2, value2] of Object.entries(value)) {
          if (key2 === "added") {
            value2.forEach((addObj) => taskUpdates.push(addObj));
            const val = await addTask(value2[0], "tasks");
            lastKey = val.msg;
            err = val.error;
          }

          if (key2 === "updated") {
            value2.forEach((updateObj) => taskUpdates.push(updateObj));
            const val = await updateTask(value2, "tasks");
            lastKey = val.msg;
            err = val.error;
          }

          if (key2 === "removed") {
            tasksRemoved.push(value2[0]);
            const val = await deleteTask(value2[0].id, "tasks");
            lastKey = val.msg;
            err = val.error;
          }
        }
      }

      if (key === "dependencies") {
        for (const [key2, value2] of Object.entries(value)) {
          if (key2 === "added") {
            value2.forEach((addObj) => dependencyUpdates.push(addObj));
            const val = await addTask(value2[0], "dependencies");
            lastKey = val.msg;
            err = val.error;
          }

          if (key2 === "updated") {
            value2.forEach((updateObj) => dependencyUpdates.push(updateObj));
            const val = await updateTask(value2, "dependencies");
            lastKey = val.msg;
            err = val.error;
          }

          if (key2 === "removed") {
            dependenciesRemoved.push(value2[0]);
            const val = await deleteTask(value2[0].id, "dependencies");
            lastKey = val.msg;
            err = val.error;
          }
        }
      }
    }

    sendResponse(
      res,
      lastKey,
      requestId,
      err,
      taskUpdates,
      dependencyUpdates,
      tasksRemoved,
      dependenciesRemoved
    );
  });

  async function addTask(addObj, table) {
    let valArr = [];
    let keyArr = [];
    for (const [key, value] of Object.entries(addObj)) {
      if (
        key !== "baselines" &&
        key !== "from" &&
        key !== "to" &&
        key !== "$PhantomId"
      ) {
        keyArr.push(`\`${key}\``);
        valArr.push(value);
      }
    }

    const returnVal = await db
      .query(
        `INSERT INTO ${table} (${keyArr.join(", ")}) VALUES (${Array(
          keyArr.length
        )
          .fill("?")
          .join(",")})`,
        valArr
      )
      .then((result) => {
        return { msg: "added", error: null };
      })
      .catch((error) => {
        return { msg: "error", error: error };
      });

    return returnVal;
  }

  async function deleteTask(id, table) {
    const returnVal = await db
      .query(`DELETE FROM ${table} WHERE id = ?`, [id])
      .then((result) => {
        return { msg: "deleted", error: null };
      })
      .catch((error) => {
        return { msg: "error", error: error };
      });

    return returnVal;
  }

  async function updateTask(updateArr, table) {
    let valArrays = [];
    let keyArrays = [];

    updateArr.forEach((updateObj) => {
      let valArr = [];
      let keyArr = [];
      for (const [key, value] of Object.entries(updateObj)) {
        if (key !== "id") {
          keyArr.push(`${key} = ?`);
          valArr.push(value);
        }
      }
      valArr.push(updateObj.id);
      keyArrays.push(keyArr);
      valArrays.push(valArr);
    });

    const returnVal = await Promise.all(
      keyArrays.map((arr, i) => {
        db.query(
          `UPDATE ${table} SET ${arr.join(", ")} WHERE id = ?`,
          valArrays[i]
        );
      })
    )
      .then((result) => {
        console.log("updated");
        return { msg: "update", error: null };
      })
      .catch((error) => {
        return { msg: "error", error: error };
      });

    return returnVal;
  }

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
