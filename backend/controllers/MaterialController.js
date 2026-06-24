const db = require('../utilities/database'); 
const fs = require('fs'); 
const genericQueries = require('../utilities/genericQueries'); 
const asyncWrapper = require('../middleware/asyncWrapper');
const path = require('path');
const aiServiceClient = require('../services/aiServiceClient');

const materialModel = genericQueries('Material', { primaryKey: 'material_id' });

const createMaterial = asyncWrapper(async (req, res) => {
    // recived data from client
    const { classId } = req.params;
    const { name, lecture_id, type, summarize, url } = req.body;

    let finalDocument = null;
    let finalURL = null;

    if (type === 'link') {
        finalURL = url;       
        finalDocument = null; 
    } else {

        finalDocument = req.file ? req.file.path : null; 
        finalURL = null;      
    }

    const result = await materialModel.create({
        lec_id: lecture_id,
        name: name,
        url: finalURL,
        document: finalDocument,
        summarize: summarize,
        type: type 
    });

    try {
        await aiServiceClient.indexMaterial(result.lastID, {
            class_id: Number(classId)
        });
    } catch (error) {
        console.error(`[AI] Failed to index material ${result.lastID}: ${error.message}`);
    }

    // Async class re-index so new material is searchable by RAG
    aiServiceClient.triggerReindex(classId, 'material_upload');

    res.status(201).json({
        success: true,
        message: "Material created successfully",
        data: {
            material_id: result.lastID, 
            name: name,
            lecture_id: lecture_id,
            type: type,
            url: finalURL,
            document: req.file ? `/uploads/${req.file.filename}` : null,
            summarize: summarize,
            uploaded_at: new Date().toISOString()
        }
    });
});

const getMaterialsByClass = asyncWrapper(async (req, res) => {
    const { classId } = req.params;

  const query = `
        SELECT 
            m.material_id,
            m.lec_id AS lecture_id,
            l.class_id,
            m.name,
            m.url,
            m.document,
            m.type,
            m.summarize,
            m.uploaded_at,
            (u.f_name || ' ' || u.l_name) AS uploaded_by 
       FROM Material m
        LEFT JOIN Lecture l ON m.lec_id = l.lec_id
        LEFT JOIN Class c ON l.class_id = c.class_id
        LEFT JOIN "User" u ON c.doctor_id = u.user_id
        WHERE l.class_id = $1
    `;
    const result = await db.query(query, [classId]);
    const formattedRows = result.rows.map(row => ({
        ...row,
        document: row.document ? `http://localhost:3000/uploads/${path.basename(row.document)}` : null        }));

    res.status(200).json({
        success: true,
        data: formattedRows
    });
});

const getMaterialsByLectureID = asyncWrapper(async (req, res) => {
    const { lectureId } = req.params;

  
    const rows = await materialModel.getAllByField('lec_id', lectureId);

    if (!rows || rows.length === 0) {
        return res.status(200).json({ success: true, data: [], message: "No materials found for this lecture" });
    }

    const formattedRows = rows.map(row => ({
        material_id: row.material_id,
        lecture_id: row.lec_id,
        name: row.name,
        url: row.url,
        document: row.document ? `http://localhost:3000/uploads/${path.basename(row.document)}` : null,
        type: row.type,
        summarize: row.summarize
    }));

    res.status(200).json({
        success: true,
        data: formattedRows
    });
});

const deleteMaterial = asyncWrapper(async (req, res) => {
    const { materialId } = req.params;

    const material = await materialModel.getById(materialId);

    if (!material) {
        return res.status(404).json({ success: false, message: "Material not found" });
    }

    // Resolve classId before deleting so we can re-index afterwards
    const lectureResult = await db.query('SELECT class_id FROM Lecture WHERE lec_id = $1', [material.lec_id]);
    const classId = lectureResult.rows[0]?.class_id;

    const result = await materialModel.delete(materialId);

    if (material.document) {
        const filePath = material.document;

        const attemptDelete = (path, retries = 3) => {
            fs.unlink(path, (err) => {
            if (err && err.code === 'EBUSY' && retries > 0) {
                console.log(`[RETRY] File is busy, retrying... (${retries} left)`);                    setTimeout(() => attemptDelete(path, retries - 1), 1000);
          } else if (err) {
                console.error(`[ERROR] Delete failed: ${err.message}`);
          } else {
                console.log("[SUCCESS] File removed from storage successfully.");
            }
            });
        };

        attemptDelete(filePath);
    }

    // Re-index so deleted material is no longer searchable by RAG
    if (classId) {
        aiServiceClient.triggerReindex(classId, 'material_delete');
    }

    res.status(200).json({
        success: true,
        message: "Material deleted successfully"
    });
});
module.exports = { createMaterial ,  getMaterialsByClass , deleteMaterial , getMaterialsByLectureID};
