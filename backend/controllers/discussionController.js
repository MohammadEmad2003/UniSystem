const httpstatustext = require('../utilities/httpstatustext');
const asyncWrapper = require('../middleware/asyncWrapper');
const db = require('../utilities/database');

// GET /classes/:classId/questions
const getClassQuestions = asyncWrapper(async (req, res) => {
  const { classId } = req.params;

  const questions = await new Promise((resolve, reject) => {
    db.all(
      `SELECT 
        q.Questions_ID, q.Class_ID, q.Text,
        COALESCE(q.User_ID, q.Doctor_ID) AS User_ID,
        u.F_Name || ' ' || u.L_Name AS User_Name,
        u.Role AS User_Role,
        u.Image_Url AS User_Image,
        q.rowid AS Time
       FROM Questions q
       INNER JOIN User u ON (q.User_ID = u.User_ID OR q.Doctor_ID = u.User_ID)
       WHERE q.Class_ID = ?`,
      [classId],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });

  // جيب الـ answers لكل question
  const questionsWithAnswers = await Promise.all(
    questions.map(async (q) => {
      const answers = await new Promise((resolve, reject) => {
        db.all(
          `SELECT 
            a.Answer_ID, a.Questions_ID, a.Text, a.Time,
            COALESCE(a.User_ID, a.Doctor_ID) AS User_ID,
            u.F_Name || ' ' || u.L_Name AS User_Name,
            u.Role AS User_Role
           FROM Answer a
           INNER JOIN User u ON (a.User_ID = u.User_ID OR a.Doctor_ID = u.User_ID)
           WHERE a.Questions_ID = ?`,
          [q.Questions_ID],
          (err, rows) => {
            if (err) return reject(err);
            resolve(rows || []);
          }
        );
      });
      return { ...q, answers };
    })
  );

  res.json({ success: httpstatustext.success, data: questionsWithAnswers });
});

// POST /classes/:classId/questions
const postQuestion = asyncWrapper(async (req, res) => {
  const { classId } = req.params;
  const { text } = req.body;
  const userId = req.currentUser.user_id;
  const role = req.currentUser.role;

  if (!text) {
    return res.status(400).json({ success: httpstatustext.error, message: { msg: 'text is required' } });
  }

  await new Promise((resolve, reject) => {
    const isDoctor = role === 'Doctor';
    db.run(
      `INSERT INTO Questions (Text, Class_ID, User_ID, Doctor_ID) VALUES (?, ?, ?, ?)`,
      [text, classId, isDoctor ? null : userId, isDoctor ? userId : null],
      function (err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID });
      }
    );
  });

  res.status(201).json({ success: httpstatustext.success, message: { msg: 'Question posted successfully' } });
});

// POST /questions/:questionId/answers
const postAnswer = asyncWrapper(async (req, res) => {
  const { questionId } = req.params;
  const { text } = req.body;
  const userId = req.currentUser.user_id;
  const role = req.currentUser.role;

  if (!text) {
    return res.status(400).json({ success: httpstatustext.error, message: { msg: 'text is required' } });
  }

  // تأكد إن الـ question موجودة
  const question = await new Promise((resolve, reject) => {
    db.get(`SELECT * FROM Questions WHERE Questions_ID = ?`, [questionId], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

  if (!question) {
    return res.status(404).json({ success: httpstatustext.error, message: { msg: 'Question not found' } });
  }

  // جيب الـ Answer_ID الجديد
  const lastAnswer = await new Promise((resolve, reject) => {
    db.get(
      `SELECT MAX(Answer_ID) AS maxId FROM Answer WHERE Questions_ID = ?`,
      [questionId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row);
      }
    );
  });

  const newAnswerId = (lastAnswer?.maxId || 0) + 1;
  const isDoctor = role === 'Doctor';

  await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO Answer (Answer_ID, Questions_ID, Text, User_ID, Doctor_ID) VALUES (?, ?, ?, ?, ?)`,
      [newAnswerId, questionId, text, isDoctor ? null : userId, isDoctor ? userId : null],
      function (err) {
        if (err) return reject(err);
        resolve();
      }
    );
  });

  res.status(201).json({ success: httpstatustext.success, message: { msg: 'Answer posted successfully' } });
});

module.exports = { getClassQuestions, postQuestion, postAnswer };