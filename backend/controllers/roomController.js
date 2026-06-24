const db = require('../utilities/database');
const asyncWrapper = require("../middleware/asyncWrapper");
const httpstatustext = require("../utilities/httpstatustext");

const createRoom = asyncWrapper(async (req, res) => {
    const { room_id, room_name, capacity, type, location } = req.body;

    if (!room_id || !room_name) {
        return res.status(400).json({ success: httpstatustext.error, message: "room_id and room_name are required" });
    }

    try {
        await db.query(
            `INSERT INTO Room (room_id, room_name, capacity, type, location) VALUES ($1, $2, $3, $4, $5)`,
            [room_id, room_name, capacity, type, location]
        );
    } catch (err) {
        if (err.message.includes('duplicate key')) {
            return res.status(400).json({ success: httpstatustext.error, message: "Room_ID already exists" });
        }
        throw err;
    }

    res.status(201).json({
        success: httpstatustext.success,
        message: "Room created successfully",
        data: { room_id, room_name, capacity, type, location }
    });
});

const getAllRooms = asyncWrapper(async (req, res) => {
    const result = await db.query(`SELECT * FROM Room`);
    res.status(200).json({
        success: httpstatustext.success,
        data: result.rows
    });
});

const getRoomById = asyncWrapper(async (req, res) => {
    const { id } = req.params;

    const result = await db.query(`SELECT * FROM Room WHERE room_id = $1`, [id]);

    if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ success: httpstatustext.error, message: "Room not found" });
    }

    res.status(200).json({
        success: httpstatustext.success,
        data: result.rows[0]
    });
});

const updateRoom = asyncWrapper(async (req, res) => {
    const { id } = req.params;
    const { room_name, capacity, type, location } = req.body;

    const result = await db.query(
        `UPDATE Room SET room_name = COALESCE($1, room_name), capacity = COALESCE($2, capacity), type = COALESCE($3, type), location = COALESCE($4, location) WHERE room_id = $5`,
        [room_name, capacity, type, location, id]
    );

    if (result.rowCount === 0) {
        return res.status(404).json({ success: httpstatustext.error, message: "Room not found" });
    }

    res.status(200).json({
        success: httpstatustext.success,
        message: "Room updated successfully"
    });
});

const deleteRoom = asyncWrapper(async (req, res) => {
    const { id } = req.params;

    const result = await db.query(`DELETE FROM Room WHERE room_id = $1`, [id]);

    if (result.rowCount === 0) {
        return res.status(404).json({ success: httpstatustext.error, message: "Room not found" });
    }

    res.status(200).json({
        success: httpstatustext.success,
        message: "Room deleted successfully"
    });
});

const getOccupiedRoomIds = async (date, time) => {
    if (date && time) {
        // Check scheduled lectures for a specific date and time
        const query = `SELECT room_id FROM Lecture WHERE date = $1 AND time = $2 AND type IN ('Lecture', 'Section', 'Lab')`;
        const result = await db.query(query, [date, time]);
        const occupiedIds = result.rows.map(r => r.room_id).filter(id => id != null);
        return [...new Set(occupiedIds)];
    } else if (date) {
        // Check scheduled lectures for a specific date (occupied at ANY time that day)
        const query = `SELECT room_id FROM Lecture WHERE date = $1 AND type IN ('Lecture', 'Section', 'Lab')`;
        const result = await db.query(query, [date]);
        const occupiedIds = result.rows.map(r => r.room_id).filter(id => id != null);
        return [...new Set(occupiedIds)];
    } else {
        // Real-time check for currently running lectures
        const result = await db.query(`SELECT room_id, end_time FROM Lecture WHERE status = 'open' AND type IN ('Lecture', 'Section', 'Lab')`);
        const occupiedIds = [];
        const now = new Date();
        
        for (let row of result.rows) {
            if (!row.room_id) continue;
            
            if (!row.end_time) {
                occupiedIds.push(row.room_id);
            } else {
                const endTime = new Date(row.end_time);
                const diffMins = (now - endTime) / 60000;
                if (diffMins < 15) {
                    occupiedIds.push(row.room_id);
                }
            }
        }
        return [...new Set(occupiedIds)];
    }
};

const getEmptyRooms = asyncWrapper(async (req, res) => {
    const { date, time } = req.query;
    const occupiedRoomIds = await getOccupiedRoomIds(date, time);
    
    let query = `SELECT * FROM Room`;
    let params = [];
    
    if (occupiedRoomIds.length > 0) {
        const placeholders = occupiedRoomIds.map((_, i) => `$${i + 1}`).join(',');
        query += ` WHERE room_id NOT IN (${placeholders})`;
        params = occupiedRoomIds;
    }
    
    const emptyRooms = await db.query(query, params);
    
    res.status(200).json({
        success: httpstatustext.success,
        data: emptyRooms.rows
    });
});

const getOccupiedRooms = asyncWrapper(async (req, res) => {
    const { date, time } = req.query;
    const occupiedRoomIds = await getOccupiedRoomIds(date, time);
    
    if (occupiedRoomIds.length === 0) {
        return res.status(200).json({
            success: httpstatustext.success,
            data: []
        });
    }
    
    const placeholders = occupiedRoomIds.map((_, i) => `$${i + 1}`).join(',');
    const query = `SELECT * FROM Room WHERE room_id IN (${placeholders})`;
    
    const occupiedRooms = await db.query(query, occupiedRoomIds);
    
    res.status(200).json({
        success: httpstatustext.success,
        data: occupiedRooms.rows
    });
});

module.exports = {
    createRoom,
    getAllRooms,
    getRoomById,
    updateRoom,
    deleteRoom,
    getEmptyRooms,
    getOccupiedRooms
};
