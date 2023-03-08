const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 8080;
const { userinfo } = require("./userInfo.js");
const { week, month } = require("./rank.js");
const { posts } = require("./data.js");
const { dday } = require("./dday.js");
const { todos } = require("./todos.js");
const fs = require("fs");

app.use(cors());
app.use(express.json());

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
  const { page } = req.query;
  if (page == 0) res.json(month[0]);
  if (page == 1) res.json(month[1]);
  if (page == 2) res.json(month[2]);
  if (page == 3) res.json(month[3]);
});

app.post("/api/todo-add", (req, res) => {
  const newData = req.body; // get the new data from the request body
  // write the updated data back to the todos module

  fs.writeFileSync(
    "./todos.js",
    `module.exports = {todos:[${JSON.stringify(newData)}]}`,
    (err) => {
      if (err) {
        console.error(err);
        res.status(500).send("Error updating data.");
      } else {
        delete require.cache[require.resolve("./todos.js")];
        res.status(200).send("your Requeest success^^");
      }
    }
  );
});

app.get("/api/planner-main", (req, res) => {
  delete require.cache[require.resolve("./todos.js")];
  let todos2 = require("./todos.js");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Surrogate-Control", "no-store");
  res.json(todos2.todos);
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
