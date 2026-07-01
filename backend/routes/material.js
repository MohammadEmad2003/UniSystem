const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload"); 
const cloudinaryUpload = require("../middleware/cloudinaryUpload");
const allowedTo = require("../middleware/allowedTo");
const userRoles = require("../utilities/userRoles");

const verifyToken = require("../middleware/verifytoken");
const { createMaterial, getMaterialsByClass ,deleteMaterial , getMaterialsByLectureID} = require("../controllers/MaterialController");

// Use Cloudinary upload for materials
router.post("/:classId/materials", verifyToken, allowedTo(userRoles.DOCTOR), cloudinaryUpload.uploadMaterialFile, createMaterial);
router.get("/:classId/materials", verifyToken, getMaterialsByClass);

// Get materials by lecture ID
router.get("/lectures/:lectureId/materials", verifyToken, getMaterialsByLectureID);

router.delete("/materials/:materialId", verifyToken, deleteMaterial);



module.exports = router;