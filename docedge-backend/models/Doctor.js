const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  clinicName: { type: String, required: true },
  slug: { type: String, required: true, unique: true }, // e.g., 'apollo-clinic'
      password: { type: String, required: true },
      specialization: { type: String },
    profilePic: { type: String, default: "" },

    settings: {
        darkMode: { type: Boolean, default: false },
        language: { type: String, default: "en" },
        notifications: {
            emailAlerts: { type: Boolean, default: true },
            appointmentReminders: { type: Boolean, default: true }
        }
    },

  address: String,
  mobile: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Doctor', doctorSchema);