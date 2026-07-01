const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload file to Cloudinary
 * @param {string} filePath - Path to the file to upload
 * @param {string} folder - Folder name in Cloudinary
 * @param {object} options - Additional upload options
 * @returns {Promise<object>} Upload result
 */
const uploadFile = async (filePath, folder = 'unisystem', options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'auto',
      ...options
    });
    return result;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

/**
 * Upload image to Cloudinary
 * @param {string} filePath - Path to the image file
 * @param {string} folder - Folder name in Cloudinary
 * @returns {Promise<object>} Upload result
 */
const uploadImage = async (filePath, folder = 'unisystem/images') => {
  return uploadFile(filePath, folder, {
    resource_type: 'image',
    transformation: [
      { quality: 'auto', fetch_format: 'auto' }
    ]
  });
};

/**
 * Upload document to Cloudinary
 * @param {string} filePath - Path to the document file
 * @param {string} folder - Folder name in Cloudinary
 * @returns {Promise<object>} Upload result
 */
const uploadDocument = async (filePath, folder = 'unisystem/documents') => {
  return uploadFile(filePath, folder, {
    resource_type: 'auto'
  });
};

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Public ID of the file to delete
 * @returns {Promise<object>} Delete result
 */
const deleteFile = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
};

/**
 * Get file URL from Cloudinary
 * @param {string} publicId - Public ID of the file
 * @param {object} options - Transformation options
 * @returns {string} File URL
 */
const getFileUrl = (publicId, options = {}) => {
  return cloudinary.url(publicId, options);
};

/**
 * Upload base64 image to Cloudinary
 * @param {string} base64Data - Base64 encoded image data
 * @param {object} options - Additional upload options
 * @returns {Promise<object>} Upload result
 */
const uploadBase64 = async (base64Data, options = {}) => {
  try {
    // Ensure base64Data is a valid string
    if (!base64Data || typeof base64Data !== 'string') {
      throw new Error('Invalid base64 data provided');
    }

    // Remove the public_id from options to avoid unsigned upload error
    // Cloudinary will auto-generate a unique public_id
    const { public_id, ...uploadOptions } = options;

    const result = await cloudinary.uploader.upload(base64Data, {
      resource_type: 'auto',
      ...uploadOptions
    });
    return result;
  } catch (error) {
    console.error('Cloudinary base64 upload error:', error);
    throw new Error(`Failed to upload base64 image: ${error.message}`);
  }
};

module.exports = {
  uploadFile,
  uploadImage,
  uploadDocument,
  deleteFile,
  getFileUrl,
  uploadBase64
};
