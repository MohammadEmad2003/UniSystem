const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage configuration for images
const imageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'unisystem/images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [
      { quality: 'auto', fetch_format: 'auto' }
    ]
  },
});

// Storage configuration for documents
const documentStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'unisystem/documents',
    resource_type: (req, file) => {
      return 'auto';
    },
    format: (req, file) => {
      const ext = path.extname(file.originalname).substring(1);
      return ext || 'raw';
    },
    public_id: (req, file) => {
      const ext = path.extname(file.originalname);
      const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
      return `${name}_${Date.now()}`;
    }
  },
});

// Storage configuration for materials
const materialStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'unisystem/materials',
    resource_type: (req, file) => {
      if (file.mimetype.startsWith('image/')) return 'image';
      return 'auto';
    },
    format: (req, file) => {
      const ext = path.extname(file.originalname).substring(1);
      return ext || 'raw';
    },
    public_id: (req, file) => {
      const ext = path.extname(file.originalname);
      const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
      return `${name}_${Date.now()}`;
    }
  },
});

// File filter for images
const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only images (JPG, PNG, GIF) are allowed'), false);
  }
};

// File filter for documents
const documentFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only documents (PDF, DOC, DOCX) are allowed'), false);
  }
};

// File filter for materials (images + documents)
const materialFilter = (req, file, cb) => {
  const imageTypes = ['image/jpeg', 'image/png', 'image/gif'];
  const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (imageTypes.includes(file.mimetype) || documentTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only images (JPG, PNG, GIF) and documents (PDF, DOC, DOCX) are allowed'), false);
  }
};

// Upload middleware for images
const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: imageFilter
});

// Upload middleware for documents
const uploadDocument = multer({
  storage: documentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: documentFilter
});

// Upload middleware for materials
const uploadMaterial = multer({
  storage: materialStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: materialFilter
});

// Upload middleware for profile images (single file)
const uploadProfileImage = uploadImage.single('image');

// Upload middleware for student documents (single file)
const uploadStudentDocument = uploadDocument.single('document');

// Upload middleware for materials (single file)
const uploadMaterialFile = uploadMaterial.single('document');

// Storage configuration for mixed profile uploads (image + document)
const profileMixedStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    if (file.fieldname === 'image') {
      return {
        folder: 'unisystem/images',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      };
    }
    // document
    // document
    const ext = path.extname(file.originalname);
    const extName = ext.substring(1) || 'raw';
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    
    return {
      folder: 'unisystem/documents',
      resource_type: 'auto',
      format: extName,
      public_id: `${baseName}_${Date.now()}`
    };
  },
});

// Upload middleware for multiple files (image + document) — stored directly on Cloudinary
const uploadProfileAndDocument = multer({
  storage: profileMixedStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const documentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (imageTypes.includes(file.mimetype) || documentTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images (JPG, PNG, GIF) and documents (PDF, DOC, DOCX) are allowed'), false);
    }
  },
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'document', maxCount: 1 },
]);

module.exports = {
  uploadImage,
  uploadDocument,
  uploadMaterial,
  uploadProfileImage,
  uploadStudentDocument,
  uploadMaterialFile,
  uploadProfileAndDocument
};
