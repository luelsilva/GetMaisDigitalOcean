const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
  console.log('Iniciando teste de envio de email para luizkrx@gmail.com...');
  
  if (!process.env.RESEND_API_KEY) {
    console.error('Erro: RESEND_API_KEY não encontrada no arquivo .env');
    return;
  }

  try {
    const data = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Cedup GetMais <noreply@updates.getmais.com.br>',
      to: 'luizkrx@gmail.com',
      subject: 'Teste de Envio de Email - GetMais',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2>Teste de Configuração Resend</h2>
          <p>Olá,</p>
          <p>Se você está recebendo esta mensagem, significa que a configuração de envio de emails usando a conta <strong>luizkrx@gmail.com</strong> e a API Key do Resend está funcionando corretamente!</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #777;">Enviado pelo sistema backend do GetMais.</p>
        </div>
      `,
    });

    console.log('✅ Email enviado com sucesso!');
    console.log('Detalhes da resposta:', data);
  } catch (error) {
    console.error('❌ Erro ao enviar email:');
    console.error(error);
  }
}

testEmail();
