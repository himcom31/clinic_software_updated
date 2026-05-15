const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { upsertClinicProfile,getClinicProfile1 } = require('../controllers/clinicController');
const { saveFormStructure, getFormStructure ,createTableCollection,
    getRows, addRow, updateRow, deleteRow
}= require('../controllers/formController')

// --- FOLDER AUTOMATION LOGIC ---
// Ye logic check karega ki folders hain ya nahi, nahi toh bana dega
const createUploadsFolders = () => {
    const folders = [
        path.join(__dirname, '../uploads/logos'),
        path.join(__dirname, '../uploads/signatures')
    ];

    folders.forEach(folder => {
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
            console.log(`✅ Folder Created: ${folder}`);
        }
    });
};

// Server start hote hi folders check honge
createUploadsFolders();

// --- MULTER STORAGE CONFIGURATION ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Absolute path use karna best practice hai
        let folderPath = '';
        if (file.fieldname === 'logo') {
            folderPath = path.join(__dirname, '../uploads/logos/');
        } else {
            folderPath = path.join(__dirname, '../uploads/signatures/');
        }
        cb(null, folderPath);
    },
    filename: (req, file, cb) => {
        // File name unique banane ke liye timestamp + original name
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

// File type filter (Optional: sirf images allow karne ke liye)
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Only Images (JPG, PNG, WEBP) are allowed!'));
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Multiple fields upload configuration
const cpUpload = upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'signature', maxCount: 1 }
]);

// --- ROUTE ---
// Frontend URL: /api/clinic/himanshu_clinics/update
router.post('/:slug/update', cpUpload, upsertClinicProfile);

router.post('/:slug/save-form',saveFormStructure)
router.get('/:slug/get-form',getFormStructure)
router.get('/:slug/clinicData',getClinicProfile1)
router.post('/:slug/create-table',   createTableCollection);   // ← NEW


router.get(   '/table/:collectionName/rows',        getRows);    // fetch all rows
router.post(  '/table/:collectionName/rows',        addRow);     // insert a row
router.put(   '/table/:collectionName/rows/:rowId', updateRow);  // edit a row
router.delete('/table/:collectionName/rows/:rowId', deleteRow);  // delete a row


//////////////////////////////////////////////////////////////////////////////////////////////



module.exports = router;