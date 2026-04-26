const { db } = require('../db');
const { emailLogs, internships, profiles } = require('../db/schema');
const { desc, eq } = require('drizzle-orm');

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
