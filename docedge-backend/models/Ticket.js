const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    slug: { type: String, required: true }, // Clinic ki identity
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    subject: { type: String, required: true },
    category: { 
        type: String, 
        enum: ['Technical', 'Billing', 'Feature Request', 'Other'], 
        default: 'Technical' 
    },
    priority: { 
        type: String, 
        enum: ['Low', 'Medium', 'High'], 
        default: 'Medium' 
    },
    message: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['Open', 'In-Progress', 'Resolved', 'Closed'], 
        default: 'Open' 
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ticket', ticketSchema);