const httpstatustext = require('../utilities/httpstatustext');
const asyncWrapper = require('../middleware/asyncWrapper');
const db = require('../utilities/database');
const createNotification = require('../utilities/createNotification');
const aiServiceClient = require('../services/aiServiceClient');
const { triggerReindex } = aiServiceClient;

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
        q.Time
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

  const questionsWithAnswers = await Promise.all(
    questions.map(async (q) => {
      const answers = await new Promise((resolve, reject) => {
        db.all(
          `SELECT
            a.Answer_ID, a.Questions_ID, a.Text, a.Time,
            COALESCE(a.User_ID, a.Doctor_ID) AS User_ID,
            CASE
              WHEN a.Is_AI_Generated = 1 THEN 'AI Assistant'
              ELSE u.F_Name || ' ' || u.L_Name
            END AS User_Name,
            CASE
              WHEN a.Is_AI_Generated = 1 THEN 'ai'
              ELSE u.Role
            END AS User_Role,
            a.Is_AI_Generated,
            a.Source_Type,
            a.Source_ID,
            a.Confidence,
            a.AI_Metadata
           FROM Answer a
           LEFT JOIN User u ON (a.User_ID = u.User_ID OR a.Doctor_ID = u.User_ID)
           WHERE a.Questions_ID = ?
           ORDER BY a.Answer_ID ASC`,
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

  const isDoctor = role === 'Doctor';

  const result = await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO Questions (Text, Class_ID, User_ID, Doctor_ID) VALUES (?, ?, ?, ?)`,
      [text, classId, isDoctor ? null : userId, isDoctor ? userId : null],
      function (err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID });
      }
    );
  });

  // بعت notification لكل الـ students في الـ class
  const students = await new Promise((resolve, reject) => {
    db.all(
      `SELECT User_ID FROM Enrollment WHERE Class_ID = ?`,
      [classId],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });

  await Promise.all(
    students.map(s =>
      createNotification({
        userId: s.User_ID,
        type: 'new_question',
        title: 'New Question Posted',
        message: `A new question was posted in your class`,
        classId: parseInt(classId),
        referenceId: result.lastID
      })
    )
  );

  // لو الـ student هو اللي سأل، بعت notification للـ doctor
  if (!isDoctor) {
    const classInfo = await new Promise((resolve, reject) => {
      db.get(
        `SELECT Doctor_ID FROM Class WHERE Class_ID = ?`,
        [classId],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });

    if (classInfo?.Doctor_ID) {
      await createNotification({
        userId: classInfo.Doctor_ID,
        type: 'new_question',
        title: 'New Question from Student',
        message: `A student posted a new question in your class`,
        classId: parseInt(classId),
        referenceId: result.lastID
      });
    }
  }

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

  const question = await new Promise((resolve, reject) => {
    db.get(`SELECT * FROM Questions WHERE Questions_ID = ?`, [questionId], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

  if (!question) {
    return res.status(404).json({ success: httpstatustext.error, message: { msg: 'Question not found' } });
  }

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

  // Notify the question owner
  const questionOwnerId = question.User_ID || question.Doctor_ID;
  if (questionOwnerId && questionOwnerId !== userId) {
    const notifType = isDoctor ? 'doctor_answer_ready' : 'new_answer';
    const notifTitle = isDoctor ? 'Your instructor replied' : 'New Answer to Your Question';
    const notifMsg = isDoctor
      ? 'Your instructor has answered your question. Tap to view.'
      : 'Someone answered your question';
    await createNotification({
      userId: questionOwnerId,
      type: notifType,
      title: notifTitle,
      message: notifMsg,
      classId: question.Class_ID,
      referenceId: parseInt(questionId),
      answerId: newAnswerId,
    }).catch(e => console.error('[notify] postAnswer notification failed:', e.message));
  }

  if (isDoctor) {
    try {
      await aiServiceClient.indexQuestion(questionId, {
        class_id: question.Class_ID
      });
    } catch (error) {
      console.error(`[AI] Failed to index answered question ${questionId}: ${error.message}`);
    }
    // Re-index full class so the new Q&A pair is searchable
    triggerReindex(question.Class_ID, 'doctor_answer');
  }

  res.status(201).json({ success: httpstatustext.success, message: { msg: 'Answer posted successfully' } });
});

// POST /classes/:classId/ai/ask-and-save
// Calls RAG, saves question + AI answer, returns both so frontend can insert into stream
const askAndSave = asyncWrapper(async (req, res) => {
  const { classId } = req.params;
  const { text } = req.body;
  const userId = req.currentUser.user_id;
  const role = req.currentUser.role;

  if (!text || !String(text).trim()) {
    return res.status(400).json({ success: httpstatustext.error, message: { msg: 'text is required' } });
  }

  const questionText = String(text).trim();
  const isDoctor = role === 'Doctor';

  // 1. Save the question to DB
  const questionId = await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO Questions (Text, Class_ID, User_ID, Doctor_ID) VALUES (?, ?, ?, ?)`,
      [questionText, classId, isDoctor ? null : userId, isDoctor ? userId : null],
      function (err) { if (err) return reject(err); resolve(this.lastID); }
    );
  });

  // 2. Call RAG AI
  let ragResult = null;
  try {
    ragResult = await aiServiceClient.askQuestion({
      class_id: Number(classId),
      user_id: userId,
      question: questionText,
    });
  } catch (e) {
    console.error('[askAndSave] RAG error:', e.message);
  }

  // 3. Build the question row to return
  const userRow = await new Promise((resolve, reject) => {
    db.get(`SELECT F_Name, L_Name, Role FROM User WHERE User_ID = ?`, [userId], (err, row) => {
      if (err) return reject(err);
      resolve(row || { F_Name: 'Unknown', L_Name: '', Role: role });
    });
  });

  const questionObj = {
    Questions_ID: questionId,
    Class_ID: Number(classId),
    Text: questionText,
    User_ID: userId,
    User_Name: `${userRow.F_Name} ${userRow.L_Name}`.trim(),
    User_Role: (userRow.Role || role).toLowerCase(),
    Time: new Date().toISOString(),
    answers: [],
  };

  // 4. If AI answered, save as answer row
  if (ragResult?.status === 'answered') {
    const answerId = await new Promise((resolve, reject) => {
      db.get(`SELECT MAX(Answer_ID) AS maxId FROM Answer WHERE Questions_ID = ?`, [questionId], (err, row) => {
        if (err) return reject(err);
        resolve((row?.maxId || 0) + 1);
      });
    });

    const metadata = JSON.stringify({
      source_type: ragResult.source_type,
      confidence: ragResult.confidence,
      previous_question: ragResult.previous_question,
      previous_answer: ragResult.previous_answer,
      material_name: ragResult.material_name,
      page: ragResult.page,
    });

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO Answer (Answer_ID, Questions_ID, Text, User_ID, Doctor_ID, Is_AI_Generated, Source_Type, Source_ID, Confidence, AI_Metadata)
         VALUES (?, ?, ?, NULL, NULL, 1, ?, ?, ?, ?)`,
        [
          answerId,
          questionId,
          ragResult.answer,
          ragResult.source_type || null,
          String(ragResult.source_id || ragResult.previous_answer?.answer_id || ''),
          ragResult.confidence || null,
          metadata,
        ],
        function (err) { if (err) return reject(err); resolve(this.lastID); }
      );
    });

    // Index the specific question, then schedule a full class re-index
    try {
      await aiServiceClient.indexQuestion(questionId, { class_id: Number(classId) });
    } catch (e) {
      console.error('[askAndSave] re-index error:', e.message);
    }
    triggerReindex(classId, 'ai_answer');

    questionObj.answers = [{
      Answer_ID: answerId,
      Questions_ID: questionId,
      Text: ragResult.answer,
      Time: new Date().toISOString(),
      User_ID: null,
      User_Name: 'AI Assistant',
      User_Role: 'ai',
      Is_AI_Generated: 1,
      Source_Type: ragResult.source_type || null,
      Source_ID: String(ragResult.source_id || ''),
      Confidence: ragResult.confidence || null,
      AI_Metadata: metadata,
    }];

    // Notify the asking student that AI answered their question
    if (!isDoctor) {
      await createNotification({
        userId,
        type: 'ai_answer_ready',
        title: 'AI answered your question',
        message: 'The AI assistant has answered your question. Tap to view.',
        classId: Number(classId),
        referenceId: questionId,
        answerId,
      }).catch(e => console.error('[notify] ai_answer_ready failed:', e.message));
    }

    return res.status(201).json({ success: true, data: { status: 'answered', question: questionObj } });
  }

  // 5. Not answered — notify doctor
  const classInfo = await new Promise((resolve, reject) => {
    db.get(`SELECT Doctor_ID FROM Class WHERE Class_ID = ?`, [classId], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
  if (classInfo?.Doctor_ID) {
    await createNotification({
      userId: classInfo.Doctor_ID,
      type: 'doctor_question_pending',
      title: 'Student question needs your review',
      message: 'A student asked a question the AI could not answer. Tap to reply.',
      classId: Number(classId),
      referenceId: questionId,
    }).catch(e => console.error('[notify] doctor_question_pending failed:', e.message));
  }

  const status = ragResult?.status === 'sent_to_doctor' ? 'sent_to_doctor' : 'fallback';
  return res.status(201).json({ success: true, data: { status, question: questionObj } });
});

module.exports = { getClassQuestions, postQuestion, postAnswer, askAndSave };
