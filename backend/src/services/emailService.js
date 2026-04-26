const { Resend } = require('resend');
const config = require('../config');

const resend = new Resend(config.resend.apiKey);

const fs = require('fs');
const path = require('path');

const emailService = {
    /**
     * Auxiliar para ler e processar templates HTML.
     */
    _renderTemplate: (templateName, data) => {
        try {
            const templatePath = path.join(__dirname, '..', 'templates', 'emails', `${templateName}.html`);
            let html = fs.readFileSync(templatePath, 'utf8');
            
            // Substitui as chaves {{variable}} pelos dados reais
            Object.keys(data).forEach(key => {
                const regex = new RegExp(`{{${key}}}`, 'g');
                html = html.replace(regex, data[key]);
            });
            
            return html;
        } catch (err) {
            console.error('[EMAIL SERVICE] Erro ao carregar template:', templateName, err);
            return null;
        }
    },

    /**
     * Envia o código OTP via e-mail utilizando Resend.
     * @param {string} to - E-mail do destinatário
     * @param {string} otpCode - Código de 6 dígitos
     * @param {string} userName - Nome do usuário (opcional)
     */
    sendOTPEmail: async (to, otpCode, userName = 'Usuário') => {
        try {
            if (!config.resend.apiKey) {
                console.warn('[EMAIL SERVICE] RESEND_API_KEY não configurada. Simulando envio...');
                console.log(`[SIMULAÇÃO] Para: ${to}, Código: ${otpCode}`);
                return { success: true, simulated: true };
            }

            const { data, error } = await resend.emails.send({
                from: config.resend.from,
                to: to,
                subject: `${otpCode} é o seu código de verificação`,
                html: `
          <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #e1e1e1; border-radius: 12px;">
            <h1 style="color: #6366f1; font-size: 24px; margin-bottom: 20px;">Olá, ${userName}!</h1>
            <p style="color: #4b5563; font-size: 16px; line-height: 24px;">
              Este é o seu código de verificação para ativar sua conta na plataforma.
            </p>
            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #111827;">${otpCode}</span>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              Este código expira em 10 minutos. Se você não solicitou este código, ignore este e-mail.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              &copy; 2025 Antigravity Auth Service. Todos os direitos reservados.
            </p>
          </div>
        `,
            });

            if (error) {
                console.error('[EMAIL SERVICE ERROR]', error);
                return { success: false, error };
            }

            return { success: true, data };
        } catch (err) {
            console.error('[EMAIL ERROR]', err);
            return { success: false, error: err };
        }
    },

    /**
     * Notifica a empresa que o TCE foi enviado para aprovação.
     */
    sendTCEWaitingApprovalToCompany: async (to, studentName, teacherName, link) => {
        try {
            const html = emailService._renderTemplate('tce_company', {
                studentName,
                teacherName,
                link,
                year: new Date().getFullYear()
            });

            if (!html) throw new Error('Não foi possível carregar o template tce_company');

            return await resend.emails.send({
                from: config.resend.from,
                to: to,
                subject: `📤 TCE de ${studentName} enviado para aprovação`,
                html: html
            });
        } catch (err) {
            console.error('[EMAIL SERVICE] Erro ao enviar para empresa:', err);
            return { success: false, error: err };
        }
    },

    /**
     * Notifica o professor que há um TCE aguardando análise.
     */
    sendTCEWaitingApprovalToTeacher: async (to, studentName, companyName, link, companyEmail) => {
        try {
            const html = emailService._renderTemplate('tce_teacher', {
                studentName,
                companyName,
                companyEmail: companyEmail || 'Não informado',
                link,
                year: new Date().getFullYear()
            });

            if (!html) throw new Error('Não foi possível carregar o template tce_teacher');

            const emailData = {
                from: config.resend.from,
                to: to,
                cc: [config.resend.tceManagerEmail], // Cópia para o setor de estágios configurado
                subject: `📝 Pendência de Análise: TCE de ${studentName}`,
                html: html
            };

            if (companyEmail) {
                // Configura o email da empresa como "responder para", para que o professor
                // consiga responder direto do seu cliente de e-mail.
                emailData.replyTo = companyEmail;
            }

            return await resend.emails.send(emailData);
        } catch (err) {
            console.error('[EMAIL SERVICE] Erro ao enviar para professor:', err);
            return { success: false, error: err };
        }
    },

    /**
     * Notifica a empresa que o TCE foi aprovado.
     */
    sendTCEApprovedToCompany: async (to, studentName, link) => {
        try {
            const html = emailService._renderTemplate('tce_approved', {
                studentName,
                link,
                year: new Date().getFullYear()
            });

            if (!html) throw new Error('Não foi possível carregar o template tce_approved');

            return await resend.emails.send({
                from: config.resend.from,
                to: to,
                subject: `✅ TCE Aprovado: ${studentName}`,
                html: html
            });
        } catch (err) {
            console.error('[EMAIL SERVICE] Erro ao enviar aprovação para empresa:', err);
            return { success: false, error: err };
        }
    }
};

module.exports = emailService;
