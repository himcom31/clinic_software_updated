// controllers/emailController.js
const nodemailer = require('nodemailer');
const NotificationConfig = require('../models/NotificationConfig');

// ── Transporter cache (keyed by clinicSlug) ──
const transporterCache = new Map();

function getTransporter(slug, config) {
    const cacheKey = `${slug}::${config.emailUser}::${config.emailHost}::${config.emailPort}`;

    if (transporterCache.has(cacheKey)) {
        return transporterCache.get(cacheKey);
    }

    const isGmail =
        (config.emailHost || '').toLowerCase().includes('gmail') ||
        (config.emailUser || '').toLowerCase().includes('gmail.com');

    const transportOptions = isGmail
        ? {
              // ✅ Gmail shorthand — skips DNS MX lookup, fastest path
              service: 'gmail',
              pool: true,
              maxConnections: 3,
              maxMessages: 100,
              rateDelta: 1000,
              rateLimit: 5,
              auth: {
                  user: config.emailUser.trim(),
                  pass: config.emailPass.trim().replace(/\s/g, '')
              }
          }
        : {
              // ✅ Custom SMTP with pooling
              host: config.emailHost.trim(),
              port: Number(config.emailPort) || 587,
              secure: Number(config.emailPort) === 465,
              pool: true,
              maxConnections: 3,
              maxMessages: 100,
              rateDelta: 1000,
              rateLimit: 5,
              auth: {
                  user: config.emailUser.trim(),
                  pass: config.emailPass.trim().replace(/\s/g, '')
              },
              tls: { rejectUnauthorized: false },
              // ✅ Socket timeouts — prevent hanging forever
              connectionTimeout: 10000,  // 10s to establish connection
              greetingTimeout: 10000,    // 10s for SMTP greeting
              socketTimeout: 30000       // 30s socket idle timeout
          };

    const transporter = nodemailer.createTransport(transportOptions);
    transporterCache.set(cacheKey, transporter);
    return transporter;
}

// ── Invalidate a specific clinic's cached transporter ──
function invalidateCache(slug) {
    for (const key of transporterCache.keys()) {
        if (key.startsWith(`${slug}::`)) {
            transporterCache.delete(key);
        }
    }
}

// ── Build HTML email body ──
function buildEmailHtml(patientName, dateStr) {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="background: #4A90D9; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h2 style="color: #fff; margin: 0;">Your Prescription is Ready</h2>
        </div>
        <div style="background: #f9f9f9; padding: 24px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px;">Dear <strong>${patientName || 'Patient'}</strong>,</p>
            <p style="font-size: 15px; line-height: 1.6;">
                Please find your prescription attached to this email as a PDF document.
                Keep it safely for your records and share it with your pharmacist when needed.
            </p>
            <p style="font-size: 14px; color: #888;">Date: ${dateStr}</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
            <p style="font-size: 13px; color: #aaa; text-align: center;">
                This is an automated message. Please do not reply to this email.
            </p>
        </div>
    </div>`;
}

// ── Main Controller ──
exports.sendPrescriptionEmail = async (req, res) => {
    try {
        const { slug } = req.params;
        const { pdfBase64, patientName, patientEmail, patientMobile } = req.body;

        // ── 1. Validate required fields ──
        if (!pdfBase64) {
            return res.status(400).json({ success: false, message: 'PDF data not received.' });
        }
        if (!patientEmail) {
            return res.status(400).json({ success: false, message: 'Patient email address not found.' });
        }

        // ── 2. Get clinic config ──
        const config = await NotificationConfig.findOne({ clinicSlug: slug }).lean();
        if (!config) {
            return res.status(404).json({ success: false, message: 'Notification config not found.' });
        }
        if (!config.emailEnabled) {
            return res.status(400).json({ success: false, message: 'Email notifications not enabled.' });
        }
        if (!config.emailHost || !config.emailUser || !config.emailPass) {
            return res.status(400).json({ success: false, message: 'Email SMTP credentials incomplete.' });
        }

        // ── 3. Clean & validate base64 PDF ──
        const cleanBase64 = pdfBase64
            .replace(/^data:application\/pdf;base64,/, '')
            .replace(/\s/g, '');

        const pdfBuffer = Buffer.from(cleanBase64, 'base64');
        if (pdfBuffer.slice(0, 4).toString('ascii') !== '%PDF') {
            return res.status(400).json({ success: false, message: 'Invalid PDF data received.' });
        }

        // ── 4. Build mail options ──
        const dateStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
        const safeName = (patientName || 'Patient').replace(/\s+/g, '_');
        const fileName = `Prescription_${safeName}_${dateStr}.pdf`;
        const fromAddress = (config.emailFrom || config.emailUser).trim();

        const mailOptions = {
            from: `"Clinic Prescription" <${fromAddress}>`,
            to: patientEmail.trim(),
            subject: `Prescription for ${patientName || 'Patient'} — ${new Date().toLocaleDateString('en-GB')}`,
            html: buildEmailHtml(patientName, new Date().toLocaleDateString('en-GB')),
            attachments: [
                {
                    filename: fileName,
                    content: cleanBase64,
                    encoding: 'base64',
                    contentType: 'application/pdf',
                    contentDisposition: 'attachment'
                }
            ]
        };

        // ── 5. Get cached/pooled transporter ──
        const transporter = getTransporter(slug, config);

        // ── 6. ✅ Respond immediately — send email in background ──
        res.json({
            success: true,
            message: 'Prescription is being sent to your email!'
        });

        // ── 7. Fire and forget (non-blocking) ──
        transporter
            .sendMail(mailOptions)
            .then((info) => {
                console.log(`✅ [${slug}] Email sent: ${info.messageId} → ${patientEmail}`);
            })
            .catch((err) => {
                console.error(`❌ [${slug}] Background email failed → ${patientEmail}:`, err.message);

                // Invalidate cache on auth errors so it rebuilds next time
                if (err.code === 'EAUTH' || err.responseCode === 535) {
                    invalidateCache(slug);
                    console.warn(`⚠️ [${slug}] Transporter cache invalidated due to auth error.`);
                }
            });

    } catch (err) {
        console.error('❌ Email controller error:', err);

        // Invalidate cache on auth/connection errors
        if (err.code === 'EAUTH' || err.responseCode === 535) {
            invalidateCache(req.params.slug);
        }

        // ── Friendly error messages ──
        let errorMessage = err.message;
        if (err.code === 'EAUTH')           errorMessage = 'Gmail auth failed. Check App Password in settings.';
        else if (err.code === 'ECONNREFUSED') errorMessage = 'Cannot connect to email server. Check SMTP host/port.';
        else if (err.code === 'ETIMEDOUT')    errorMessage = 'Email server timed out. Try again.';
        else if (err.responseCode === 535)    errorMessage = 'Invalid credentials. Check App Password in settings.';
        else if (err.responseCode === 550)    errorMessage = 'Recipient email rejected by server.';

        // Only send error response if headers not already sent (i.e., we haven't responded yet)
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: errorMessage });
        }
    }
};

exports.sendPrescriptionEmailInvoice = async (req, res) => {
    try {
        const { slug } = req.params;
        const { pdfBase64, patientName, patientEmail, patientMobile } = req.body;


        // ── 1. Validate required fields ──
        if (!pdfBase64) {
            return res.status(400).json({ success: false, message: 'PDF data not received.' });
        }
        if (!patientEmail) {
            return res.status(400).json({ success: false, message: 'Patient email address not found.' });
        }


        // ── 2. Get clinic config ──
        const config = await NotificationConfig.findOne({ clinicSlug: slug }).lean();
        if (!config) {
            return res.status(404).json({ success: false, message: 'Notification config not found.' });
        }
        if (!config.emailEnabled) {
            return res.status(400).json({ success: false, message: 'Email notifications not enabled.' });
        }
        if (!config.emailHost || !config.emailUser || !config.emailPass) {
            return res.status(400).json({ success: false, message: 'Email SMTP credentials incomplete.' });
        }


        // ── 3. Clean & validate base64 PDF ──
        const cleanBase64 = pdfBase64
            .replace(/^data:application\/pdf;base64,/, '')
            .replace(/\s/g, '');


        const pdfBuffer = Buffer.from(cleanBase64, 'base64');
        if (pdfBuffer.slice(0, 4).toString('ascii') !== '%PDF') {
            return res.status(400).json({ success: false, message: 'Invalid PDF data received.' });
        }


        // ── 4. Build mail options ──
        const dateStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
        const safeName = (patientName || 'Patient').replace(/\s+/g, '_');
        const fileName = `Prescription_${safeName}_${dateStr}.pdf`;
        const fromAddress = (config.emailFrom || config.emailUser).trim();


        const mailOptions = {
            from: `"Clinic Invoice" <${fromAddress}>`,
            to: patientEmail.trim(),
            subject: `Invoice for ${patientName || 'Patient'} — ${new Date().toLocaleDateString('en-GB')}`,
            html: buildEmailHtml(patientName, new Date().toLocaleDateString('en-GB')),
            attachments: [
                {
                    filename: fileName,
                    content: cleanBase64,
                    encoding: 'base64',
                    contentType: 'application/pdf',
                    contentDisposition: 'attachment'
                }
            ]
        };


        // ── 5. Get cached/pooled transporter ──
        const transporter = getTransporter(slug, config);


        // ── 6. ✅ Respond immediately — send email in background ──
        res.json({
            success: true,
            message: 'Prescription is being sent to your email!'
        });


        // ── 7. Fire and forget (non-blocking) ──
        transporter
            .sendMail(mailOptions)
            .then((info) => {
                console.log(`✅ [${slug}] Email sent: ${info.messageId} → ${patientEmail}`);
            })
            .catch((err) => {
                console.error(`❌ [${slug}] Background email failed → ${patientEmail}:`, err.message);


                // Invalidate cache on auth errors so it rebuilds next time
                if (err.code === 'EAUTH' || err.responseCode === 535) {
                    invalidateCache(slug);
                    console.warn(`⚠️ [${slug}] Transporter cache invalidated due to auth error.`);
                }
            });


    } catch (err) {
        console.error('❌ Email controller error:', err);


        // Invalidate cache on auth/connection errors
        if (err.code === 'EAUTH' || err.responseCode === 535) {
            invalidateCache(req.params.slug);
        }


        // ── Friendly error messages ──
        let errorMessage = err.message;
        if (err.code === 'EAUTH')           errorMessage = 'Gmail auth failed. Check App Password in settings.';
        else if (err.code === 'ECONNREFUSED') errorMessage = 'Cannot connect to email server. Check SMTP host/port.';
        else if (err.code === 'ETIMEDOUT')    errorMessage = 'Email server timed out. Try again.';
        else if (err.responseCode === 535)    errorMessage = 'Invalid credentials. Check App Password in settings.';
        else if (err.responseCode === 550)    errorMessage = 'Recipient email rejected by server.';


        // Only send error response if headers not already sent (i.e., we haven't responded yet)
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: errorMessage });
        }
    }
};