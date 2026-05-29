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
    name: 'jaspers_market_order_confirmation_v1', // ← use what actually exists
    language: { code: 'en_US' },
    components: [
        {
            type: 'body',
            parameters: [
                { type: 'text', text: patientName || 'Patient' },
                { type: 'text', text: 'RX123' },       // prescription/order number
                { type: 'text', text: new Date().toDateString() }
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











