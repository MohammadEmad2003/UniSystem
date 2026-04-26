const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload"); 
const allowedTo = require("../middleware/allowedTo");
const userRoles = require("../utilities/userRoles");

const verifyToken = require("../middleware/verifytoken");
const { createMaterial, getMaterialsByClass ,deleteMaterial , getMaterialsByLectureID} = require("../controllers/MaterialController");

router.post("/:classId/materials", verifyToken, allowedTo(userRoles.DOCTOR), upload.single('document'), createMaterial);
router.get("/:classId/materials", verifyToken, getMaterialsByClass);

// Get materials by lecture ID
router.get("/lectures/:lectureId/materials", verifyToken, getMaterialsByLectureID);

router.delete("/materials/:materialId", verifyToken, deleteMaterial);



module.exports = router;