const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');

router.post('/:slug/book', appointmentController.bookAppointment);
router.get('/:slug/live-queue', appointmentController.getLiveQueue);
router.put('/:slug/update-status/:id', appointmentController.updateAppointmentStatus);
router.put('/:slug/reschedule/:id', appointmentController.rescheduleAppointment);
router.get('/:slug/latest/:mobile', appointmentController.getLatestAppointment);
router.get('/:slug/full-history', appointmentController.getFullHistory);
router.get('/search-billing/:slug', appointmentController.searchAppointmentForBilling);
// Route: GET /api/appointments/:slug/find-first-visit
router.get('/:slug/check-status/:mobile', appointmentController.getPatientStatusAndLatest);
router.get('/:slug/all',            appointmentController.getAllAppointments);      // GET  /appointments/:slug/all
router.get('/:slug/:id/view',       appointmentController.viewAppointment);         // GET  /appointments/:slug/:id/view
router.get('/:slug/:id/fetch',      appointmentController.fetchAppointment);        // GET  /appointments/:slug/:id/fetch
router.put('/:slug/:id/edit',       appointmentController.editAppointment);         // PUT  /appointments/:slug/:id/edit
router.delete('/:slug/:id/delete',  appointmentController.deleteAppointment);       // DELETE /appointments/:slug/:id/delete
router.patch('/:slug/:id/payment',  appointmentController.updatePaymentStatus);     // PATCH /appointments/:slug/:id/payment
router.get('/:slug/revisit-payment/:mobile', appointmentController.getRevisitPaymentStatus);
// ✅ Add these — must be before /:slug/:id/view to avoid param conflicts
router.get('/:slug/today',   appointmentController.getByDate);   // no date = defaults to today
router.get('/:slug/by-date', appointmentController.getByDate);   // ?date=YYYY-MM-DD
router.get('/context/:appointmentId', appointmentController.getAppointmentContext);

////////////////////
router.get('/:slug/search-patients', appointmentController.searchPatients);
module.exports = router;