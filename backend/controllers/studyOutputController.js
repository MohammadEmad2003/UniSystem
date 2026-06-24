const asyncWrapper = require('../middleware/asyncWrapper');
const httpstatustext = require('../utilities/httpstatustext');
const db = require('../utilities/database');

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

  const result = await db.query(
    `SELECT * FROM StudyOutput
     WHERE class_id = $1 AND material_id = $2 AND user_id = $3
       AND tool_type = $4 AND options_key = $5`,
    [classId, material_id, userId, tool_type, options_key]
  );

  if (!result.rows || result.rows.length === 0) {
    return res.status(404).json({ success: httpstatustext.error, message: { msg: 'No saved output found' } });
  }

  const row = result.rows[0];

  console.log(
    `[STUDY_CACHE] hit classId=${classId} materialId=${material_id} userId=${userId} toolType=${tool_type}`
  );

  return res.json({
    success: httpstatustext.success,
    data: {
      output_id:    row.output_id,
      tool_type:    row.tool_type,
      options_key:  row.options_key,
      options:      typeof row.options_json === 'string' ? JSON.parse(row.options_json) : row.options_json,
      content:      typeof row.content_json === 'string' ? JSON.parse(row.content_json) : row.content_json,
      created_at:   row.created_at,
      updated_at:   row.updated_at,
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
  const existing = await db.query(
    `SELECT output_id FROM StudyOutput
     WHERE class_id = $1 AND material_id = $2 AND user_id = $3 AND tool_type = $4 AND options_key = $5`,
    [classId, material_id, userId, tool_type, optionsKey]
  );

  if (existing.rows && existing.rows.length > 0) {
    await db.query(
      `UPDATE StudyOutput
       SET options_json = $1, content_json = $2, updated_at = $3
       WHERE output_id = $4`,
      [optionsJson, contentJson, now, existing.rows[0].output_id]
    );
    return res.json({
      success: httpstatustext.success,
      data: { output_id: existing.rows[0].output_id, updated_at: now, created: false },
    });
  }

  const result = await db.query(
    `INSERT INTO StudyOutput
       (class_id, material_id, user_id, tool_type, options_key, options_json, content_json, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING output_id`,
    [classId, material_id, userId, tool_type, optionsKey, optionsJson, contentJson, now, now]
  );

  return res.status(201).json({
    success: httpstatustext.success,
    data: { output_id: result.rows[0].output_id, updated_at: now, created: true },
  });
});

// DELETE /api/classes/:classId/study-outputs?material_id=&tool_type=&options_key=
const deleteStudyOutput = asyncWrapper(async (req, res) => {
  const { classId } = req.params;
  const { material_id, tool_type, options_key } = req.query;
  const userId = req.currentUser.user_id;

  await db.query(
    `DELETE FROM StudyOutput
     WHERE class_id = $1 AND material_id = $2 AND user_id = $3 AND tool_type = $4 AND options_key = $5`,
    [classId, material_id, userId, tool_type, options_key]
  );

  return res.json({ success: httpstatustext.success, data: null });
});

module.exports = { getStudyOutput, saveStudyOutput, deleteStudyOutput, buildOptionsKey };
