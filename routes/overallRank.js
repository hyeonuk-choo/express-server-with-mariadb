const express = require("express");
const router = express.Router();
const overallRankController = require("../controllers/overallRankController");

router.get("/", overallRankController.getOverallRank);

module.exports = router;
