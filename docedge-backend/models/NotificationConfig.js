// models/NotificationConfig.js
const mongoose = require('mongoose');

const notificationConfigSchema = new mongoose.Schema({
    clinicSlug: { type: String, required: true, unique: true },
    // SMS
    smsEnabled: { type: Boolean, default: false },
    smsProvider: { type: String, default: 'MSG91' },
    smsApiKey: { type: String },
    // WhatsApp (Meta Cloud API)
    waEnabled: { type: Boolean, default: false },
    waPhoneId: { type: String },
    waToken: { type: String },
    waTemplate: { type: String },
    // Email (SMTP)
    emailEnabled: { type: Boolean, default: false },
    emailHost: { type: String },
    emailPort: { type: Number, default: 587 },
    emailUser: { type: String },
    emailPass: { type: String },
    emailFrom: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('NotificationConfig', notificationConfigSchema);