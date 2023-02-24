const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 8080;
const { posts } = require("./data.js");
app.use(cors());

app.get("/", (req, res) => {
  res.send("Here is homepage~!!");
});

app.get("/api/posts", (req, res) => {
  res.json(posts);
});

app.listen(PORT, () => {
  console.log(`server running on ${PORT}`);
});
