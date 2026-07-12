// ─────────────────────────────────────────────────────────────────────────────
//  billingController.js  — full updated file
// ─────────────────────────────────────────────────────────────────────────────
const mongoose = require('mongoose');
const billingSchema = require('../models/billingSchema');
const Appointment = require('../models/Appointment');

// Utility: get dynamic billing model per clinic slug
const getBillingModel = (slug) => {
    const collectionName = `${slug}_billings`;
    return mongoose.models[collectionName]
        || mongoose.model(collectionName, billingSchema, collectionName);
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. SAVE INVOICE
//    Also marks the source appointment as isBilled = true so the
//    queue instantly reflects the updated billing status.
// ─────────────────────────────────────────────────────────────────────────────
exports.createInvoice = async (req, res) => {
    try {
        const { slug } = req.params;
        const Bill = getBillingModel(slug);

        const invoiceNo = `INV-${Math.floor(100_000 + Math.random() * 900_000)}`;

const { paidAmount, subTotal, discount = 0, isRevisit, appointmentId } = req.body;
const discountAmount = (Number(subTotal) * Number(discount)) / 100;
const grandTotal = Number(subTotal) - discountAmount;
        // Determine payment status
        let status = 'Paid';
        if (isRevisit) {
            status = 'Paid';
        } else if (paidAmount <= 0) {
            status = 'Unpaid';
        } else if (paidAmount < grandTotal) {
            status = 'Partially Paid';
        }

        const newInvoice = new Bill({
            ...req.body,
            email: req.body.email || '',   // ← ADD THIS explicitly
            clinicSlug: slug,
            invoiceNo,
            status,
dueAmount: Math.max(0, grandTotal - Number(paidAmount))

        });

        await newInvoice.save();

        // Mark the appointment as billed so the queue row updates immediately
        if (appointmentId) {
            await Appointment.findByIdAndUpdate(appointmentId, { isBilled: true });
        }

        res.status(201).json({
            success: true,
            message: 'Invoice generated and saved successfully',
            data: newInvoice
        });
    } catch (err) {
        console.error('createInvoice Error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET PATIENT BILLING HISTORY (by patientId) — always fresh, no cache
// ─────────────────────────────────────────────────────────────────────────────
exports.getBillingHistory = async (req, res) => {
    try {
        const { slug, patientId } = req.params;
        const Bill = getBillingModel(slug);

        const history = await Bill.find({ patientId }).sort({ createdAt: -1 });

        // Set no-cache headers so frontend always gets fresh data
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.set('Pragma', 'no-cache');

        res.status(200).json({ success: true, data: history });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. GET ALL BILLINGS  (history tab — paginated, latest first)
// ─────────────────────────────────────────────────────────────────────────────
exports.getAllBillings = async (req, res) => {
    try {
        const { slug } = req.params;
        const Bill = getBillingModel(slug);

        const { page = 1, limit = 50 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const [data, total] = await Promise.all([
            Bill.find({ clinicSlug: slug })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Bill.countDocuments({ clinicSlug: slug })
        ]);

        res.status(200).json({ success: true, data, total, page: Number(page) });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. GET SINGLE INVOICE BY ID (for re-downloading — always latest)
// ─────────────────────────────────────────────────────────────────────────────
exports.getInvoiceById = async (req, res) => {
    try {
        const { slug, invoiceId } = req.params;
        const Bill = getBillingModel(slug);

        const invoice = await Bill.findById(invoiceId);
        if (!invoice)
            return res.status(404).json({ success: false, message: 'Invoice not found' });

        // No-cache so download always pulls the latest updated version
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.set('Pragma', 'no-cache');

        res.status(200).json({ success: true, data: invoice });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. UPDATE INVOICE
//    - Recalculates grandTotal, dueAmount, and status from server side
//    - Returns the FULL updated invoice ({ new: true }) so frontend can
//      immediately use it for PDF generation without a second fetch.
//    - Sets no-cache headers so any subsequent fetch also gets fresh data.
// ─────────────────────────────────────────────────────────────────────────────
// BAAD MEIN (FIXED):
exports.update = async (req, res) => {
    try {
        const { slug, invoiceId } = req.params;
        const Bill = getBillingModel(slug);
        const { items, subTotal, paidAmount, paymentMode, discount, grandTotal, dueAmount } = req.body;

        const inv = await Bill.findById(invoiceId);
        if (!inv)
            return res.status(404).json({ success: false, message: 'Invoice not found' });

        // Frontend se calculated values seedha use karo
        const finalGrandTotal = grandTotal != null 
            ? Number(grandTotal) 
            : Number(subTotal) - (Number(subTotal) * Number(discount || 0) / 100);
        
        const finalDue = dueAmount != null 
            ? Number(dueAmount) 
            : Math.max(0, finalGrandTotal - Number(paidAmount));

        const status = finalDue <= 0 ? 'Paid'
            : Number(paidAmount) > 0 ? 'Partially Paid'
            : 'Unpaid';

        const updated = await Bill.findByIdAndUpdate(
            invoiceId,
            {
                $set: {
                    items: items || inv.items,        // ← items bhi update karo
                    subTotal: Number(subTotal) || inv.subTotal,
                    paidAmount: Number(paidAmount),
                    paymentMode,
                    discount: Number(discount || 0),
                    grandTotal: finalGrandTotal,
                    dueAmount: finalDue,
                    status
                }
            },
            { new: true }
        );

        res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.set('Pragma', 'no-cache');

        res.json({ success: true, data: updated });
    } catch (err) {
        console.error('update Error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};