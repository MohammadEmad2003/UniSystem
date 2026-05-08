const express = require("express");
const {
  getAllCourses,
  createCourse,
  getSingleCourse,
  updateCourse,
  deleteCourse,
  getPrerequisites,
  addPrerequisite,
  removePrerequisite
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

router
  .route("/:courseCode/prerequisites")
  .get(verifyToken, getPrerequisites)
  .post(verifyToken, allowedTo(userRoles.ADMIN), addPrerequisite);

router
  .route("/:courseCode/prerequisites/:prereqCode")
  .delete(verifyToken, allowedTo(userRoles.ADMIN), removePrerequisite);

module.exports = router;
