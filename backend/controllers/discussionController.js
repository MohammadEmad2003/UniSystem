const httpstatustext = require('../utilities/httpstatustext');
const asyncWrapper = require('../middleware/asyncWrapper');
const db = require('../utilities/database');
const createNotification = require('../utilities/createNotification');
const aiServiceClient = require('../services/aiServiceClient');
const { triggerReindex } = aiServiceClient;

function getAnswerRecord(questionId, answerId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT
        a.Answer_ID, a.Questions_ID, a.Text, a.Time,
        COALESCE(a.User_ID, a.Doctor_ID) AS User_ID,
        CASE
          WHEN a.Is_AI_Generated = 1 THEN 'AI Assistant'
          ELSE COALESCE(u.F_Name || ' ' || u.L_Name, 'Unknown')
        END AS User_Name,
        CASE
          WHEN a.Is_AI_Generated = 1 THEN 'ai'
          ELSE LOWER(COALESCE(u.Role, 'student'))
        END AS User_Role,
        a.Is_AI_Generated,
        a.Source_Type,
        a.Source_ID,
        a.Confidence,
        a.AI_Metadata
       FROM Answer a
       LEFT JOIN User u ON u.User_ID = COALESCE(a.User_ID, a.Doctor_ID)
       WHERE a.Questions_ID = ? AND a.Answer_ID = ?`,
      [questionId, answerId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      }
    );
  });
}

// GET /classes/:classId/questions
const getClassQuestions = asyncWrapper(async (req, res) => {
  const { classId } = req.params;
  console.log("[GET_CLASS_QUESTIONS] classId =", classId);
  console.log(`[STREAM LOAD] Loading persisted discussion for classId=${classId}`);

  const questions = await new Promise((resolve, reject) => {
    db.all(
      `SELECT 
        q.Questions_ID, q.Class_ID, q.Text,
        COALESCE(q.User_ID, q.Doctor_ID) AS User_ID,
        COALESCE(u.F_Name || ' ' || u.L_Name, 'Unknown') AS User_Name,
        LOWER(COALESCE(u.Role, 'student')) AS User_Role,
        u.Image_Url AS User_Image,
        q.Time
       FROM Questions q
       LEFT JOIN User u ON u.User_ID = COALESCE(q.User_ID, q.Doctor_ID)
       WHERE q.Class_ID = ?
       ORDER BY q.Time ASC, q.Questions_ID ASC`,
      [classId],
      (err, rows) => {
        if (err) return reject(err);
        console.log("[GET_CLASS_QUESTIONS] rows =", (rows || []).length);
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
              ELSE COALESCE(u.F_Name || ' ' || u.L_Name, 'Unknown')
            END AS User_Name,
            CASE
              WHEN a.Is_AI_Generated = 1 THEN 'ai'
              ELSE LOWER(COALESCE(u.Role, 'student'))
            END AS User_Role,
            a.Is_AI_Generated,
            a.Source_Type,
            a.Source_ID,
            a.Confidence,
            a.AI_Metadata
           FROM Answer a
           LEFT JOIN User u ON u.User_ID = COALESCE(a.User_ID, a.Doctor_ID)
           WHERE a.Questions_ID = ?
           ORDER BY a.Time ASC, a.Answer_ID ASC`,
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

  const answerCount = questionsWithAnswers.reduce((sum, q) => sum + (q.answers?.length || 0), 0);
  console.log(`[GET_CLASS_QUESTIONS] answers = ${answerCount}`);
  console.log("[GET_CLASS_QUESTIONS] sample =", questionsWithAnswers[0] || null);
  console.log(`[STREAM LOAD] Loaded ${questionsWithAnswers.length} persisted questions for classId=${classId}`);
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
  console.log(`[STREAM SAVE] Saving class question for classId=${classId} userId=${userId} role=${role}`);

  const result = await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO Questions (Text, Class_ID, User_ID, Doctor_ID, Time) VALUES (?, ?, ?, ?, datetime('now'))`,
      [text, classId, isDoctor ? null : userId, isDoctor ? userId : null],
      function (err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID });
      }
    );
  });
  console.log(`[QUESTION SAVED] questionId=${result.lastID} classId=${classId} userId=${userId}`);

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
  console.log(`[STREAM SAVE] Saving answer for questionId=${questionId} userId=${userId} role=${role}`);

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
  console.log(`[ANSWER SAVED] questionId=${questionId} answerId=${newAnswerId} userId=${userId}`);

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

  const savedAnswer = await getAnswerRecord(questionId, newAnswerId);

  res.status(201).json({
    success: httpstatustext.success,
    message: { msg: 'Answer posted successfully' },
    data: savedAnswer,
  });
});

// POST /classes/:classId/ai/ask-and-save
// Calls RAG, saves question + AI answer, returns both so frontend can insert into stream
const askAndSave = asyncWrapper(async (req, res) => {
  const { classId } = req.params;
  const { text } = req.body;
  const userId = req.currentUser.user_id;
  const role = req.currentUser.role;

  console.log(`[STREAM SAVE] Saving AI-routed question for classId=${classId} userId=${userId} role=${role} text="${String(text || '').slice(0, 80)}"`);

  if (!text || !String(text).trim()) {
    return res.status(400).json({ success: httpstatustext.error, message: { msg: 'text is required' } });
  }

  const questionText = String(text).trim();
  const isDoctor = role === 'Doctor';

  // 1. Call RAG AI first — greeting/casual inputs are intercepted here without any DB write.
  let ragResult = null;
  const aiPayload = { class_id: Number(classId), user_id: userId, question: questionText };
  console.log(`[ASK_AND_SAVE] calling AI service  url=${process.env.AI_SERVICE_URL || 'http://127.0.0.1:9000'}  payload=${JSON.stringify(aiPayload)}`);
  try {
    ragResult = await aiServiceClient.askQuestion(aiPayload);
    console.log(`[ASK_AND_SAVE] ai response: status=${ragResult?.status} source_type=${ragResult?.source_type} answer="${String(ragResult?.answer||'').slice(0,100)}" confidence=${ragResult?.confidence}`);
  } catch (e) {
    console.error('[ASK_AND_SAVE] RAG call failed:', {
      message: e.message,
      statusCode: e.statusCode,
      stack: e.stack?.split('\n')[1]?.trim(),
    });
  }

  // 2. Save the question to DB — always, for every real message.
  const questionId = await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO Questions (Text, Class_ID, User_ID, Doctor_ID, Time) VALUES (?, ?, ?, ?, datetime('now'))`,
      [questionText, classId, isDoctor ? null : userId, isDoctor ? userId : null],
      function (err) { if (err) return reject(err); resolve(this.lastID); }
    );
  });
  console.log(`[QUESTION SAVED] questionId=${questionId} classId=${classId} userId=${userId}`);

  // 3. Build the base question object used in all response branches below.
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

  // 4. AI answered from class materials or previous Q&A → persist the answer.
  //    Only source_type values of "material" or "previous_qa" are stored.
  //    Any other answered status without a recognised source_type falls through to doctor.
  const isKnowledgeAnswer = (
    ragResult?.status === 'answered' &&
    ragResult?.answer &&
    (ragResult?.source_type === 'material' || ragResult?.source_type === 'previous_qa')
  );

  if (isKnowledgeAnswer) {
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
      highlight: ragResult.highlight,
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

    console.log(`[AI ANSWER SAVED] questionId=${questionId} answerId=${answerId} classId=${classId} source_type=${ragResult.source_type}`);

    // Re-index so future questions benefit from this Q&A pair
    aiServiceClient.indexQuestion(questionId, { class_id: Number(classId) })
      .catch(e => console.error('[ASK_AND_SAVE] re-index error:', e.message));
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

    console.log(`[NOTIFICATION] skipped because AI answered classId=${classId} questionId=${questionId}`);
    if (!isDoctor) {
      createNotification({
        userId,
        type: 'ai_answer_ready',
        title: 'AI answered your question',
        message: 'The AI assistant has answered your question. Tap to view.',
        classId: Number(classId),
        referenceId: questionId,
        answerId,
      }).catch(e => console.error('[notify] ai_answer_ready failed:', e.message));
    }

    console.log(`[ASK_AND_SAVE] final response: status=answered source_type=${ragResult.source_type} answers=1`);
    return res.status(201).json({ success: true, data: { status: 'answered', question: questionObj } });
  }

  // 5. No usable answer (sent_to_doctor, no material match, generation failed, or unknown source).
  //    Question is already saved; notify the doctor to reply.
  const classInfo = await new Promise((resolve, reject) => {
    db.get(`SELECT Doctor_ID FROM Class WHERE Class_ID = ?`, [classId], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
  if (classInfo?.Doctor_ID && classInfo.Doctor_ID !== userId) {
    console.log(`[NOTIFICATION] doctor_question_pending classId=${classId} questionId=${questionId} doctorId=${classInfo.Doctor_ID}`);
    createNotification({
      userId: classInfo.Doctor_ID,
      type: 'doctor_question_pending',
      title: 'Student question needs your review',
      message: 'A student asked a question the AI could not answer. Tap to reply.',
      classId: Number(classId),
      referenceId: questionId,
    }).catch(e => console.error('[notify] doctor_question_pending failed:', e.message));
  } else if (classInfo?.Doctor_ID === userId) {
    console.log(`[NOTIFICATION] skipped self-notification for doctor_question_pending classId=${classId} questionId=${questionId} doctorId=${classInfo.Doctor_ID}`);
  }

  console.log(`[ASK_AND_SAVE] final response: status=sent_to_doctor answers=0`);
  return res.status(201).json({ success: true, data: { status: 'sent_to_doctor', question: questionObj } });
});

module.exports = { getClassQuestions, postQuestion, postAnswer, askAndSave };
