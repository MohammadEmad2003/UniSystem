const path = require("path");
const asyncWrapper = require("../middleware/asyncWrapper");
const db = require("../utilities/database");

const logSqlError = (label, err, query, params) => {
  console.error(`[AI][SQL] ${label} failed: ${err.message}`);
  console.error(`[AI][SQL] Query: ${query}`);
  console.error(`[AI][SQL] Params: ${JSON.stringify(params)}`);
};

const mapMaterialRow = (row) => {
  const documentPath = row.document || null;
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

const getQuestionAnswers = (questionId) =>
  new Promise((resolve, reject) => {
    db.all(
      `SELECT
        a.Answer_ID AS answer_id,
        a.Questions_ID AS question_id,
        a.Text AS answer_text,
        a.Time AS answer_time,
        a.Doctor_ID AS doctor_id,
        a.User_ID AS user_id
       FROM Answer a
       WHERE a.Questions_ID = ?
       ORDER BY
        CASE WHEN a.Doctor_ID IS NOT NULL THEN 0 ELSE 1 END,
        datetime(a.Time) DESC,
        a.Answer_ID DESC`,
      [questionId],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });

const getQuestionsForClass = (classId) =>
  new Promise((resolve, reject) => {
    db.all(
      `SELECT
        q.Questions_ID AS question_id,
        q.Class_ID AS class_id,
        q.Text AS question_text,
        q.User_ID AS user_id,
        q.Doctor_ID AS doctor_id
       FROM Questions q
       WHERE q.Class_ID = ?
       ORDER BY q.Questions_ID ASC`,
      [classId],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });

const getQuestionById = (questionId) =>
  new Promise((resolve, reject) => {
    db.get(
      `SELECT
        q.Questions_ID AS question_id,
        q.Class_ID AS class_id,
        q.Text AS question_text,
        q.User_ID AS user_id,
        q.Doctor_ID AS doctor_id
       FROM Questions q
       WHERE q.Questions_ID = ?`,
      [questionId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      }
    );
  });

const getMaterialsForClass = (classId) =>
  new Promise((resolve, reject) => {
    const query = `SELECT
        m.Material_ID AS material_id,
        l.Class_ID AS class_id,
        m.Lec_ID AS lecture_id,
        m.Name AS name,
        m.URL AS url,
        m.Document AS document,
        m.Summarize AS summarize
       FROM Material m
       INNER JOIN Lecture l ON l.Lec_ID = m.Lec_ID
       WHERE l.Class_ID = ?
       ORDER BY m.Material_ID ASC`;
    const params = [classId];

    db.all(
      query,
      params,
      (err, rows) => {
        if (err) {
          logSqlError("getMaterialsForClass", err, query, params);
          return reject(err);
        }
        resolve(rows || []);
      }
    );
  });

const getMaterialById = (materialId) =>
  new Promise((resolve, reject) => {
    const query = `SELECT
        m.Material_ID AS material_id,
        l.Class_ID AS class_id,
        m.Lec_ID AS lecture_id,
        m.Name AS name,
        m.URL AS url,
        m.Document AS document,
        m.Summarize AS summarize
       FROM Material m
       INNER JOIN Lecture l ON l.Lec_ID = m.Lec_ID
       WHERE m.Material_ID = ?`;
    const params = [materialId];

    db.get(
      query,
      params,
      (err, row) => {
        if (err) {
          logSqlError("getMaterialById", err, query, params);
          return reject(err);
        }
        resolve(row || null);
      }
    );
  });

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

module.exports = {
  getInternalClassQuestions,
  getInternalClassMaterials,
  getInternalQuestion,
  getInternalMaterial,
};
