const Doctor = require('../models/Doctor');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.createDoctor = async (req, res) => {
  try {
    const { name, email, clinicName, address, mobile, password } = req.body;

    const existingDoctor = await Doctor.findOne({ email });
    if (existingDoctor) return res.status(400).json({ message: "Doctor already registered" });

    let slug = slugify(clinicName, { lower: true, strict: true });
    const slugExists = await Doctor.findOne({ slug });
    if (slugExists) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newDoctor = new Doctor({ name, email, clinicName, slug, address, mobile, password: hashedPassword });
    const savedDoctor = await newDoctor.save();

    const clinicCollectionName = slug.replace(/-/g, "_");
    let DynamicModel;
    if (mongoose.models[clinicCollectionName]) {
      DynamicModel = mongoose.model(clinicCollectionName);
    } else {
      DynamicModel = mongoose.model(clinicCollectionName, new mongoose.Schema({}, { strict: false, timestamps: true }));
    }
    await DynamicModel.create({
      message: `Database for ${clinicName} initialized`,
      ownerId: savedDoctor._id,
      setupDate: new Date()
    });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
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

// ─── UPDATE DOCTOR ────────────────────────────────────────────────────────────
// PUT /api/doctors/:id
// Allowed fields: name, email, mobile, address, password
// NOT allowed: clinicName, slug (locked permanently)

exports.updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;

    // Strip any attempt to change clinicName or slug (but keep for email)
    const { clinicName, slug, ...allowedUpdates } = req.body;

    // Save plain password BEFORE hashing (needed for email)
    const plainPassword = (allowedUpdates.password && allowedUpdates.password.trim() !== '')
      ? allowedUpdates.password.trim()
      : null;

    // Hash password if provided
    if (plainPassword) {
      const salt = await bcrypt.genSalt(10);
      allowedUpdates.password = await bcrypt.hash(plainPassword, salt);
    } else {
      delete allowedUpdates.password;
    }

    // Check for email conflict with another doctor
    if (allowedUpdates.email) {
      const conflict = await Doctor.findOne({ 
        email: allowedUpdates.email, 
        _id: { $ne: id } 
      });
      if (conflict) {
        return res.status(400).json({ 
          message: "This email is already in use by another doctor." 
        });
      }
    }

    const updatedDoctor = await Doctor.findByIdAndUpdate(
      id,
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    );

    if (!updatedDoctor) {
      return res.status(404).json({ message: "Doctor not found." });
    }

    // Only send email if email or password was actually changed
    if (plainPassword || allowedUpdates.email) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });

      const mailOptions = {
        from: `"No Reply - DocEdge" <${process.env.EMAIL_USER}>`,
        to: updatedDoctor.email,                  // ✅ from DB record
        subject: `DocEdge - Credentials Updated`,
        html: `
          <h1>Hello Dr. ${updatedDoctor.name},</h1>
          <p>Your clinic management portal credentials have been updated.</p>
          <p><b>Login URL:</b> https://docedge.tbskit.cloud/${updatedDoctor.slug}/login</p>
          <p><b>Updated Username:</b> ${updatedDoctor.email}</p>
          ${plainPassword 
            ? `<p><b>Updated Password:</b> ${plainPassword}</p>` 
            : '<p>Password was not changed.</p>'
          }
          <br>
          <p>Regards,<br>DocEdge Team</p>
        `
      };

      await transporter.sendMail(mailOptions);
    }

    res.status(200).json({
      message: "Doctor updated successfully.",
      doctor: updatedDoctor
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.doctorLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { slug } = req.params;

    const doctor = await Doctor.findOne({ email });
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found with this email" });
    }

    if (doctor.slug !== slug) {
      return res.status(403).json({ message: "You are not authorized to access this clinic portal" });
    }

    const isMatch = await bcrypt.compare(password, doctor.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid Secret Password" });
    }

    const token = jwt.sign(
      { id: doctor._id, slug: doctor.slug, role: 'doctor' },
      process.env.JWT_SECRET,
      { expiresIn: '5d' }
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