//프레임워크, 라이브러리
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

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

async function executeQuery(query) {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(query);
    return result;
  } catch (err) {
    throw err;
  } finally {
    if (conn) conn.end();
  }
}

// executeQuery("SELECT * FROM userinfo")
//   .then((result) => {
//     // res.setHeader("Cache-Control", "no-cache");
//     // res.setHeader("Surrogate-Control", "no-store");
//     console.log(result);
//   })
//   .catch((err) => {
//     console.error(err);
//   });

app.get("/api/planner-main", (req, res) => {
  // delete require.cache[require.resolve("./todos.js")];
  // 조회query문 함수
  executeQuery("SELECT * FROM students")
    .then((result) => {
      // res.setHeader("Cache-Control", "no-cache");
      // res.setHeader("Surrogate-Control", "no-store");
      console.log(result);
      res.json(result);
    })
    .catch((err) => {
      console.error(err);
    });
});

app.put("/api/todo-update", (req, res) => {
  const updatedTodo = req.body; // get the updated todo item from the request body
  try {
    if (updatedTodo === todosData.todos) {
      return res.status(404).send("Todo item not found.");
    }

    // Update the todos array with the new array
    todosData.todos = updatedTodo.todos;

    // Write updated todos array to file
    const filePath = path.join(__dirname, "todos.js");
    fs.writeFileSync(filePath, `module.exports = ${JSON.stringify(todosData)}`);

    res.status(200).send("Todo item updated successfully.");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating todo item.");
  }
});

app.delete("/api/todo-delete", (req, res) => {
  const { id } = req.body; // get the id from the request body

  try {
    // Remove the todo item with the specified id from the todos array
    const filteredTodos = todosData.todos.filter((todo) => todo.id !== id);

    // If the length of the todos array changed, a todo item was removed
    if (filteredTodos.length < todosData.todos.length) {
      todosData.todos = filteredTodos;

      // Write updated todos array to file
      const filePath = path.join(__dirname, "todos.js");
      fs.writeFileSync(
        filePath,
        `module.exports = ${JSON.stringify(todosData)}`
      );

      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Surrogate-Control", "no-store");
      res.status(200).send(`Todo item with id ${id} was deleted successfully.`);
    } else {
      res.status(404).send(`Todo item with id ${id} not found.`);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting todo item.");
  }
});

app.post("/api/todo-add", (req, res) => {
  delete require.cache[require.resolve("./todos.js")];
  const newTodo = req.body; // get the new data from the request body

  try {
    // newTodo.id = todosData.todos.length + 1 --> key값 중복에러 발생
    // uuid library로 유일한 키값 생성하여 할당
    // push 메서드 대신, unshift 메서드를 사용하여 최근추가 데이터를 상위로 생성
    newTodo.id = uuidv4();
    todosData.todos.unshift(newTodo);
    fs.writeFileSync(
      "./todos.js",
      `module.exports = ${JSON.stringify(todosData)}`
    );
    res.status(200).send("your Requeest success^^");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating data.");
  }
});

app.get("/api/userinfo", (req, res) => {
  executeQuery("SELECT * FROM userinfo")
    .then((result) => {
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Surrogate-Control", "no-store");
      console.log(result);
      res.json(result);
    })
    .catch((err) => {
      console.error(err);
    });
  // res.json(userinfo);
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
