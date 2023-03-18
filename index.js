const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 8080;
const { userinfo } = require("./userInfo.js");
const { week, month } = require("./rank.js");
const { posts } = require("./data.js");
const { dday } = require("./dday.js");
const todosData = require("./todos.js");
const { chartData } = require("./lineChartData.js");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

app.use(cors());
app.use(express.json());

app.put("/api/todo-update", (req, res) => {
  const updatedTodo = req.body; // get the updated todo item from the request body
  try {
    // Map over the todos array and replace the matching todo item with the updated todo item
    // const updatedTodos = todosData.todos.map((todo) => {
    //   if (todo.id === updatedTodo.id) {
    //     return { ...todo, ...updatedTodo };
    //   }
    //   return todo;
    // });

    // Check if the todo item was found and updated
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

app.get("/api/planner-main", (req, res) => {
  delete require.cache[require.resolve("./todos.js")];
  let todos2 = require("./todos.js");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Surrogate-Control", "no-store");
  res.json(todos2.todos);
});

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

app.get("/api/achievement/thisweek", (req, res) => {
  res.json(chartData);
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
