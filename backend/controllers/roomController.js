const db = require('../utilities/database');
const asyncWrapper = require("../middleware/asyncWrapper");
const httpstatustext = require("../utilities/httpstatustext");

const createRoom = asyncWrapper(async (req, res) => {
    const { room_id, room_name, capacity, type, location } = req.body;

    if (!room_id || !room_name) {
        return res.status(400).json({ success: httpstatustext.error, message: "room_id and room_name are required" });
    }

    await new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO Room (Room_ID, Room_Name, Capacity, Type, Location) VALUES (?, ?, ?, ?, ?)`,
            [room_id, room_name, capacity, type, location],
            function (err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return reject(new Error("Room_ID already exists"));
                    }
                    return reject(err);
                }
                resolve();
            }
        );
    });

    res.status(201).json({
        success: httpstatustext.success,
        message: "Room created successfully",
        data: { room_id, room_name, capacity, type, location }
    });
});

const getAllRooms = asyncWrapper(async (req, res) => {
    const rooms = await new Promise((resolve, reject) => {
        db.all(`SELECT * FROM Room`, [], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });

    res.status(200).json({
        success: httpstatustext.success,
        data: rooms
    });
});

const getRoomById = asyncWrapper(async (req, res) => {
    const { id } = req.params;

    const room = await new Promise((resolve, reject) => {
        db.get(`SELECT * FROM Room WHERE Room_ID = ?`, [id], (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });

    if (!room) {
        return res.status(404).json({ success: httpstatustext.error, message: "Room not found" });
    }

    res.status(200).json({
        success: httpstatustext.success,
        data: room
    });
});

const updateRoom = asyncWrapper(async (req, res) => {
    const { id } = req.params;
    const { room_name, capacity, type, location } = req.body;

    const result = await new Promise((resolve, reject) => {
        db.run(
            `UPDATE Room SET Room_Name = COALESCE(?, Room_Name), Capacity = COALESCE(?, Capacity), Type = COALESCE(?, Type), Location = COALESCE(?, Location) WHERE Room_ID = ?`,
            [room_name, capacity, type, location, id],
            function (err) {
                if (err) return reject(err);
                resolve(this);
            }
        );
    });

    if (result.changes === 0) {
        return res.status(404).json({ success: httpstatustext.error, message: "Room not found" });
    }

    res.status(200).json({
        success: httpstatustext.success,
        message: "Room updated successfully"
    });
});

const deleteRoom = asyncWrapper(async (req, res) => {
    const { id } = req.params;

    const result = await new Promise((resolve, reject) => {
        db.run(`DELETE FROM Room WHERE Room_ID = ?`, [id], function (err) {
            if (err) return reject(err);
            resolve(this);
        });
    });

    if (result.changes === 0) {
        return res.status(404).json({ success: httpstatustext.error, message: "Room not found" });
    }

    res.status(200).json({
        success: httpstatustext.success,
        message: "Room deleted successfully"
    });
});

const getOccupiedRoomIds = async (date, time) => {
    return new Promise((resolve, reject) => {
        if (date && time) {
            // Check scheduled lectures for a specific date and time
            const query = `SELECT Room_ID FROM Lecture WHERE Date = ? AND Time = ? AND Type IN ('Lecture', 'Section', 'Lab')`;
            db.all(query, [date, time], (err, rows) => {
                if (err) return reject(err);
                const occupiedIds = rows.map(r => r.Room_ID).filter(id => id != null);
                resolve([...new Set(occupiedIds)]);
            });
        } else if (date) {
            // Check scheduled lectures for a specific date (occupied at ANY time that day)
            const query = `SELECT Room_ID FROM Lecture WHERE Date = ? AND Type IN ('Lecture', 'Section', 'Lab')`;
            db.all(query, [date], (err, rows) => {
                if (err) return reject(err);
                const occupiedIds = rows.map(r => r.Room_ID).filter(id => id != null);
                resolve([...new Set(occupiedIds)]);
            });
        } else {
            // Real-time check for currently running lectures
            db.all(`SELECT Room_ID, End_Time FROM Lecture WHERE Status = 'open' AND Type IN ('Lecture', 'Section', 'Lab')`, [], (err, rows) => {
                if (err) return reject(err);
                
                const occupiedIds = [];
                const now = new Date();
                
                for (let row of rows) {
                    if (!row.Room_ID) continue;
                    
                    if (!row.End_Time) {
                        occupiedIds.push(row.Room_ID);
                    } else {
                        const endTime = new Date(row.End_Time);
                        const diffMins = (now - endTime) / 60000;
                        if (diffMins < 15) {
                            occupiedIds.push(row.Room_ID);
                        }
                    }
                }
                resolve([...new Set(occupiedIds)]);
            });
        }
    });
};

const getEmptyRooms = asyncWrapper(async (req, res) => {
    const { date, time } = req.query;
    const occupiedRoomIds = await getOccupiedRoomIds(date, time);
    
    let query = `SELECT * FROM Room`;
    let params = [];
    
    if (occupiedRoomIds.length > 0) {
        const placeholders = occupiedRoomIds.map(() => '?').join(',');
        query += ` WHERE Room_ID NOT IN (${placeholders})`;
        params = occupiedRoomIds;
    }
    
    const emptyRooms = await new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
    
    res.status(200).json({
        success: httpstatustext.success,
        data: emptyRooms
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
    
    const placeholders = occupiedRoomIds.map(() => '?').join(',');
    const query = `SELECT * FROM Room WHERE Room_ID IN (${placeholders})`;
    
    const occupiedRooms = await new Promise((resolve, reject) => {
        db.all(query, occupiedRoomIds, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
    
    res.status(200).json({
        success: httpstatustext.success,
        data: occupiedRooms
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
