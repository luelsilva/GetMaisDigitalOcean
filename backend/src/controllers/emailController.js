const { db } = require('../db');
const { emailLogs, internships, profiles } = require('../db/schema');
const { desc, eq } = require('drizzle-orm');
const emailService = require('../services/emailService');

exports.getEmailLogs = async (req, res, next) => {
    try {
        const query = db
            .select({
                id: emailLogs.id,
                resendId: emailLogs.resendId,
                type: emailLogs.type,
                toEmail: emailLogs.toEmail,
                subject: emailLogs.subject,
                status: emailLogs.status,
                events: emailLogs.events,
                lastEventAt: emailLogs.lastEventAt,
                createdAt: emailLogs.createdAt,
                internshipId: emailLogs.internshipId,
                sentBy: emailLogs.sentBy,
                senderName: profiles.fullName,
                studentName: internships.studentName
            })
            .from(emailLogs)
            .leftJoin(profiles, eq(emailLogs.sentBy, profiles.id))
            .leftJoin(internships, eq(emailLogs.internshipId, internships.id))
            .orderBy(desc(emailLogs.createdAt));

        const logs = await query;
        res.json(logs);
    } catch (error) {
        next(error);
    }
};

exports.sendContact = async (req, res, next) => {
    try {
        const { name, email, subject, message } = req.body;
        
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
        }

        const result = await emailService.sendContactEmail(name, email, subject, message);

        if (result.error) {
            return res.status(500).json({ error: 'Erro ao enviar e-mail' });
        }

        res.json({ success: true, message: 'Mensagem enviada com sucesso!' });
    } catch (error) {
        next(error);
    }
};
