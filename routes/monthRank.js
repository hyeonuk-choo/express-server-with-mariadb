const express = require("express");
const router = express.Router();
const monthRankController = require("../controllers/monthRankController");

router.get("/", monthRankController.getMonthRank);

module.exports = router;
