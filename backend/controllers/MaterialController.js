const db = require('../utilities/database'); 
const fs = require('fs'); 
const genericQueries = require('../utilities/genericQueries'); 
const asyncWrapper = require('../middleware/asyncWrapper');
const path = require('path');

const materialModel = genericQueries('Material', { primaryKey: 'Material_ID' });

const createMaterial = asyncWrapper(async (req, res) => {
    // recived data from client
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
        Lec_ID: lecture_id,
        Name: name,
        URL: finalURL,
        Document: finalDocument,
        Summarize: summarize,
        Type: type 
    });

    res.status(201).json({
        success: true,
        message: "Material created successfully",
        data: {
            id: result.lastID, 
            name: name,
            lecture_id: lecture_id,
            type: type,
            url: finalURL,
            document: req.file ? `/uploads/${req.file.filename}` : null,
            summarize: summarize
        }
    });
});

const getMaterialsByClass = asyncWrapper(async (req, res) => {
    const { classId } = req.params;

  const query = `
        SELECT 
            m.Material_ID AS material_id,
            m.Lec_ID AS lecture_id,
            l.Class_ID AS class_id,
            m.Name AS name,
            m.URL AS url,
            m.Document AS document,
            m.Type AS type,
            m.Summarize AS summarize,
            (u.F_Name || ' ' || u.L_Name) AS uploaded_by 
       FROM Material m
        LEFT JOIN Lecture l ON m.Lec_ID = l.Lec_ID
        LEFT JOIN Class c ON l.Class_ID = c.Class_ID
        LEFT JOIN User u ON c.Doctor_ID = u.User_ID
        WHERE l.Class_ID = ?
    `;
    db.all(query, [classId], (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }

        const formattedRows = rows.map(row => ({
            ...row,
            document: row.document ? `http://localhost:3000/uploads/${path.basename(row.document)}` : null        }));

        res.status(200).json({
            success: true,
            data: formattedRows
        });
    });
});

const getMaterialsByLectureID = asyncWrapper(async (req, res) => {
    const { lectureId } = req.params;

  
    const rows = await materialModel.getAllByField('Lec_ID', lectureId);

    if (!rows || rows.length === 0) {
        return res.status(200).json({ success: true, data: [], message: "No materials found for this lecture" });
    }

    const formattedRows = rows.map(row => ({
        material_id: row.Material_ID,
        lecture_id: row.Lec_ID,
        name: row.Name,
        url: row.URL,
        document: row.Document ? `http://localhost:3000/uploads/${path.basename(row.Document)}` : null,
        type: row.Type,
        summarize: row.Summarize
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

    const result = await materialModel.delete(materialId);

    if (result.changes > 0 && material.Document) {
        const filePath = material.Document;

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

    res.status(200).json({
        success: true,
        message: "Material deleted successfully"
    });
});
module.exports = { createMaterial ,  getMaterialsByClass , deleteMaterial , getMaterialsByLectureID};