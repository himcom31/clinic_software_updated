const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db.js');
require('dotenv').config();
const path = require('path');
const app = express();

// Connect DB
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/authRoutes.js'));  //medicines
app.use('/api/doctors', require('./routes/doctorRoutes.js'));
app.use('/api/clinic', require('./routes/clinicRoutes.js'));
app.use('/api/patients', require('./routes/patientRoutes.js'));
app.use('/api/appointments', require('./routes/appointmentRoutes.js'));
app.use('/api/medicines', require('./routes/medicineRoutes.js'));
app.use('/api/investigations', require('./routes/investigationRoutes.js'));
app.use('/api/advices', require('./routes/adviceRoutes.js'));
app.use('/api/billings', require('./routes/billingRoutes.js'));
app.use('/api/reports', require('./routes/reportRoutes.js'));
app.use('/api/staff', require('./routes/staffRoutes.js'));
app.use('/api/support', require('./routes/supportRoutes.js'));
app.use('/api/letterhead', require('./routes/letterheadRoutes.js'));
app.use('/api/prescriptions', require('./routes/prescriptionHendlaRouts.js'));
app.use('/api/symptoms', require('./routes/symptomRoutes.js')); // Symptoms ke liye route
app.use('/api/vaccination', require('./routes/vaccinationRoutes.js')); // Vaccination ke liye route
app.use('/api/p_reports', require('./routes/p_reportRoutes.js')); // Patient-specific reports ke liye route
app.use('/api/notifications', require('./routes/notificationRoutes.js')); // Patient-specific reports ke liye route
app.use('/api/whatsapp', require('./routes/whatsappRoutes.js')); // Patient-specific reports ke liye route


 







const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

