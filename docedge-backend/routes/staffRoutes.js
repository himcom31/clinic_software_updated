const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { verifyStaff, hasPermission } = require('../middleware/staffAuth');

// Doctor's Actions (Admin)
router.post('/:slug/add-staff', staffController.addStaff);
router.get('/:slug/activity-logs', staffController.getClinicLogs);

// Doctor edits an existing staff member's permissions
router.patch('/:slug/:staffId/permissions', staffController.updateStaffPermissions);

// Staff Login
router.post('/login', staffController.staffLogin);

// Doctor changes a staff member's password
router.patch('/:slug/:staffId/change-password', staffController.changeStaffPassword);

// Doctor deletes a staff member
router.delete('/:slug/:staffId', staffController.deleteStaff);

// Example Secure Route (Only if permission allowed)
router.get('/:slug/secret-reports', verifyStaff, hasPermission('canViewReports'), (req, res) => {
    res.json({ message: "You are allowed to see reports!" });
});

router.get('/:slug/list', staffController.getStaffList);
module.exports = router;