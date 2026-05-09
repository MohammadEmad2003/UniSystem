const asyncWrapper = require('../middleware/asyncWrapper');
const httpstatustext = require('../utilities/httpstatustext');
const db = require('../models/studyOutputModel');

/**
 * Build a deterministic cache key from tool options.
 * Sorted so {a:1,b:2} and {b:2,a:1} produce the same key.
 */
function buildOptionsKey(toolType, optionsObj) {
  const sorted = Object.keys(optionsObj)
    .sort()
    .map(k => `${k}=${optionsObj[k]}`)
    .join('|');
  return `${toolType}::${sorted}`;
}

// GET /api/classes/:classId/study-outputs?material_id=&tool_type=&options_key=
const getStudyOutput = asyncWrapper(async (req, res) => {
  const { classId } = req.params;
  const { material_id, tool_type, options_key } = req.query;
  const userId = req.currentUser.user_id;

  if (!material_id || !tool_type || !options_key) {
    return res.status(400).json({
      success: httpstatustext.error,
      message: { msg: 'material_id, tool_type, and options_key are required' },
    });
  }

  const row = await new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM StudyOutput
       WHERE Class_ID = ? AND Material_ID = ? AND User_ID = ?
         AND Tool_Type = ? AND Options_Key = ?`,
      [classId, material_id, userId, tool_type, options_key],
      (err, r) => { if (err) return reject(err); resolve(r || null); }
    );
  });

  if (!row) {
    return res.status(404).json({ success: httpstatustext.error, message: { msg: 'No saved output found' } });
  }

  console.log(
    `[STUDY_CACHE] hit classId=${classId} materialId=${material_id} userId=${userId} toolType=${tool_type}`
  );

  return res.json({
    success: httpstatustext.success,
    data: {
      output_id:    row.Output_ID,
      tool_type:    row.Tool_Type,
      options_key:  row.Options_Key,
      options:      JSON.parse(row.Options_JSON),
      content:      JSON.parse(row.Content_JSON),
      created_at:   row.Created_At,
      updated_at:   row.Updated_At,
    },
  });
});

// POST /api/classes/:classId/study-outputs
// Body: { material_id, tool_type, options, content }
const saveStudyOutput = asyncWrapper(async (req, res) => {
  const { classId } = req.params;
  const { material_id, tool_type, options = {}, content } = req.body;
  const userId = req.currentUser.user_id;

  if (!material_id || !tool_type || content === undefined) {
    return res.status(400).json({
      success: httpstatustext.error,
      message: { msg: 'material_id, tool_type, and content are required' },
    });
  }

  const optionsKey  = buildOptionsKey(tool_type, options);
  const optionsJson = JSON.stringify(options);
  const contentJson = JSON.stringify(content);
  const now         = new Date().toISOString();

  // Upsert: INSERT OR REPLACE preserves Output_ID on conflict via the UNIQUE index.
  // We use a manual check-then-update/insert to also update Updated_At correctly.
  const existing = await new Promise((resolve, reject) => {
    db.get(
      `SELECT Output_ID FROM StudyOutput
       WHERE Class_ID = ? AND Material_ID = ? AND User_ID = ? AND Tool_Type = ? AND Options_Key = ?`,
      [classId, material_id, userId, tool_type, optionsKey],
      (err, r) => { if (err) return reject(err); resolve(r || null); }
    );
  });

  if (existing) {
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE StudyOutput
         SET Options_JSON = ?, Content_JSON = ?, Updated_At = ?
         WHERE Output_ID = ?`,
        [optionsJson, contentJson, now, existing.Output_ID],
        (err) => { if (err) return reject(err); resolve(); }
      );
    });
    return res.json({
      success: httpstatustext.success,
      data: { output_id: existing.Output_ID, updated_at: now, created: false },
    });
  }

  const outputId = await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO StudyOutput
         (Class_ID, Material_ID, User_ID, Tool_Type, Options_Key, Options_JSON, Content_JSON, Created_At, Updated_At)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [classId, material_id, userId, tool_type, optionsKey, optionsJson, contentJson, now, now],
      function (err) { if (err) return reject(err); resolve(this.lastID); }
    );
  });

  return res.status(201).json({
    success: httpstatustext.success,
    data: { output_id: outputId, updated_at: now, created: true },
  });
});

// DELETE /api/classes/:classId/study-outputs?material_id=&tool_type=&options_key=
const deleteStudyOutput = asyncWrapper(async (req, res) => {
  const { classId } = req.params;
  const { material_id, tool_type, options_key } = req.query;
  const userId = req.currentUser.user_id;

  await new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM StudyOutput
       WHERE Class_ID = ? AND Material_ID = ? AND User_ID = ? AND Tool_Type = ? AND Options_Key = ?`,
      [classId, material_id, userId, tool_type, options_key],
      (err) => { if (err) return reject(err); resolve(); }
    );
  });

  return res.json({ success: httpstatustext.success, data: null });
});

module.exports = { getStudyOutput, saveStudyOutput, deleteStudyOutput, buildOptionsKey };
