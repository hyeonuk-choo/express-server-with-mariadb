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
  connectionLimit: 20,
});

const ITEMS_PER_PAGE = 5;

exports.getWeekRank = async (req, res) => {
  let conn;
  try {
    const page = parseInt(req.query.page);
    console.log("page", page);
    const offset = page * ITEMS_PER_PAGE;

    conn = await pool.getConnection();
    const rows = await conn.query(
      "SELECT * FROM week_rank ORDER BY rank ASC LIMIT ?, ?",
      [offset, ITEMS_PER_PAGE]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  } finally {
    if (conn) conn.release();
  }
};
