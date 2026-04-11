const express = require("express");
const { getLecturesByClassID, createLecture, deleteLecture  , getMaterialsByLectureID} = require("../controllers/LectureController");
const router = express.Router();

const verifyToken = require("../middleware/verifytoken");

router.use(verifyToken);
router.get("/:classId/lectures", getLecturesByClassID);
router.post("/:classId/lectures", createLecture);
router.delete("/lectures/:lecId", deleteLecture);


module.exports = router;
