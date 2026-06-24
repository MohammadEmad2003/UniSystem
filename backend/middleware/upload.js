const multer = require('multer');
const path = require('path');

// Configure storage - use memory storage for Vercel compatibility
const storage = multer.memoryStorage();

// Custom file filter for multiple file types
const fileFilter = (req, file, cb) => {
  const imageTypes = ['image/jpeg', 'image/png', 'image/gif'];
  const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (file.fieldname === 'image') {
    if (imageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images (JPG, PNG, GIF) are allowed for profile picture'), false);
    }
  } else if (file.fieldname === 'document') {
    if (documentTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only documents (PDF, DOC, DOCX) are allowed'), false);
    }
  } else {
    cb(new Error('Unknown file field'), false);
  }
};

// Configure multer for multiple file uploads
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max size
  fileFilter: fileFilter
});

module.exports = upload;
