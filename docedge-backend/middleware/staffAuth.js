const jwt = require('jsonwebtoken');

exports.verifyStaff = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: "Unauthorized!" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Isme permissions aur slug hai
        next();
    } catch (err) { res.status(401).json({ message: "Invalid Token" }); }
};

// Permission Guard
exports.hasPermission = (perm) => {
    return (req, res, next) => {
        if (req.user.role === 'Doctor' || req.user.permissions[perm]) {
            next();
        } else {
            res.status(403).json({ message: "Doctor has not given you permission for this action!" });
        }
    };
};