const nodemailer = require('nodemailer');

const sendSupportEmail = async (options) => {
    // 1. Transporter banao (Gmail ya SendGrid)
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER, // Aapka email
            pass: process.env.EMAIL_PASS  // Aapka App Password
        }
    });

    // 2. Email details set karo
    const mailOptions = {
        from: `DocEdge Support <${process.env.EMAIL_USER}>`,
        to: 'himanshurchaudhary499@gmail.com', // Jahan ticket ki notification bhejni hai
        subject: `New Support Ticket: ${options.subject} [#${options.id}]`,
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee;">
                <h2 style="color: #2563eb;">New Support Ticket Raised</h2>
                <p><strong>Clinic Slug:</strong> ${options.slug}</p>
                <p><strong>Category:</strong> ${options.category}</p>
                <p><strong>Priority:</strong> ${options.priority}</p>
                <p><strong>Subject:</strong> ${options.subject}</p>
                <hr />
                <p><strong>Message:</strong><br/> ${options.message}</p>
                <br/>
                <p style="font-size: 12px; color: #888;">This is an automated notification from DocEdge System.</p>
            </div>
        `
    };

    // 3. Email send karo
    await transporter.sendMail(mailOptions);
};

module.exports = sendSupportEmail;