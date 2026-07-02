const path = require("path");
const asyncWrapper = require("../middleware/asyncWrapper");
const db = require("../utilities/database");
const axios = require("axios");



const AI_SERVICE_URL = (process.env.AI_SERVICE_URL || "http://localhost:9000").replace(/\/+$/, "");

const logSqlError = (label, err, query, params) => {
  console.error(`[AI][SQL] ${label} failed: ${err.message}`);
  console.error(`[AI][SQL] Query: ${query}`);
  console.error(`[AI][SQL] Params: ${JSON.stringify(params)}`);
};

const mapMaterialRow = (row) => {
  const documentPath = row.document || row.file_path || null;
  let absoluteDocumentPath = null;

  if (documentPath) {
    absoluteDocumentPath = path.isAbsolute(documentPath)
      ? documentPath
      : path.resolve(__dirname, "..", documentPath);
  }

  return {
    material_id: row.material_id,
    class_id: row.class_id,
    lecture_id: row.lecture_id,
    name: row.name,
    url: row.url,
    document: documentPath,
    absolute_document_path: absoluteDocumentPath,
    summarize: row.summarize,
    type: row.url ? "link" : documentPath ? "file" : null,
  };
};

const getQuestionAnswers = async (questionId) => {
  const result = await db.query(
      `SELECT
        a.answer_id,
        a.questions_id AS question_id,
        a.text AS answer_text,
        a.time AS answer_time,
        a.doctor_id,
        a.user_id,
        a.is_ai_generated,
        a.confidence,
        a.ai_metadata,
        a.source_type,
        COALESCE(u.f_name || ' ' || u.l_name, '') AS answered_by_name,
        CASE WHEN a.doctor_id IS NOT NULL THEN 'doctor' ELSE 'student' END AS answered_by_role
       FROM Answer a
       LEFT JOIN "User" u ON u.user_id = COALESCE(a.doctor_id, a.user_id)
       WHERE a.questions_id = $1
       ORDER BY
        CASE WHEN a.doctor_id IS NOT NULL THEN 0 ELSE 1 END,
        a.time DESC,
        a.answer_id DESC`,
      [questionId]
  );
  return result.rows || [];
};

const getQuestionsForClass = async (classId) => {
  const result = await db.query(
      `SELECT
        q.questions_id AS question_id,
        q.class_id,
        q.text AS question_text,
        q.user_id,
        q.doctor_id,
        COALESCE(u.f_name || ' ' || u.l_name, '') AS asked_by_name,
        CASE WHEN q.doctor_id IS NOT NULL THEN 'doctor' ELSE 'student' END AS asked_by_role
       FROM Questions q
       LEFT JOIN "User" u ON u.user_id = COALESCE(q.user_id, q.doctor_id)
       WHERE q.class_id = $1
       ORDER BY q.questions_id ASC`,
      [classId]
  );
  return result.rows || [];
};

const getQuestionById = async (questionId) => {
  const result = await db.query(
      `SELECT
        q.questions_id AS question_id,
        q.class_id,
        q.text AS question_text,
        q.user_id,
        q.doctor_id,
        COALESCE(u.f_name || ' ' || u.l_name, '') AS asked_by_name,
        CASE WHEN q.doctor_id IS NOT NULL THEN 'doctor' ELSE 'student' END AS asked_by_role
       FROM Questions q
       LEFT JOIN "User" u ON u.user_id = COALESCE(q.user_id, q.doctor_id)
       WHERE q.questions_id = $1`,
      [questionId]
  );
  return result.rows[0] || null;
};

const getMaterialsForClass = async (classId) => {
  const query = `SELECT
        m.material_id,
        l.class_id,
        m.lec_id AS lecture_id,
        m.name,
        m.url,
        m.document,
        m.file_path,
        m.summarize
       FROM Material m
       INNER JOIN Lecture l ON l.lec_id = m.lec_id
       WHERE l.class_id = $1
       ORDER BY m.material_id ASC`;
  const params = [classId];

  const result = await db.query(query, params);
  return result.rows || [];
};

const getMaterialById = async (materialId) => {
  const query = `SELECT
        m.material_id,
        l.class_id,
        m.lec_id AS lecture_id,
        m.name,
        m.url,
        m.document,
        m.file_path,
        m.summarize
       FROM Material m
       INNER JOIN Lecture l ON l.lec_id = m.lec_id
       WHERE m.material_id = $1`;
  const params = [materialId];

  const result = await db.query(query, params);
  return result.rows[0] || null;
};

const getInternalClassQuestions = asyncWrapper(async (req, res) => {
  const { classId } = req.params;
  const questions = await getQuestionsForClass(classId);

  const data = await Promise.all(
    questions.map(async (question) => ({
      ...question,
      answers: await getQuestionAnswers(question.question_id),
    }))
  );

  res.status(200).json({ success: true, data });
});

const getInternalClassMaterials = asyncWrapper(async (req, res) => {
  const { classId } = req.params;
  const materials = await getMaterialsForClass(classId);

  res.status(200).json({
    success: true,
    data: materials.map(mapMaterialRow),
  });
});

const getInternalQuestion = asyncWrapper(async (req, res) => {
  const { questionId } = req.params;
  const question = await getQuestionById(questionId);

  if (!question) {
    return res.status(404).json({
      success: false,
      message: "Question not found",
    });
  }

  res.status(200).json({
    success: true,
    data: {
      ...question,
      answers: await getQuestionAnswers(question.question_id),
    },
  });
});

const getInternalMaterial = asyncWrapper(async (req, res) => {
  const { materialId } = req.params;
  const material = await getMaterialById(materialId);

  if (!material) {
    return res.status(404).json({
      success: false,
      message: "Material not found",
    });
  }

  res.status(200).json({
    success: true,
    data: mapMaterialRow(material),
  });
});

// Index material in AI service (called after material is fetched)
const indexMaterialInAI = asyncWrapper(async (req, res) => {
  const { classId, materialId } = req.params;

  try {
    console.log(`[AI] Indexing material ${materialId} for class ${classId}...`);
    
    const response = await axios.post(
      `${AI_SERVICE_URL}/rag/index/material/${materialId}`,
      { class_id: classId, material_id: materialId },
      { timeout: 30000 }
    );

    console.log(`[AI] Material ${materialId} indexed successfully:`, response.data);

    return res.status(200).json({
      success: true,
      message: "Material indexed successfully",
      data: response.data,
    });
  } catch (error) {
    console.error(
      `[AI] Error indexing material ${materialId}:`,
      error.response?.data || error.message
    );

    // Return success even if indexing fails (material might not have documents)
    return res.status(200).json({
      success: true,
      message: "Index request sent to AI service",
      indexed: false,
    });
  }
});

module.exports = {
  getInternalClassQuestions,
  getInternalClassMaterials,
  getInternalQuestion,
  getInternalMaterial,
  indexMaterialInAI,
};
