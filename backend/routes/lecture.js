const express = require("express");
const { getLecturesByClassID, createLecture, deleteLecture } = require("../controllers/LectureController");
const router = express.Router();

router.get("/:classId/lectures", getLecturesByClassID);
router.post("/:classId/lectures", createLecture);
router.delete("/lectures/:lecId", deleteLecture);

module.exports = router;
