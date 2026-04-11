const express = require("express");
const controller = require("../controllers/doctorController");
const verifyToken = require("../middleware/verifytoken");

const router = express.Router();

// ============ DOCTOR ROUTES ============

// GET DOCTOR STATS - Get dashboard statistics for a doctor
router.route("/:doctorId/stats")
  .get(verifyToken, controller.getDoctorStats);

module.exports = router;
