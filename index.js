//프레임워크, 라이브러리
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

// 데이터파일
const { userinfo } = require("./userInfo.js");
const { week, month } = require("./rank.js");
const todosData = require("./todos.js");
const { chartData } = require("./lineChartData.js");

const app = express();
const PORT = 8080;
app.use(cors());
app.use(express.json());

// mariaDB 로직
const mariadb = require("mariadb");
require("dotenv").config();
const secretkey = process.env.SECRET_KEY;
const host = process.env.DB_HOST;
const user = process.env.DB_USER;
const password = process.env.DB_PASSWORD;
const database = process.env.DB_DATABASE;

const pool = mariadb.createPool({
  host,
  user,
  password,
  database,
});

async function executeQuery(query, params) {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(query, params);
    return result;
  } catch (err) {
    throw err;
  } finally {
    if (conn) conn.release();
  }
}

// 로그인api
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const rows = await executeQuery(
      "SELECT id, email, password FROM userinfo WHERE email = ?",
      [email]
    );
    const user = rows[0];

    if (user && user.password === password) {
      const token = jwt.sign({ id: user.id, email: user.email }, secretkey, {
        expiresIn: "1h",
      });
      res.json({ token });
    } else {
      res.status(401).json({ error: "Invalid email or password" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 사용자 이름 중복체크 API 구현
app.post("/api/username-check", async (req, res) => {
  const username = req.body.username;
  try {
    const result = await executeQuery(
      "SELECT * FROM userinfo WHERE username = ?",
      [username]
    );
    if (result.length > 0) {
      res.json({ exists: true });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    console.error("Username check failed:", error);
    res.status(500).send("Username check failed");
  }
});

// 이메일 중복체크 API 구현
app.post("/api/email-check", async (req, res) => {
  const email = req.body.email;
  try {
    const result = await executeQuery(
      "SELECT * FROM userinfo WHERE email = ?",
      [email]
    );
    if (result.length > 0) {
      res.json({ exists: true });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    console.error("Email check failed:", error);
    res.status(500).send("Email check failed");
  }
});

app.post("/api/sign-up", async (req, res) => {
  // 클라이언트에서 전달받은 회원가입 정보 추출
  const { username, email, password } = req.body;
  try {
    const result = await executeQuery(
      "INSERT INTO userinfo (username, email, password) VALUES (?, ?, ?)",
      [username, email, password]
    );
    res
      .status(201)
      .json({ success: true, message: "회원가입이 완료되었습니다." });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "회원가입 도중 오류가 발생했습니다." });
  }
});

app.post("/api/todo-create", async (req, res) => {
  const newTodo = req.body;
  const oneTodo = newTodo[0];

  try {
    const query = `INSERT INTO todos (id, addMode, updateMode, isCompleted, title, inputMessage) VALUES (?, ? , ?, ?, ?, ?)`;
    const params = [
      newTodo[0].id,
      newTodo[0].addMode,
      newTodo[0].updateMode,
      newTodo[0].isCompleted,
      newTodo[0].title,
      newTodo[0].inputMessage,
    ];
    const result = await executeQuery(query, params);
    console.log(result);
    res.status(200).send("Todo item updated successfully.");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating todo item.");
  }
});

app.get("/api/planner-main", (req, res) => {
  // delete require.cache[require.resolve("./todos.js")];
  // 조회query문 함수
  executeQuery("SELECT * FROM todos")
    .then((result) => {
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Surrogate-Control", "no-store");
      res.json(result);
    })
    .catch((err) => {});
});

app.get("/api/userinfo", (req, res) => {
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Surrogate-Control", "no-store");
  executeQuery("SELECT * FROM userinfo")
    .then((result) => {
      res.json(result);
    })
    .catch((err) => {});
  // res.json(userinfo);
});

app.put("/api/todo-iscompleted", async (req, res) => {
  try {
    const updatedTodo = req.body;
    console.log("updatedTodo", updatedTodo);

    const query = `UPDATE todos SET isCompleted = NOT isCompleted WHERE id = '${updatedTodo[0].id}'`;

    await executeQuery(query);
    const getResult = await executeQuery("SELECT * FROM todos");
    res.json(getResult);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error updating todo item.");
  }
});

app.put("/api/todo-update", async (req, res) => {
  try {
    const updatedTodo = req.body;
    console.log("updatedTodo", updatedTodo);
    const query = `UPDATE todos SET title = '${updatedTodo[0].title}' WHERE id = '${updatedTodo[0].id}'`;
    await executeQuery(query);
    const getResult = await executeQuery("SELECT * FROM todos");
    res.json(getResult);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error updating todo item.");
  }
});

app.delete("/api/todo-delete", async (req, res) => {
  try {
    const payload = req.body; // get the id from the request body
    console.log("payload", payload);

    const query = `DELETE FROM todos WHERE id = '${payload.id}'`;
    await executeQuery(query);
    const getResult = await executeQuery("SELECT * FROM todos");
    res.json(getResult);
  } catch (error) {}
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

app.get("/api/achievement/thisweek", (req, res) => {
  res.json(chartData);
});

app.listen(PORT, () => {
  console.log(`server is running on ${PORT}`);
});

app.get("/", (req, res) => {
  res.send("Here is homepage!");
});
