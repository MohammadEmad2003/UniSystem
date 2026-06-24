const httpstatustext = require('../utilities/httpstatustext');
const asyncWrapper = require('../middleware/asyncWrapper');
const db = require('../utilities/database');
const createNotification = require('../utilities/createNotification');
const aiServiceClient = require('../services/aiServiceClient');
const { triggerReindex } = aiServiceClient;

async function getAnswerRecord(questionId, answerId) {
  const result = await db.query(
      `SELECT
        a.answer_id, a.questions_id, a.text, a.time,
        COALESCE(a.user_id, a.doctor_id) AS user_id,
        CASE
          WHEN a.is_ai_generated = 1 THEN 'AI Assistant'
          ELSE COALESCE(u.f_name || ' ' || u.l_name, 'Unknown')
        END AS user_name,
        CASE
          WHEN a.is_ai_generated = 1 THEN 'ai'
          ELSE LOWER(COALESCE(u.role, 'student'))
        END AS user_role,
        a.is_ai_generated,
        a.source_type,
        a.source_id,
        a.confidence,
        a.ai_metadata
       FROM Answer a
       LEFT JOIN "User" u ON u.user_id = COALESCE(a.user_id, a.doctor_id)
       WHERE a.questions_id = $1 AND a.answer_id = $2`,
      [questionId, answerId]
  );
  return result.rows[0] || null;
}

// GET /classes/:classId/questions
const getClassQuestions = asyncWrapper(async (req, res) => {
  const { classId } = req.params;
  console.log("[GET_CLASS_QUESTIONS] classId =", classId);
  console.log(`[STREAM LOAD] Loading persisted discussion for classId=${classId}`);

  const questionsResult = await db.query(
      `SELECT 
        q.questions_id, q.class_id, q.text,
        COALESCE(q.user_id, q.doctor_id) AS user_id,
        COALESCE(u.f_name || ' ' || u.l_name, 'Unknown') AS user_name,
        LOWER(COALESCE(u.role, 'student')) AS user_role,
        u.image_url AS user_image,
        q.time
       FROM Questions q
       LEFT JOIN "User" u ON u.user_id = COALESCE(q.user_id, q.doctor_id)
       WHERE q.class_id = $1
       ORDER BY q.time ASC, q.questions_id ASC`,
      [classId]
  );
  const questions = questionsResult.rows || [];
  console.log("[GET_CLASS_QUESTIONS] rows =", questions.length);

  const questionsWithAnswers = await Promise.all(
    questions.map(async (q) => {
      const answersResult = await db.query(
          `SELECT
            a.answer_id, a.questions_id, a.text, a.time,
            COALESCE(a.user_id, a.doctor_id) AS user_id,
            CASE
              WHEN a.is_ai_generated = 1 THEN 'AI Assistant'
              ELSE COALESCE(u.f_name || ' ' || u.l_name, 'Unknown')
            END AS user_name,
            CASE
              WHEN a.is_ai_generated = 1 THEN 'ai'
              ELSE LOWER(COALESCE(u.role, 'student'))
            END AS user_role,
            a.is_ai_generated,
            a.source_type,
            a.source_id,
            a.confidence,
            a.ai_metadata
           FROM Answer a
           LEFT JOIN "User" u ON u.user_id = COALESCE(a.user_id, a.doctor_id)
           WHERE a.questions_id = $1
           ORDER BY a.time ASC, a.answer_id ASC`,
          [q.questions_id]
      );
      const answers = answersResult.rows || [];
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

  const result = await db.query(
      `INSERT INTO Questions (text, class_id, user_id, doctor_id, time) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING questions_id`,
      [text, classId, isDoctor ? null : userId, isDoctor ? userId : null]
  );
  const questionId = result.rows[0].questions_id;
  console.log(`[QUESTION SAVED] questionId=${questionId} classId=${classId} userId=${userId}`);

  // بعت notification لكل الـ students في الـ class
  const studentsResult = await db.query(
      `SELECT user_id FROM Enrollment WHERE class_id = $1`,
      [classId]
  );
  const students = studentsResult.rows || [];

  await Promise.all(
    students.map(s =>
      createNotification({
        userId: s.user_id,
        type: 'new_question',
        title: 'New Question Posted',
        message: `A new question was posted in your class`,
        classId: parseInt(classId),
        referenceId: questionId
      })
    )
  );

  // لو الـ student هو اللي سأل، بعت notification للـ doctor
  if (!isDoctor) {
    const classInfoResult = await db.query(
        `SELECT doctor_id FROM Class WHERE class_id = $1`,
        [classId]
    );
    const classInfo = classInfoResult.rows[0];

    if (classInfo?.doctor_id) {
      await createNotification({
        userId: classInfo.doctor_id,
        type: 'new_question',
        title: 'New Question from Student',
        message: `A student posted a new question in your class`,
        classId: parseInt(classId),
        referenceId: questionId
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

  const questionResult = await db.query(`SELECT * FROM Questions WHERE questions_id = $1`, [questionId]);
  const question = questionResult.rows[0];

  if (!question) {
    return res.status(404).json({ success: httpstatustext.error, message: { msg: 'Question not found' } });
  }

  const lastAnswerResult = await db.query(
      `SELECT MAX(answer_id) AS maxid FROM Answer WHERE questions_id = $1`,
      [questionId]
  );
  const lastAnswer = lastAnswerResult.rows[0];

  const newAnswerId = (lastAnswer?.maxid || 0) + 1;
  const isDoctor = role === 'Doctor';

  await db.query(
      `INSERT INTO Answer (answer_id, questions_id, text, user_id, doctor_id) VALUES ($1, $2, $3, $4, $5)`,
      [newAnswerId, questionId, text, isDoctor ? null : userId, isDoctor ? userId : null]
  );
  console.log(`[ANSWER SAVED] questionId=${questionId} answerId=${newAnswerId} userId=${userId}`);

  // Notify the question owner
  const questionOwnerId = question.user_id || question.doctor_id;
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
      classId: question.class_id,
      referenceId: parseInt(questionId),
      answerId: newAnswerId,
    }).catch(e => console.error('[notify] postAnswer notification failed:', e.message));
  }

  if (isDoctor) {
    try {
      await aiServiceClient.indexQuestion(questionId, {
        class_id: question.class_id
      });
    } catch (error) {
      console.error(`[AI] Failed to index answered question ${questionId}: ${error.message}`);
    }
    // Re-index full class so the new Q&A pair is searchable
    triggerReindex(question.class_id, 'doctor_answer');
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
  const questionResult = await db.query(
      `INSERT INTO Questions (text, class_id, user_id, doctor_id, time) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING questions_id`,
      [questionText, classId, isDoctor ? null : userId, isDoctor ? userId : null]
  );
  const questionId = questionResult.rows[0].questions_id;
  console.log(`[QUESTION SAVED] questionId=${questionId} classId=${classId} userId=${userId}`);

  // 3. Build the base question object used in all response branches below.
  const userResult = await db.query(`SELECT f_name, l_name, role FROM "User" WHERE user_id = $1`, [userId]);
  const userRow = userResult.rows[0] || { f_name: 'Unknown', l_name: '', role: role };

  const questionObj = {
    questions_id: questionId,
    class_id: Number(classId),
    text: questionText,
    user_id: userId,
    user_name: `${userRow.f_name} ${userRow.l_name}`.trim(),
    user_role: (userRow.role || role).toLowerCase(),
    time: new Date().toISOString(),
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
    const lastAnswerResult = await db.query(`SELECT MAX(answer_id) AS maxid FROM Answer WHERE questions_id = $1`, [questionId]);
    const lastAnswer = lastAnswerResult.rows[0];
    const answerId = (lastAnswer?.maxid || 0) + 1;

    const metadata = JSON.stringify({
      source_type: ragResult.source_type,
      confidence: ragResult.confidence,
      previous_question: ragResult.previous_question,
      previous_answer: ragResult.previous_answer,
      material_name: ragResult.material_name,
      page: ragResult.page,
      highlight: ragResult.highlight,
    });

    await db.query(
      `INSERT INTO Answer (answer_id, questions_id, text, user_id, doctor_id, is_ai_generated, source_type, source_id, confidence, ai_metadata)
         VALUES ($1, $2, $3, NULL, NULL, 1, $4, $5, $6, $7)`,
        [
          answerId,
          questionId,
          ragResult.answer,
          ragResult.source_type || null,
          String(ragResult.source_id || ragResult.previous_answer?.answer_id || ''),
          ragResult.confidence || null,
          metadata,
        ]
    );

    console.log(`[AI ANSWER SAVED] questionId=${questionId} answerId=${answerId} classId=${classId} source_type=${ragResult.source_type}`);

    // Re-index so future questions benefit from this Q&A pair
    aiServiceClient.indexQuestion(questionId, { class_id: Number(classId) })
      .catch(e => console.error('[ASK_AND_SAVE] re-index error:', e.message));
    triggerReindex(classId, 'ai_answer');

    questionObj.answers = [{
      answer_id: answerId,
      questions_id: questionId,
      text: ragResult.answer,
      time: new Date().toISOString(),
      user_id: null,
      user_name: 'AI Assistant',
      user_role: 'ai',
      is_ai_generated: 1,
      source_type: ragResult.source_type || null,
      source_id: String(ragResult.source_id || ''),
      confidence: ragResult.confidence || null,
      ai_metadata: metadata,
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
  const classInfoResult = await db.query(`SELECT doctor_id FROM Class WHERE class_id = $1`, [classId]);
  const classInfo = classInfoResult.rows[0];
  if (classInfo?.doctor_id && classInfo.doctor_id !== userId) {
    console.log(`[NOTIFICATION] doctor_question_pending classId=${classId} questionId=${questionId} doctorId=${classInfo.doctor_id}`);
    createNotification({
      userId: classInfo.doctor_id,
      type: 'doctor_question_pending',
      title: 'Student question needs your review',
      message: 'A student asked a question the AI could not answer. Tap to reply.',
      classId: Number(classId),
      referenceId: questionId,
    }).catch(e => console.error('[notify] doctor_question_pending failed:', e.message));
  } else if (classInfo?.doctor_id === userId) {
    console.log(`[NOTIFICATION] skipped self-notification for doctor_question_pending classId=${classId} questionId=${questionId} doctorId=${classInfo.doctor_id}`);
  }

  console.log(`[ASK_AND_SAVE] final response: status=sent_to_doctor answers=0`);
  return res.status(201).json({ success: true, data: { status: 'sent_to_doctor', question: questionObj } });
});

module.exports = { getClassQuestions, postQuestion, postAnswer, askAndSave };
