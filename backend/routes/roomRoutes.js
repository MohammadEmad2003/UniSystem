const express = require('express');
const router = express.Router();

const roomController = require('../controllers/roomController');

// Standard CRUD
router.post('/', roomController.createRoom);
router.get('/', roomController.getAllRooms);
router.get('/empty', roomController.getEmptyRooms);
router.get('/occupied', roomController.getOccupiedRooms);
router.get('/:id', roomController.getRoomById);
router.put('/:id', roomController.updateRoom);
router.delete('/:id', roomController.deleteRoom);

module.exports = router;
