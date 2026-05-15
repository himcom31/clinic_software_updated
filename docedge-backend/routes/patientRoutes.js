const express = require('express');
const router = express.Router();
const {getPatientsByClinic,addPatient,updatePatient,deletePatient,getPatientProfile} = require('../controllers/patientController');

// Routes structure: /api/patients/himanshu-clinic/list
router.get('/:slug/list', getPatientsByClinic);
router.post('/:slug/add', addPatient);
//router.get('/:slug/profile/:id',getPatientProfile);
router.get('/:slug/profile/:id', getPatientProfile);
router.put('/:slug/update/:id',updatePatient );
router.delete('/:slug/delete/:id', getPatientProfile);

module.exports = router;