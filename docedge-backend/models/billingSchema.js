const mongoose = require('mongoose');
 
const billingSchema = new mongoose.Schema({
    clinicSlug:     { type: String, required: true, index: true },
    patientId:      { type: String, required: true },
    appointmentId:  { type: String },
    patientName:    { type: String, required: true },
    mobile:         { type: String, required: true },
    isRevisit:      { type: Boolean, default: false },
    visitType:      { type: String, default: 'New' },
    invoiceNo:      { type: String, unique: true },
    appointmentFee: { type: Number, default: 0 },
    items: [{
        name:      { type: String, required: true },
        price:     { type: Number, required: true },
        qty:       { type: Number, default: 1 },
        isApptFee: { type: Boolean, default: false }
    }],
    subTotal:    { type: Number, required: true },
    discount:    { type: Number, default: 0 },
    grandTotal:  { type: Number, required: true },
    paidAmount:  { type: Number, default: 0 },
    dueAmount:   { type: Number, default: 0 },
    paymentMode: { type: String, enum: ['Cash', 'UPI', 'Card', 'Online'], default: 'Cash' },
    status:      { type: String, enum: ['Paid', 'Partially Paid', 'Unpaid', 'Refunded'], default: 'Paid' },
    billingDate: { type: Date, default: Date.now }
}, { timestamps: true });
 
module.exports = billingSchema;