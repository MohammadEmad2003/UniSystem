const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload"); 
const verifyToken = require("../middleware/verifytoken");
const { createMaterial, getMaterialsByClass ,deleteMaterial , getMaterialsByLectureID} = require("../controllers/MaterialController");

router.use(verifyToken);

router.post("/:classId/materials", upload.single('document'), createMaterial);
router.get("/:classId/materials", getMaterialsByClass);

// Get materials by lecture ID
router.get("/lectures/:lectureId/materials", getMaterialsByLectureID);

router.delete("/materials/:materialId", deleteMaterial);



module.exports = router;