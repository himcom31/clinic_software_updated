// controllers/whatsappController.js
const NotificationConfig = require('../models/NotificationConfig');
const FormData = require('form-data');
const fetch = require('node-fetch'); // npm install node-fetch

// whatsappController.js
exports.sendWhatsAppPrescription = async (req, res) => {
    try {
        const { slug } = req.params;
        const { pdfBase64, patientName, patientMobile } = req.body;

        const config = await NotificationConfig.findOne({ clinicSlug: slug });
        if (!config?.waEnabled) return res.status(400).json({ 
            success: false, 
            message: 'WhatsApp not enabled' 
        });

        const cleanToken = config.waToken.trim().replace(/\s+/g, '');
        const cleanPhoneId = config.waPhoneId.trim();

        // Step 1: Upload PDF
        const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
        const pdfBuffer = Buffer.from(base64Data, 'base64');

        const formData = new FormData();
        formData.append('file', pdfBuffer, {
            filename: `Prescription_${patientName || 'Patient'}.pdf`,
            contentType: 'application/pdf'
        });
        formData.append('type', 'application/pdf');
        formData.append('messaging_product', 'whatsapp');

        const uploadRes = await fetch(
            `https://graph.facebook.com/v19.0/${cleanPhoneId}/media`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${cleanToken}`,
                    ...formData.getHeaders()
                },
                body: formData
            }
        );
        const uploadData = await uploadRes.json();
        console.log('Upload response:', uploadData);

        if (!uploadData.id) {
            return res.status(400).json({
                success: false,
                message: uploadData.error?.message || 'PDF upload failed'
            });
        }

        // Step 2: Send using Template with Document header
        let mobile = String(patientMobile).replace(/\D/g, '');
        if (!mobile.startsWith('91') && mobile.length === 10) mobile = '91' + mobile;

        const msgPayload = {
            messaging_product: 'whatsapp',
            to: mobile,
            type: 'template',
            template: {
                name: 'prescription_ready', // ← your template name
                language: { code: 'en_US' },
                components: [
                    {
                        // Document header
                        type: 'header',
                        parameters: [
                            {
                                type: 'document',
                                document: {
                                    id: uploadData.id,
                                    filename: `Prescription_${patientName}.pdf`
                                }
                            }
                        ]
                    },
                    {
                        // Body with patient name
                        type: 'body',
                        parameters: [
                            {
                                type: 'text',
                                text: patientName || 'Patient'
                            }
                        ]
                    }
                ]
            }
        };

        const sendRes = await fetch(
            `https://graph.facebook.com/v19.0/${cleanPhoneId}/messages`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${cleanToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(msgPayload)
            }
        );

        const sendData = await sendRes.json();
        console.log('Send response:', sendData);

        if (sendData.messages?.[0]?.id) {
            return res.json({ success: true, message: 'Prescription sent on WhatsApp!' });
        } else {
            return res.status(400).json({
                success: false,
                message: sendData.error?.message || 'Send failed'
            });
        }

    } catch (err) {
        console.error('WhatsApp error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};











//////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////

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

    const transporter = nodemailer.createTransport({
        host: config.emailHost.trim(),
        port: Number(config.emailPort) || 587,
        secure: Number(config.emailPort) === 465,
        // ❌ Removed: pool, maxConnections, maxMessages
        auth: {
            user: config.emailUser.trim(),
            pass: config.emailPass.trim().replace(/\s/g, '')
        },
        tls: { rejectUnauthorized: false }
    });

    transporterCache.set(cacheKey, transporter);
    return transporter;
}

exports.sendPrescriptionEmail = async (req, res) => {
    try {
        const { slug } = req.params;
        const { pdfBase64, patientName, patientEmail, patientMobile } = req.body;

        // ── 1. Validate ──
        if (!pdfBase64) return res.status(400).json({ success: false, message: 'PDF data not received.' });
        if (!patientEmail) return res.status(400).json({ success: false, message: 'Patient email address not found.' });

        // ── 2. Get clinic config ──
        const config = await NotificationConfig.findOne({ clinicSlug: slug }).lean(); // .lean() = faster
        if (!config) return res.status(404).json({ success: false, message: 'Notification config not found.' });
        if (!config.emailEnabled) return res.status(400).json({ success: false, message: 'Email notifications not enabled.' });
        if (!config.emailHost || !config.emailUser || !config.emailPass) {
            return res.status(400).json({ success: false, message: 'Email SMTP credentials incomplete.' });
        }

        // ── 3. Clean & validate base64 ──
        const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '').replace(/\s/g, '');
        const pdfBuffer = Buffer.from(cleanBase64, 'base64');
        if (pdfBuffer.slice(0, 4).toString('ascii') !== '%PDF') {
            return res.status(400).json({ success: false, message: 'Invalid PDF data received.' });
        }

        // ── 4. Get cached transporter (NO verify() call) ──
        const transporter = getTransporter(slug, config);

        // ── 5. Build filename ──
        const dateStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
        const safeName = (patientName || 'Patient').replace(/\s+/g, '_');
        const fileName = `Prescription_${safeName}_${dateStr}.pdf`;

        // ── 6. Send ──
        const info = await transporter.sendMail({
            from: `"Clinic Prescription" <${(config.emailFrom || config.emailUser).trim()}>`,
            to: patientEmail.trim(),
            subject: `Prescription for ${patientName || 'Patient'} — ${new Date().toLocaleDateString('en-GB')}`,
            html: `/* ... your existing HTML ... */`,
            attachments: [{
                filename: fileName,
                content: cleanBase64,
                encoding: 'base64',
                contentType: 'application/pdf',
                contentDisposition: 'attachment'
            }]
        });

        console.log('✅ Email sent:', info.messageId, '→', patientEmail);
        res.json({ success: true, message: 'Prescription sent successfully!', messageId: info.messageId });

    } catch (err) {
        console.error('❌ Email error:', err);
        // ── Invalidate cache on auth errors so it rebuilds ──
        if (err.code === 'EAUTH' || err.responseCode === 535) {
            transporterCache.delete(req.params.slug);
        }

        let errorMessage = err.message;
        if (err.code === 'EAUTH') errorMessage = 'Gmail auth failed. Check App Password in settings.';
        else if (err.code === 'ECONNREFUSED') errorMessage = 'Cannot connect to email server.';
        else if (err.code === 'ETIMEDOUT') errorMessage = 'Email server timed out.';
        else if (err.responseCode === 535) errorMessage = 'Invalid credentials. Check App Password.';
        else if (err.responseCode === 550) errorMessage = 'Recipient email rejected by server.';

        res.status(500).json({ success: false, message: errorMessage });
    }
};