const express = require("express");
const verifyToken = require("../middleware/verifytoken");
const allowedTo = require("../middleware/allowedTo");
const userRoles = require("../utilities/userRoles");
const { askClassQuestion, askGeneralQuestion } = require("../controllers/aiController");

const router = express.Router();

router.use(verifyToken);

router.post(
  "/ai/ask",
  askGeneralQuestion
);

router.post(
  "/:classId/ai/ask",
  allowedTo(userRoles.STUDENT, userRoles.DOCTOR),
  askClassQuestion
);

module.exports = router;
