const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { staffSchema, logSchema } = require('../models/staffSchemas');

// Dynamic Model Helpers
const getStaffModel = (slug) => {
    const collectionName = `${slug}_staffs`;
    return mongoose.models[collectionName] || mongoose.model(collectionName, staffSchema, collectionName);
};

const getLogModel = (slug) => {
    const collectionName = `${slug}_activity_logs`;
    return mongoose.models[collectionName] || mongoose.model(collectionName, logSchema, collectionName);
};

// 1. DOCTOR ADDS STAFF
exports.addStaff = async (req, res) => {
    try {
        const { slug } = req.params; // Doctor's clinic slug
        const { name, email, password, role, permissions } = req.body;
        
        const Staff = getStaffModel(slug);
        const Log = getLogModel(slug);

        const exists = await Staff.findOne({ email });
        if (exists) return res.status(400).json({ success: false, message: "Staff email already exists!" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newStaff = await Staff.create({
            name, email, password: hashedPassword, role, permissions, clinicSlug: slug
        });

        // Log this action
        await Log.create({
            staffName: "Doctor (Admin)",
            staffRole: "Doctor",
            action: "STAFF_CREATED",
            details: `Created ${role}: ${name}`
        });

        res.status(201).json({ success: true, message: `${role} added successfully!` });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// 2. STAFF LOGIN (Credentials Check)
exports.staffLogin = async (req, res) => {
    try {
        const { slug, email, password } = req.body;
        const Staff = getStaffModel(slug);

        const staff = await Staff.findOne({ email });
        if (!staff) return res.status(404).json({ message: "Staff not found in this clinic!" });

        const isMatch = await bcrypt.compare(password, staff.password);
        if (!isMatch) return res.status(400).json({ message: "Wrong Password!" });

        // Generate Token with Permissions
        const token = jwt.sign(
            { id: staff._id, role: staff.role, slug: slug, permissions: staff.permissions },
            process.env.JWT_SECRET,
            { expiresIn: '12h' }
        );

        res.json({ 
        success: true, 
        token, 
        staff: { 
            name: staff.name, 
            role: staff.role, 
            clinicSlug: slug,
            permissions: staff.permissions // 👈 Ye line confirm karo
        } 
    })
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// 3. GET ACTIVITY LOGS (For Doctor to see)
exports.getClinicLogs = async (req, res) => {
    try {
        const { slug } = req.params;
        const Log = getLogModel(slug);
        const logs = await Log.find().sort({ timestamp: -1 }).limit(100);
        res.json({ success: true, data: logs });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getStaffList = async (req, res) => {
    try {
        const { slug } = req.params; // URL se slug milega (e.g., himanshu-clinic)
        
        const Staff = getStaffModel(slug);

        // Saare staff dhoondo par "password" mat bhejna (Security ke liye)
        const list = await Staff.find({})
            .select('-password') 
            .sort({ createdAt: -1 }); // Naya staff pehle dikhega

        res.status(200).json({
            success: true,
            count: list.length,
            data: list
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            message: "Staff list fetch karne mein problem hui",
            error: err.message 
        });
    }
};