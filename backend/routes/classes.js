const express = require('express');
const router = express.Router();
const {
  getAllClasses, getClassById, getClassesByDoctor,
  getClassesByStudent, createClass, deleteClass,
  getClassStudents, enrollStudent,
  getClassGrades, getStudentGrades, addGrade
} = require('../controllers/classController');
const verifyToken = require('../middleware/verifyToken');
const { getClassQuestions, postQuestion } = require('../controllers/discussionController');

router.use(verifyToken);

router.get('/', getAllClasses);
router.get('/doctor/:doctorId', getClassesByDoctor);
router.get('/student/:studentId', getClassesByStudent);
router.get('/:classId', getClassById);
router.get('/:classId/students', getClassStudents);
router.get('/:classId/questions', getClassQuestions);
router.get('/:classId/grades', getClassGrades);
router.get('/:classId/grades/student/:studentId', getStudentGrades);
router.post('/', createClass);
router.post('/:classId/enroll', enrollStudent);
router.post('/:classId/questions', postQuestion);
router.post('/:classId/grades', addGrade);
router.delete('/:classId', deleteClass);

module.exports = router;