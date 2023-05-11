//프레임워크, 라이브러리
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

// 데이터
const monthRankRouter = require("./routes/monthRank");
const overallRankRouter = require("./routes/overallRank");
const { chartData } = require("./lineChartData.js");

const app = express();
const PORT = 8080;
app.use(cors());
app.use(express.json());
app.use("/api/rank/month", monthRankRouter);
app.use("/api/rank/overall", overallRankRouter);

// mariaDB 로직
const mariadb = require("mariadb");
require("dotenv").config();
const secretkey = process.env.SECRET_KEY;
const host = process.env.DB_HOST;
const user = process.env.DB_USER;
const password = process.env.DB_PASSWORD;
const database = process.env.DB_DATABASE;
// 이미지파일 업로드
const multer = require("multer");

const pool = mariadb.createPool({
  host,
  user,
  password,
  database,
  connectionLimit: 20,
  bigNumberStrings: true,
});

const authenticateUser = (req, res, next) => {
  // HTTP 요청 헤더에서 "authorization" 값을 가져옵니다.
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  // "Authorization" 헤더 값은 "Bearer [JWT 토큰]" 형식이므로, 토큰만 분리합니다.
  const token = authHeader.split(" ")[1];

  // JWT 토큰을 검증합니다.
  jwt.verify(token, secretkey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Token is not valid" });
    }
    // 검증된 사용자 정보를 req.user에 저장합니다.
    req.user = decoded;
    console.log("authenticateUser => req.user1", req.user);
    // next 파라미터 콜백함수는 중요한 것이었다.
    next();
  });
};

// 마이페이지 유저 프로필 수정기능
app.put("/api/edit-profile", authenticateUser, async (req, res) => {
  // //authenticateUser함수로 JWT를 통해 인증된 사용자의 ID를 가져옵니다.
  const userID = req.user.id;
  const data = req.body;
  console.log("서버가 데이터 받음", data);
  console.log("JWT를 통해 인증된 사용자의 ID", userID);
  const query = `UPDATE userinfo SET username = ?, school=?, grade=?, myMotto=? WHERE id = ?`;
  const params = [data.username, data.school, data.grade, data.myMotto, userID];
  await executeQuery(query, params);

  const getResult = await executeQuery("SELECT * FROM userinfo WHERE id = ?", [
    userID,
  ]);

  res.json(getResult);
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

app.get("/api/userinfo", authenticateUser, (req, res) => {
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Surrogate-Control", "no-store");
  const userID = req.user.id;

  // 두 쿼리를 병렬로 실행
  Promise.all([
    executeQuery("SELECT COUNT(*) as total_rows FROM userinfo"),
    executeQuery("SELECT * FROM userinfo WHERE id = ?", [userID]),
  ])
    .then(([countResult, userResult]) => {
      res.json({
        total_rows: countResult[0].total_rows.toString(),
        user: userResult[0],
      });
    })
    .catch((err) => {
      console.error(err);
    });
});

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
      res.status(200).json({ error: "Invalid email or password" });
    }
  } catch (err) {
    console.error(err);
    res.status(200).json({ error: "Internal server error" });
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

app.post("/api/todo-create", authenticateUser, async (req, res) => {
  let connection;
  const newTodo = req.body;
  const { id, addMode, updateMode, isCompleted, title, inputMessage } =
    newTodo[0];
  const userID = req.user.id; //authenticateUser함수로 부터 받는다.

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction(); // 트랜잭션 시작

    const query = `INSERT INTO todos (id, user_id, addMode, updateMode, isCompleted, title, inputMessage) VALUES (?, ? , ?, ?, ?, ?, ?)`;
    const params = [
      id,
      userID,
      addMode,
      updateMode,
      isCompleted,
      title,
      inputMessage,
    ];
    await connection.query(query, params);

    // todos_count 값을 변경하기 전에 todos 테이블에서 해당 사용자의 row 개수를 확인합니다.
    const [{ count }] = await connection.query(
      "SELECT COUNT(*) as count FROM todos WHERE user_id = ?",
      [userID]
    );
    await connection.query("UPDATE userinfo SET totalCnt = ? WHERE id = ?", [
      count,
      userID,
    ]);

    await connection.commit(); // 트랜잭션 커밋

    res.status(200).send("Todo item updated successfully.");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating todo item.");
  } finally {
    if (connection) connection.release();
  }
});

// 유저 랭킹정보
app.get("/api/rank", authenticateUser, async (req, res) => {
  const userID = req.user.id; //authenticateUser함수로 부터 받는다.
  try {
    const data = await executeQuery(
      "SELECT month_rank.rank AS monthRank, total_rank.rank AS totalRank FROM month_rank JOIN total_rank ON month_rank.id = total_rank.id WHERE month_rank.id = ?",
      [userID]
    );
    res.json(data);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching the rank data." });
  }
});

// 지난달, 이번달 달성률
app.get("/api/achievement-rate", authenticateUser, async (req, res) => {
  const userID = req.user.id; // authenticateUser함수로 부터 받는다.
  try {
    // 지난달 플래너의 수
    const lastMonthCountData = await executeQuery(
      "SELECT COUNT(*) AS lastMonth_count FROM todos WHERE user_id = ? AND created_at >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH) ,'%Y-%m-01') AND created_at < DATE_FORMAT(NOW(), '%Y-%m-01')",
      [userID]
    );

    // 지난달 완료한 플래너 수
    const lastMonthCompletedCountData = await executeQuery(
      "SELECT COUNT(*) AS lastMonth_completed_count FROM todos WHERE user_id = ? AND created_at >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH) ,'%Y-%m-01') AND created_at < DATE_FORMAT(NOW(), '%Y-%m-01') AND isCompleted = 1",
      [userID]
    );

    // 이번달 플래너의 수
    const thisMonthCountData = await executeQuery(
      "SELECT COUNT(*) AS thisMonth_count FROM todos WHERE user_id = ? AND created_at >= DATE_FORMAT(NOW() ,'%Y-%m-01') AND created_at < DATE_FORMAT(DATE_ADD(NOW() , INTERVAL 1 MONTH), '%Y-%m-01')",
      [userID]
    );

    // 이번달 완료한 플래너의 수
    const thisMonthCompletedCountData = await executeQuery(
      "SELECT COUNT(*) AS thisMonth_completed_count FROM todos WHERE user_id = ? AND created_at >= DATE_FORMAT(NOW() ,'%Y-%m-01') AND created_at < DATE_FORMAT(DATE_ADD(NOW() , INTERVAL 1 MONTH), '%Y-%m-01') AND isCompleted = 1",
      [userID]
    );

    const safeData = {
      lastMonth_count: lastMonthCountData[0].lastMonth_count.toString(),
      lastMonth_completed_count:
        lastMonthCompletedCountData[0].lastMonth_completed_count.toString(),
      thisMonth_count: thisMonthCountData[0].thisMonth_count.toString(),
      thisMonth_completed_count:
        thisMonthCompletedCountData[0].thisMonth_completed_count.toString(),
    };

    res.json(safeData);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching the data." });
  }
});

app.get("/api/planner-main", authenticateUser, (req, res) => {
  // delete require.cache[require.resolve("./todos.js")];
  // 조회query문 함수
  const userID = req.user.id;

  executeQuery("SELECT * FROM todos WHERE user_id = ?", [userID])
    .then((result) => {
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Surrogate-Control", "no-store");
      res.json(result);
    })
    .catch((err) => {});
});

app.put("/api/todo-iscompleted", authenticateUser, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction(); // 트랜잭션 시작
    const updatedTodo = req.body;
    const userID = req.user.id; // JWT를 통해 인증된 사용자의 ID를 가져옵니다. //authenticateUser함수로 부터 받는다.

    const query = `UPDATE todos SET isCompleted = NOT isCompleted WHERE id = '${updatedTodo[0].id}'`;
    await connection.query(query);

    // todos 테이블에서 user_id가 같고 isCompleted가 true인 개수를 세어서 userinfo 테이블에 업데이트합니다.
    const [{ total_completed_count }] = await connection.query(
      `SELECT COUNT(*) as total_completed_count FROM todos WHERE user_id = ? AND isCompleted = 1`,
      [userID]
    );

    // todos 테이블에서 user_id가 같고 isCompleted가 true 이며, created_at이 이번달인 경우 추가
    const [{ thisMonth_completed_count }] = await connection.query(
      `SELECT COUNT(*) as thisMonth_completed_count FROM todos WHERE user_id = ? AND isCompleted = 1 AND created_at >= DATE_FORMAT(NOW() ,'%Y-%m-01') AND created_at < DATE_FORMAT(DATE_ADD(NOW() , INTERVAL 1 MONTH), '%Y-%m-01')`,
      [userID]
    );

    await connection.query(`UPDATE userinfo SET completeCnt = ? WHERE id = ?`, [
      total_completed_count,
      userID,
    ]);

    const getResult = await connection.query(
      `SELECT * FROM todos WHERE user_id = ?`,
      [userID]
    );
    await connection.commit(); // 트랜잭션 커밋
    res.json(getResult);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error updating todo item.");
  } finally {
    if (connection) connection.release();
  }
});

app.put("/api/todo-update", authenticateUser, async (req, res) => {
  try {
    const updatedTodo = req.body;
    const userID = req.user.id; // JWT를 통해 인증된 사용자의 ID를 가져옵니다. //authenticateUser함수로 부터 받는다.

    const query = `UPDATE todos SET title = ? WHERE id = ? AND user_id = ?`;
    const params = [updatedTodo[0].title, updatedTodo[0].id, userID];
    await executeQuery(query, params);

    const getResult = await executeQuery(
      "SELECT * FROM todos WHERE user_id = ?",
      [userID]
    );

    res.json(getResult);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error updating todo item.");
  }
});

app.delete("/api/todo-delete", authenticateUser, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction(); // 트랜잭션 시작

    const userID = req.user.id; // //authenticateUser함수로 JWT를 통해 인증된 사용자의 ID를 가져옵니다.
    const { id } = req.body; // get the id from the request body

    await connection.query("DELETE FROM todos WHERE id = ? AND user_id = ?", [
      id,
      userID,
    ]);

    // todos_count 값을 변경하기 전에 todos 테이블에서 해당 사용자의 row 개수를 확인합니다.
    const [{ totalCount }] = await connection.query(
      "SELECT COUNT(*) as totalCount FROM todos WHERE user_id = ?",
      [userID]
    );
    const [{ completeCount }] = await connection.query(
      "SELECT COUNT(*) as completeCount FROM todos WHERE user_id = ? AND isCompleted = 1",
      [userID]
    );
    // userinfo 테이블의 totalCnt와 completeCnt 열을 업데이트합니다.
    await connection.query(
      "UPDATE userinfo SET totalCnt = ?, completeCnt = ? WHERE id = ?",
      [totalCount, completeCount, userID]
    );

    await connection.commit(); // 트랜잭션 커밋

    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    await connection.rollback(); // 에러가 발생하면 트랜잭션 롤백
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) connection.release();
  }
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

// // Multer를 사용한 파일 업로드 설정 // 해당 기능은 향후 추가 예정
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "uploads/");
//   },
//   filename: (req, file, cb) => {
//     cb(null, `${Date.now()}_${file.originalname}`);
//   },
// });

// const upload = multer({ storage });

// // 이미지 업로드 라우터 // 해당 기능은 향후 추가 예정
// app.post("/api/upload", upload.single("profileImage"), async (req, res) => {
//   try {
//     const file = req.file;
//     const userId = req.body.userId;

//     if (!file) {
//       res.status(400).send("No file uploaded.");
//       return;
//     }

//     const conn = await pool.getConnection();
//     const query = `
//       UPDATE userinfo
//       SET profileImage = ?
//       WHERE id = ?;
//     `;

//     await conn.query(query, [file.path, userId]);
//     conn.release();

//     res.status(200).send("Profile image uploaded and saved.");
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Internal server error.");
//   }
// });
