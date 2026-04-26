const { db } = require('../db');
const { emailLogs } = require('../db/schema');
const { eq, sql } = require('drizzle-orm');

exports.handleResendWebhook = async (req, res, next) => {
    try {
        const payload = req.body;
        
        if (!payload || !payload.type) {
            return res.status(400).send('Invalid payload');
        }

        const eventType = payload.type; 
        const data = payload.data || {};
        const resendId = data.email_id;

        if (!resendId) {
            return res.status(400).send('No email_id in payload');
        }

        // Mapear eventos do Resend para o nosso ENUM email_status
        let newStatus = null;
        switch(eventType) {
            case 'email.sent': newStatus = 'sent'; break;
            case 'email.delivered': newStatus = 'delivered'; break;
            case 'email.opened': newStatus = 'opened'; break;
            case 'email.clicked': newStatus = 'clicked'; break;
            case 'email.bounced': newStatus = 'bounced'; break;
            case 'email.complained': newStatus = 'complained'; break;
        }

        const eventObject = {
            type: eventType,
            timestamp: payload.created_at || new Date().toISOString(),
            data: data
        };

        const updateData = {
            lastEventAt: new Date(),
            // Adiciona o novo evento ao array JSONB existente
            events: sql`events || ${JSON.stringify([eventObject])}::jsonb`
        };

        if (newStatus) {
            updateData.status = newStatus;
        }

        await db.update(emailLogs)
            .set(updateData)
            .where(eq(emailLogs.resendId, resendId));

        res.status(200).send('Webhook processed');
    } catch (error) {
        console.error('[WEBHOOK ERROR]', error);
        res.status(500).send('Internal Server Error');
    }
};
