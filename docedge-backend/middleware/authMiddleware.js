const jwt = require('jsonwebtoken');
const Admin = require('../models/SuperAdmin'); // Admin model import kiya
//const User = require('../models/User');   // Customer model (agar hai toh)
const Doctor = require('../models/Doctor');


const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            // 1. Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 2. Role-based User Fetching
            // Check karein ki token mein role 'admin' hai ya 'user'
            if (decoded.role === 'admin') {
                req.user = await Admin.findById(decoded.id).select('-password');
            } else {
                req.user = await User.findById(decoded.id).select('-password');
            }

            if (!req.user) {
                return res.status(401).json({ message: 'User not found' });
            }

            next();
        } catch (error) {
            console.error('Token Error:', error.message);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// Admin specific access middleware
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied: Admin only' });
    }
};

// Delivery Boy specific access middleware (Naya update)
// const isDeliveryBoy = (req, res, next) => {
    // if (req.user && req.user.role === 'delivery') {
        // next();
    // } else {
        // res.status(403).json({ message: 'Access denied: Delivery Partner only' });
    // }
// };





const protectD = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // 1. Get token from header
            token = req.headers.authorization.split(' ')[1];

            // 2. Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 3. Find user and attach to request object
            // YAHAN Galti hoti hai: 'req.user' hi set karna hai
            req.user = await Doctor.findById(decoded.id).select('-password');

            next();
        } catch (error) {
            res.status(401).json({ success: false, message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }
};

module.exports = { protect, isAdmin, protectD };