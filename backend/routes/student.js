const express = require("express");
const { getStudentStats, getAllStudents, getPaymentDetails, makePayment } = require("../controllers/studentController");
const verifyToken = require("../middleware/verifytoken");
const router = express.Router();

router.use(verifyToken);

router.get("/:studentId/stats", getStudentStats);
router.get("/:studentId/payment", getPaymentDetails);
router.post("/:studentId/payment", makePayment);
router.get("/", getAllStudents);

module.exports = router;
