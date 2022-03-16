const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");

require("dotenv").config();

const dbPath = path.join(__dirname, "financepeer.db");
const app = express();

app.use(express.json());

app.use(cors({ origin: "*" }));

let database = null;

//Database Initialization
const initializeDBAndServer = async () => {
  try {
    database = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(process.env.PORT || 3003, () => {
      console.log(
        "Server Running at http://localhost:" + (process.env.PORT || 3003)
      );
    });
  } catch (e) {
    console.log(`Database Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

//MiddleWare for token authentication
const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["Authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, process.env.TOKEN, async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

//Register API
app.post("/register/", async (request, response) => {
  try {
    const { name, username, password, gender } = request.body;
    const hashedPassword = await bcrypt.hash(request.body.password, 10);
    const selectUserQuery = `SELECT * FROM users WHERE username = '${username}'`;
    const dbUser = await database.get(selectUserQuery);
    if (dbUser === undefined) {
      if (password.length < 6) {
        response.status(400).json({ error: "Password too short" });
      } else {
        const createUserQuery = `
      INSERT INTO
        users (username, password, name, gender)
      VALUES
        (
          '${username}',
          '${hashedPassword}',
          '${name}',
          '${gender}'
        )`;
        const dbResponse = await database.run(createUserQuery);
        const newUserId = dbResponse.lastID;
        response.status(200).json({ status: "user created successfully" });
      }
    } else {
      response.status(400).json({ error: "user already exists" });
    }
  } catch (e) {
    console.log(e);
  }
});

//Login API
app.post("/login/", async (request, response) => {
  try {
    const { username, password } = request.body;
    const selectUserQuery = `SELECT * FROM users WHERE username = '${username}'`;
    const dbUser = await database.get(selectUserQuery);
    if (dbUser === undefined) {
      response.status(400).json({ error: "INVALID USER" });
    } else {
      const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
      if (isPasswordMatched === true) {
        const payload = {
          username: username,
        };
        const jwtToken = jwt.sign(payload, process.env.TOKEN);

        response.status(200).json({ jwtToken: jwtToken });
      } else {
        response.status(400).json({ error: "invalid password" });
      }
    }
  } catch (e) {
    console.log(e);
  }
});

app.get("/", (request, response) => {
  response.send("Testing Get Route");
});

app.get("/posts/", authenticateToken, async (request, response) => {
  const getPostsQuery = `
    SELECT
      *
    FROM
      blog;`;
  const postsData = await db.all(getPostsQuery);
  if (postsData === undefined) {
    response.status(400).json({ status: "There are no post in Database" });
  }
  response.status(200).json({ data: postsData });
});

module.exports = app;
