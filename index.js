const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 8080;
const { posts } = require("./data.js");
const { dday } = require("./dday.js");
const { userinfo } = require("./userInfo.js");
const { week, month } = require("./rank.js");

app.use(cors());

app.get("/api/dday", (req, res) => {
  res.json(dday);
});

app.get("/api/userinfo", (req, res) => {
  res.json(userinfo);
});

app.get("/api/rank/week", (req, res) => {
  const { page } = req.query;
  if (page == 0) res.json(week[0]);
  if (page == 1) res.json(week[1]);
  if (page == 2) res.json(week[2]);
  if (page == 3) res.json(week[3]);
});

app.get("/api/rank/month", (req, res) => {
  res.json(month);
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
