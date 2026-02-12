const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDirectory = path.join(__dirname, '..', 'uploads', 'profiles');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(uploadDirectory, { recursive: true });
    cb(null, uploadDirectory);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `avatar-${uniqueSuffix}${extension}`);
  },
});

const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']);

const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const isAllowedExtension = allowedExtensions.has(extension);
  const isImageMimeType = file.mimetype && file.mimetype.startsWith('image/');

  if (isAllowedExtension && isImageMimeType) {
    cb(null, true);
    return;
  }

  const error = new Error(
    'Only image files are allowed (.jpg, .jpeg, .png, .gif, .webp, .bmp)'
  );
  error.statusCode = 400;
  cb(error, false);
};

const profileUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
});

module.exports = profileUpload;
