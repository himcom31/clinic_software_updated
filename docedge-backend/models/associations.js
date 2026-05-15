const Appointment  = require('./Appointment');
const Patient      = require('./PatientSchema');
const Prescription = require('./Prescription');

// Appointment <-> Patient
Appointment.belongsTo(Patient,      { foreignKey: 'patient_id', as: 'patientId' });
Patient.hasMany(Appointment,        { foreignKey: 'patient_id' });

// Appointment <-> Prescription  (one-to-many)
Appointment.hasMany(Prescription,   { foreignKey: 'appointment_id', as: 'prescriptions' });
Prescription.belongsTo(Appointment, { foreignKey: 'appointment_id' });

module.exports = { Appointment, Patient, Prescription };