const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 8080;
const { posts } = require("./data.js");
const { dday } = require("./dday.js");
const { userinfo } = require("./userInfo.js");

app.use(cors());

app.get("/api/dday", (req, res) => {
  res.json(dday);
});

app.get("/api/userinfo", (req, res) => {
  res.json(userinfo);
});

app.listen(PORT, () => {
  console.log(`server is running on ${PORT}`);
});

// ----- 예시 -----
app.get("/", (req, res) => {
  res.send("Here is homepage~!!");
});

app.get("/api/posts", (req, res) => {
  res.json(posts);
});

// ----- 예시 -----
