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

// Whitelist of permission keys that are allowed to be updated via the
// permissions-edit endpoint. Keeping this explicit stops a stray/garbage
// key in req.body from polluting the staff document.
const ALLOWED_PERMISSION_KEYS = [
    'canAddPatients',
    'canManageAppointments',
    'canCreateAppointment',
    'canViewAppointmentHistory',
    'canEditBilling',
    'canViewReports',
    'canAddPrescription',
    'canViewPrescriptionHistory',
    'canAddMedicine',
    'canAddTest',
    'canAddAdvice',
    'canDeleteData',
    'canManageInventory',
];

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

// 4. DOCTOR EDITS STAFF PERMISSIONS (after staff already created)
exports.updateStaffPermissions = async (req, res) => {
    try {
        const { slug, staffId } = req.params;
        const { permissions } = req.body;

        if (!permissions || typeof permissions !== 'object') {
            return res.status(400).json({ success: false, message: "permissions object is required" });
        }

        const Staff = getStaffModel(slug);
        const Log = getLogModel(slug);

        const staff = await Staff.findById(staffId);
        if (!staff) {
            return res.status(404).json({ success: false, message: "Staff not found in this clinic!" });
        }

        // Only touch whitelisted keys, ignore anything else sent in the body
        const updatedKeys = [];
        ALLOWED_PERMISSION_KEYS.forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(permissions, key)) {
                staff.permissions[key] = Boolean(permissions[key]);
                updatedKeys.push(key);
            }
        });

        if (updatedKeys.length === 0) {
            return res.status(400).json({ success: false, message: "No valid permission keys provided" });
        }

        await staff.save();

        // Log this action
        await Log.create({
            staffName: "Doctor (Admin)",
            staffRole: "Doctor",
            action: "PERMISSIONS_UPDATED",
            details: `Updated ${updatedKeys.length} permission(s) for ${staff.name}`
        });

        res.status(200).json({
            success: true,
            message: "Permissions updated successfully!",
            data: { _id: staff._id, permissions: staff.permissions }
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Permissions update karne mein problem hui",
            error: err.message
        });
    }
};

// 5. CHANGE STAFF PASSWORD (Doctor resets it)
exports.changeStaffPassword = async (req, res) => {
    try {
        const { slug, staffId } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ success: false, message: "Password kam se kam 6 characters ka hona chahiye!" });
        }

        const Staff = getStaffModel(slug);
        const Log = getLogModel(slug);

        const staff = await Staff.findById(staffId);
        if (!staff) return res.status(404).json({ success: false, message: "Staff not found!" });

        staff.password = await bcrypt.hash(newPassword, 10);
        await staff.save();

        await Log.create({
            staffName: "Doctor (Admin)",
            staffRole: "Doctor",
            action: "PASSWORD_CHANGED",
            details: `Password changed for ${staff.name}`
        });

        res.json({ success: true, message: "Password successfully updated!" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 6. DELETE STAFF
exports.deleteStaff = async (req, res) => {
    try {
        const { slug, staffId } = req.params;
        const Staff = getStaffModel(slug);
        const Log = getLogModel(slug);

        const staff = await Staff.findById(staffId);
        if (!staff) return res.status(404).json({ success: false, message: "Staff not found!" });

        const { name, role } = staff;
        await Staff.findByIdAndDelete(staffId);

        await Log.create({
            staffName: "Doctor (Admin)",
            staffRole: "Doctor",
            action: "STAFF_DELETED",
            details: `Deleted ${role}: ${name}`
        });

        res.json({ success: true, message: `${name} ko successfully delete kar diya!` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};