const User = require('../models/SuperAdmin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
    // Role ko destructure kiya taaki hum verify kar sakein
    const { email, password, role } = req.body;

    try {
        // 1. User ko email aur role dono se find karein
        // Isse security badh jati hai (ki koi delivery boy admin panel mein login na kar sake)
        const user = await User.findOne({ email, role });
        
        if (!user) {
            return res.status(404).json({ 
                message: `User not found as ${role}. Please check your credentials.` 
            });
        }

        // 2. Password match karein
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid password" });
        }

        // 3. Token mein Role aur Name dono include karein (Frontend UI ke liye easy rehta hai)
        const token = jwt.sign(
            { id: user._id, role: user.role, name: user.name }, 
            process.env.JWT_SECRET, 
            { expiresIn: '3d' }
        );

        // 4. Response mein wahi data bhejein jo Frontend Dashboard par turant chahiye
        res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
               
               
            }
        });

    } catch (err) {
        console.error("Login Error:", err.message);
        res.status(500).json({ message: "Server Error", error: err.message });
    }
};