const asyncWrapper = require("../middleware/asyncWrapper");
const db = require("../utilities/database");
const httpstatustext = require("../utilities/httpstatustext");
const userRoles = require("../utilities/userRoles");
const createNotification = require("../utilities/createNotification");
const aiServiceClient = require("../services/aiServiceClient");

const getClassById = (classId) =>
  new Promise((resolve, reject) => {
    db.get(
      `SELECT Class_ID, Doctor_ID FROM Class WHERE Class_ID = ?`,
      [classId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      }
    );
  });

const userHasClassAccess = (classId, userId, role) =>
  new Promise((resolve, reject) => {
    if (role === userRoles.DOCTOR) {
      db.get(
        `SELECT Class_ID FROM Class WHERE Class_ID = ? AND Doctor_ID = ?`,
        [classId, userId],
        (err, row) => {
          if (err) return reject(err);
          resolve(Boolean(row));
        }
      );
      return;
    }

    db.get(
      `SELECT Class_ID FROM Enrollment WHERE Class_ID = ? AND User_ID = ?`,
      [classId, userId],
      (err, row) => {
        if (err) return reject(err);
        resolve(Boolean(row));
      }
    );
  });

const insertEscalatedQuestion = ({ classId, userId, role, questionText }) =>
  new Promise((resolve, reject) => {
    const isDoctor = role === userRoles.DOCTOR;

    db.run(
      `INSERT INTO Questions (Text, Class_ID, User_ID, Doctor_ID) VALUES (?, ?, ?, ?)`,
      [questionText, classId, isDoctor ? null : userId, isDoctor ? userId : null],
      function onInsert(err) {
        if (err) return reject(err);
        resolve(this.lastID);
      }
    );
  });

const askClassQuestion = asyncWrapper(async (req, res, next) => {
  const { classId } = req.params;
  const { question } = req.body;
  const currentUser = req.currentUser;
  const normalizedQuestion = typeof question === "string" ? question.trim() : "";

  if (!normalizedQuestion) {
    return res.status(400).json({
      success: httpstatustext.error,
      message: { msg: "question is required" },
    });
  }

  const classInfo = await getClassById(classId);

  if (!classInfo) {
    return res.status(404).json({
      success: httpstatustext.error,
      message: { msg: "Class not found" },
    });
  }

  const hasAccess = await userHasClassAccess(
    classId,
    currentUser.user_id,
    currentUser.role
  );

  if (!hasAccess) {
    return res.status(403).json({
      success: httpstatustext.error,
      message: { msg: "You are not authorized to access this class" },
    });
  }

  const aiResponse = await aiServiceClient.askQuestion({
    class_id: Number(classId),
    user_id: currentUser.user_id,
    question: normalizedQuestion,
  });

  if (aiResponse.status === "answered") {
    return res.status(200).json(aiResponse);
  }

  if (aiResponse.status !== "sent_to_doctor") {
    const error = new Error("Unexpected response from AI service");
    error.statusCode = 502;
    return next(error);
  }

  const questionId = await insertEscalatedQuestion({
    classId,
    userId: currentUser.user_id,
    role: currentUser.role,
    questionText: normalizedQuestion,
  });

  if (classInfo.Doctor_ID) {
    await createNotification({
      userId: classInfo.Doctor_ID,
      type: "new_question",
      title: "New Question Needs Review",
      message: "An AI question in your class needs a doctor's response.",
      classId: Number(classId),
      referenceId: questionId,
    });
  }

  return res.status(201).json({
    success: true,
    data: {
      status: "sent_to_doctor",
      question_id: questionId,
      message:
        "No confident answer was found. Your question has been sent to the doctor.",
    },
  });
});

module.exports = {
  askClassQuestion,
};
