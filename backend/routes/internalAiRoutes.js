const express = require("express");
const verifyInternalApiKey = require("../middleware/verifyInternalApiKey");
const {
  getInternalClassQuestions,
  getInternalClassMaterials,
  getInternalQuestion,
  getInternalMaterial,
  indexMaterialInAI,
} = require("../controllers/internalAiController");

const router = express.Router();

router.use(verifyInternalApiKey);

router.get("/classes/:classId/questions", getInternalClassQuestions);
router.get("/classes/:classId/materials", getInternalClassMaterials);
router.get("/questions/:questionId", getInternalQuestion);
router.get("/materials/:materialId", getInternalMaterial);
router.post("/materials/:materialId/index/:classId", indexMaterialInAI);

module.exports = router;
