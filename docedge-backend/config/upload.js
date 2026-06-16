const multer = require('multer');

// Memory storage -> file disk pe save nahi hota, buffer mein rehta hai,
// phir wahi buffer Cloudinary ko bheja jata hai.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Sirf PDF file allowed hai.'), false);
    }
};

const uploadPrescriptionPdf = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

module.exports = uploadPrescriptionPdf;