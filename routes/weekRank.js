const express = require("express");
const router = express.Router();
const weekRankController = require("../controllers/weekRankController");

router.get("/", weekRankController.getWeekRank);

module.exports = router;
