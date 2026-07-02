const express = require('express');
const router = express.Router();
const allowedTo = require("../middleware/allowedTo");
const userRoles = require("../utilities/userRoles");
const {
  getAllClasses, getClassById, getClassesByDoctor,
  getClassesByStudent, createClass, deleteClass,
  getClassStudents, enrollStudent, dropStudent,
  getClassGrades, getStudentGrades, addGrade
} = require('../controllers/classController');
const verifyToken = require('../middleware/verifytoken');
const { getClassQuestions, postQuestion, askAndSave } = require('../controllers/discussionController');
const { getStudyOutput, saveStudyOutput, deleteStudyOutput } = require('../controllers/studyOutputController');
const { validators } = require('../middleware/validator');

router.use(verifyToken);

router.get('/', allowedTo(userRoles.ADMIN, userRoles.DOCTOR, userRoles.STUDENT), getAllClasses);
router.get('/doctor/:doctorId', getClassesByDoctor);
router.get('/student/:studentId', getClassesByStudent);
router.get('/:classId', validators.classId(), getClassById);
router.get('/:classId/students', allowedTo(userRoles.DOCTOR), validators.classId(), getClassStudents);
router.get('/:classId/questions' , allowedTo(userRoles.DOCTOR , userRoles.STUDENT), validators.classId(), getClassQuestions);
router.get('/:classId/grades', allowedTo(userRoles.DOCTOR), validators.classId(), getClassGrades);
router.get('/:classId/grades/student/:studentId', validators.classId(), validators.studentId(), getStudentGrades);
router.post('/', allowedTo(userRoles.ADMIN), validators.createClass(), createClass);
router.post('/:classId/enroll', validators.classId(), validators.enroll(), enrollStudent);
router.delete('/:classId/enroll/:studentId', validators.classId(), validators.studentId(), dropStudent);
router.post('/:classId/questions', allowedTo(userRoles.DOCTOR , userRoles.STUDENT), validators.classId(), postQuestion);
router.post('/:classId/ai/ask-and-save', allowedTo(userRoles.DOCTOR , userRoles.STUDENT), validators.classId(), askAndSave);
router.get('/:classId/study-outputs',    allowedTo(userRoles.DOCTOR , userRoles.STUDENT), validators.classId(), getStudyOutput);
router.post('/:classId/study-outputs',   allowedTo(userRoles.DOCTOR , userRoles.STUDENT), validators.classId(), saveStudyOutput);
router.delete('/:classId/study-outputs', allowedTo(userRoles.DOCTOR , userRoles.STUDENT), validators.classId(), deleteStudyOutput);
router.post('/:classId/grades', allowedTo(userRoles.DOCTOR), validators.classId(), validators.grade(), addGrade);
router.delete('/:classId', allowedTo(userRoles.ADMIN), validators.classId(), deleteClass);

module.exports = router;