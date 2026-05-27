const express = require('express');
const router = express.Router();
const { createDoctor, getAllDoctors,doctorLogin,updateDoctor } = require('../controllers/doctorController');
const {protect, isAdmin,protectD}=require("../middleware/authMiddleware")
//const { updateProfile, changePassword, updateSettings } = require('../controllers/doctorSettingsController');
const { 
    getDoctorProfile,
    updateDoctorProfile,
    changePassword,
    updateDoctorSettings,
    getDoctorProfile_doc
} = require('../controllers/doctorSettingsController');

// Ye routes SuperAdmin dashboard se hit honge
router.post('/create',protect,isAdmin, createDoctor);
router.get('/all',protect,isAdmin, getAllDoctors);
router.post('/login/:slug', doctorLogin);
router.put('/:id', protect, updateDoctor);   // ← NEW: Update doctor


/////////////////////////////
router.get('/:slug/profileDoc',protectD,getDoctorProfile_doc );

router.get('/:slug/profile', getDoctorProfile);
router.put('/:slug/profile/update', protectD, updateDoctorProfile);
router.put('/:slug/settings/update', protectD, updateDoctorSettings);
router.put('/:slug/change-password', protectD, changePassword);

module.exports = router;