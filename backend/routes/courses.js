const express = require("express");
const {
  getAllCourses,
  createCourse,
  getSingleCourse,
  updateCourse,
  deleteCourse,
} = require("../controllers/coursesController");

const verifyToken = require("../middleware/verifytoken");
const allowedTo = require("../middleware/allowedTo");
const userRoles = require("../utilities/userRoles");
const router = express.Router();

router
  .route("/")
  .get(verifyToken, getAllCourses)
  .post(verifyToken, allowedTo(userRoles.ADMIN), createCourse);

router
  .route("/:courseCode")
  .get(verifyToken, getSingleCourse)
  .patch(verifyToken, allowedTo(userRoles.ADMIN), updateCourse)
  .delete(verifyToken, allowedTo(userRoles.ADMIN), deleteCourse);

module.exports = router;
