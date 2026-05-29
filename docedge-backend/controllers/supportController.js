const Ticket = require('../models/Ticket');
const sendSupportEmail = require('../utils/email'); // Email helper import karo

exports.raiseTicket = async (req, res) => {
    try {
        const { subject, category, priority, message } = req.body;
        const { slug } = req.params;

        // 1. Save to Database
        const newTicket = new Ticket({
            slug,
            doctorId: req.user._id,
            subject,
            category,
            priority,
            message
        });

        const savedTicket = await newTicket.save();

        // 2. 🔥 ADMIN NOTIFICATION (EMAIL) 🔥
        // Database mein save hone ke baad admin ko email bhej rahe hain
        try {
            await sendSupportEmail({
                id: savedTicket._id.toString().slice(-6),
                slug: slug,
                category: category,
                priority: priority,
                subject: subject,
                message: message
            });
        } catch (mailErr) {
        }

        res.status(201).json({ 
            success: true, 
            message: "Ticket raised and Admin notified!", 
            ticket: savedTicket 
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Doctor apne purane tickets dekh sake
exports.getMyTickets = async (req, res) => {
    try {
        const tickets = await Ticket.find({ slug: req.params.slug }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, tickets });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};