const express = require("express");
const { getStudentStats, getAllStudents, getPaymentDetails, makePayment, getTranscript } = require("../controllers/studentController");
const verifyToken = require("../middleware/verifytoken");
const { validators } = require("../middleware/validator");
const router = express.Router();

router.use(verifyToken);

router.get("/:studentId/stats", validators.studentId(), getStudentStats);
router.get("/:studentId/payment", validators.studentId(), getPaymentDetails);
router.post("/:studentId/payment", validators.studentId(), validators.payment(), makePayment);
router.get("/:studentId/transcript", validators.studentId(), getTranscript);
router.get("/", getAllStudents);

module.exports = router;
