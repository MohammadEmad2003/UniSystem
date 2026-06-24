const asyncWrapper = require("../middleware/asyncWrapper");
const genericQueries = require("../utilities/genericQueries");
const db = require("../utilities/database");
const courseQueries = genericQueries("Courses", { primaryKey: "Course_Code" });

const getAllCourses = asyncWrapper(async (req, res) => {
  const { department_id } = req.query;

  let query = `
    SELECT 
      c.course_code,
      c.name,
      c.credit_hours,
      o.dept_id AS department_id
    FROM Courses c
    LEFT JOIN Offers o
    ON c.course_code = o.course_code
  `;

  const params = [];

  if (department_id) {
    query += ` WHERE o.dept_id = $1`;
    params.push(department_id);
  }

  const result = await db.query(query, params);
  res.status(200).json({
    success: true,
    data: result.rows,
    message: "Courses fetched successfully",
  });
});

const createCourse = asyncWrapper(async (req, res) => {
  const { course_code, name, credit_hours, department_id } = req.body;

  await db.query(
      `INSERT INTO Courses (course_code, name, credit_hours)
       VALUES ($1, $2, $3)`,
      [course_code, name, credit_hours]
  );

  await db.query(
      `INSERT INTO Offers (course_code, dept_id)
       VALUES ($1, $2)`,
      [course_code, department_id]
  );

  const newCourseResult = await db.query(
      `
      SELECT 
        c.course_code,
        c.name,
        c.credit_hours,
        o.dept_id AS department_id
      FROM Courses c
      JOIN Offers o
      ON c.course_code = o.course_code
      WHERE c.course_code = $1
      `,
      [course_code]
  );
  const newCourse = newCourseResult.rows[0];

  res.status(201).json({
    success: true,
    data: newCourse,
    message: "Course created successfully",
  });
});

const getSingleCourse = asyncWrapper(async (req, res) => {
  const { courseCode } = req.params;

  const courseResult = await db.query(
      `
      SELECT 
        c.course_code,
        c.name,
        c.credit_hours,
        o.dept_id AS department_id
      FROM Courses c
      LEFT JOIN Offers o
      ON c.course_code = o.course_code
      WHERE c.course_code = $1
      `,
      [courseCode]
  );
  const course = courseResult.rows[0];

  if (!course) {
    return res.status(404).json({
      success: false,
      message: "Course not found",
    });
  }

  res.status(200).json({
    success: true,
    data: course,
    message: "Course fetched successfully",
  });
});

const updateCourse = asyncWrapper(async (req, res) => {
  await courseQueries.update(req.params.courseCode, req.body);
  const updatedCourse = await courseQueries.getById(req.params.courseCode);
  res.status(200).json({
    success: true,
    data: updatedCourse,
    message: "Course updated successfully",
  });
});

const deleteCourse = asyncWrapper(async (req, res) => {
  await courseQueries.delete(req.params.courseCode);
  res.status(200).json({
    success: true,
    message: "Course deleted successfully",
  });
});

const getPrerequisites = asyncWrapper(async (req, res) => {
  const { courseCode } = req.params;
  const result = await db.query(
    `SELECT p.prereq_course_code, c.name 
     FROM Course_Prerequisites p
     JOIN Courses c ON p.prereq_course_code = c.course_code
     WHERE p.course_code = $1`,
    [courseCode]
  );
  res.status(200).json({ success: true, data: result.rows });
});

const addPrerequisite = asyncWrapper(async (req, res) => {
  const { courseCode } = req.params;
  const { prereqCode } = req.body;
  if (courseCode === prereqCode) {
    return res.status(400).json({ success: false, message: "A course cannot be a prerequisite of itself" });
  }
  await db.query(
      `INSERT INTO Course_Prerequisites (course_code, prereq_course_code) VALUES ($1, $2)`,
      [courseCode, prereqCode]
  );
  res.status(201).json({ success: true, message: "Prerequisite added successfully" });
});

const removePrerequisite = asyncWrapper(async (req, res) => {
  const { courseCode, prereqCode } = req.params;
  await db.query(
      `DELETE FROM Course_Prerequisites WHERE course_code = $1 AND prereq_course_code = $2`,
      [courseCode, prereqCode]
  );
  res.status(200).json({ success: true, message: "Prerequisite removed successfully" });
});

module.exports = {
  getAllCourses,
  createCourse,
  getSingleCourse,
  updateCourse,
  deleteCourse,
  getPrerequisites,
  addPrerequisite,
  removePrerequisite
};
