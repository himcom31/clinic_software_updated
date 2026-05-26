const Doctor = require('../models/Doctor');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Top par import karein
const jwt = require('jsonwebtoken')

exports.createDoctor = async (req, res) => {
  try {
    const { name, email, clinicName, address, mobile, password } = req.body;

    // 1. Check if doctor already exists
    const existingDoctor = await Doctor.findOne({ email });
    if (existingDoctor) return res.status(400).json({ message: "Doctor already registered" });

    // 2. 🔥 UNIQUE SLUG GENERATION 🔥
    let slug = slugify(clinicName, { lower: true, strict: true });
    
    // Check if slug already exists (Same clinic name case)
    const slugExists = await Doctor.findOne({ slug });
    if (slugExists) {
      // Agar exists karta hai toh piche random string ya mobile ke last 4 digits laga do
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // 4. Save to MAIN Doctor Collection
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const newDoctor = new Doctor({
      name,
      email,
      clinicName,
      slug,
      address,
      mobile,
      password: hashedPassword
    });
    const savedDoctor = await newDoctor.save();

    // 5. 🔥 DYNAMIC COLLECTION CREATION (With Overwrite Protection) 🔥
    const clinicCollectionName = slug.replace(/-/g, "_"); 
    
    // Check if model already exists to avoid OverwriteModelError
    let DynamicModel;
    if (mongoose.models[clinicCollectionName]) {
      DynamicModel = mongoose.model(clinicCollectionName);
    } else {
      DynamicModel = mongoose.model(clinicCollectionName, new mongoose.Schema({}, { strict: false, timestamps: true }));
    }
    
    // Naye collection mein initial data insert karein
    await DynamicModel.create({
      message: `Database for ${clinicName} initialized`,
      ownerId: savedDoctor._id,
      setupDate: new Date()
    });

    // 6. Send Email Logic (Baki code same rahega...)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Welcome to DocEdge - ${clinicName}`,
      html: `
        <h1>Hello Dr. ${name},</h1>
        <p>Aapka clinic management portal setup is completed.</p>
        <p><b>Login URL:</b> https://docedge.tbskit.cloud/${slug}/login</p>
        <p><b>Username:</b> ${email}</p>
        <p><b>Password:</b> ${password}</p>
        <br>
        <p>Regards,<br>DocEdge Team</p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({
      message: `Doctor created and separate collection '${clinicCollectionName}' initialized!`,
      doctor: savedDoctor
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find();
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.doctorLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const { slug } = req.params; // URL se slug uthayega (e.g., /login/chaudhary-clinic)

        // 1. Check karein ki doctor exists karta hai ya nahi
        const doctor = await Doctor.findOne({ email });
        if (!doctor) {
            return res.status(404).json({ message: "Doctor not found with this email" });
        }

        // 2. Check karein ki ye doctor isi clinic (slug) ka hai ya nahi
        // Isse security badh jayegi, koi doosre clinic ke URL se login nahi kar payega
        if (doctor.slug !== slug) {
            return res.status(403).json({ message: "You are not authorized to access this clinic portal" });
        }

        // 3. Password Match karein (Bcrypt use karke)
        const isMatch = await bcrypt.compare(password, doctor.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid Secret Password" });
        }

        // 4. JWT Token Generate karein
        const token = jwt.sign(
            { id: doctor._id, slug: doctor.slug, role: 'doctor' },
            process.env.JWT_SECRET,
            { expiresIn: '5d' } // 1 din tak login rahega
        );

        res.status(200).json({
            message: "Login Successful",
            token,
            doctor: {
                id: doctor._id,
                name: doctor.name,
                clinicName: doctor.clinicName,
                slug: doctor.slug,
                email: doctor.email
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error during login" });
    }
};