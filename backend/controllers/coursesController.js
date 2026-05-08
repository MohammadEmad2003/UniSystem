const asyncWrapper = require("../middleware/asyncWrapper");
const genericQueries = require("../utilities/genericQueries");
const db = require("../utilities/database");
const courseQueries = genericQueries("Courses", { primaryKey: "Course_Code" });

const getAllCourses = asyncWrapper(async (req, res) => {
  const { department_id } = req.query;

  let query = `
    SELECT 
      c.Course_Code AS course_code,
      c.Name AS name,
      c.Credit_Hours AS credit_hours,
      o.Dept_ID AS department_id
    FROM Courses c
    LEFT JOIN Offers o
    ON c.Course_Code = o.Course_Code
  `;

  const params = [];

  if (department_id) {
    query += ` WHERE o.Dept_ID = ?`;
    params.push(department_id);
  }

  db.all(query, params, (err, rows) => {
    if (err) throw err;

    res.status(200).json({
      success: true,
      data: rows,
      message: "Courses fetched successfully",
    });
  });
});

const createCourse = asyncWrapper(async (req, res) => {
  const { course_code, name, credit_hours, department_id } = req.body;

  await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO Courses (Course_Code, Name, Credit_Hours)
       VALUES (?, ?, ?)`,
      [course_code, name, credit_hours],
      (err) => {
        if (err) reject(err);
        resolve();
      },
    );
  });

  await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO Offers (Course_Code, Dept_ID)
       VALUES (?, ?)`,
      [course_code, department_id],
      (err) => {
        if (err) reject(err);
        resolve();
      },
    );
  });

  const newCourse = await new Promise((resolve, reject) => {
    db.get(
      `
      SELECT 
        c.Course_Code AS course_code,
        c.Name AS name,
        c.Credit_Hours AS credit_hours,
        o.Dept_ID AS department_id
      FROM Courses c
      JOIN Offers o
      ON c.Course_Code = o.Course_Code
      WHERE c.Course_Code = ?
      `,
      [course_code],
      (err, row) => {
        if (err) reject(err);
        resolve(row);
      },
    );
  });

  res.status(201).json({
    success: true,
    data: newCourse,
    message: "Course created successfully",
  });
});

const getSingleCourse = asyncWrapper(async (req, res) => {
  const { courseCode } = req.params;

  const course = await new Promise((resolve, reject) => {
    db.get(
      `
      SELECT 
        c.Course_Code AS course_code,
        c.Name AS name,
        c.Credit_Hours AS credit_hours,
        o.Dept_ID AS department_id
      FROM Courses c
      LEFT JOIN Offers o
      ON c.Course_Code = o.Course_Code
      WHERE c.Course_Code = ?
      `,
      [courseCode],
      (err, row) => {
        if (err) reject(err);
        resolve(row);
      },
    );
  });

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
  db.all(
    `SELECT p.Prereq_Course_Code, c.Name 
     FROM Course_Prerequisites p
     JOIN Courses c ON p.Prereq_Course_Code = c.Course_Code
     WHERE p.Course_Code = ?`,
    [courseCode],
    (err, rows) => {
      if (err) throw err;
      res.status(200).json({ success: true, data: rows });
    }
  );
});

const addPrerequisite = asyncWrapper(async (req, res) => {
  const { courseCode } = req.params;
  const { prereqCode } = req.body;
  if (courseCode === prereqCode) {
    return res.status(400).json({ success: false, message: "A course cannot be a prerequisite of itself" });
  }
  await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO Course_Prerequisites (Course_Code, Prereq_Course_Code) VALUES (?, ?)`,
      [courseCode, prereqCode],
      (err) => {
        if (err) reject(err);
        resolve();
      }
    );
  });
  res.status(201).json({ success: true, message: "Prerequisite added successfully" });
});

const removePrerequisite = asyncWrapper(async (req, res) => {
  const { courseCode, prereqCode } = req.params;
  await new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM Course_Prerequisites WHERE Course_Code = ? AND Prereq_Course_Code = ?`,
      [courseCode, prereqCode],
      (err) => {
        if (err) reject(err);
        resolve();
      }
    );
  });
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
