require('dotenv').config();

const requiredEnv = [
  'DATABASE_URL',
  'JWT_SECRET',
  'RESEND_API_KEY'
];

requiredEnv.forEach(env => {
  if (!process.env[env]) {
    console.error(`[CONFIG ERROR] Variável de ambiente ${env} está faltando!`);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
});

module.exports = {
  port: process.env.PORT || 3000,
  corsOrigin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173'],

  jwt: {
    secret: process.env.JWT_SECRET,
    accessTokenExpiresIn: '15m',  // Access token: 15 minutos
    refreshTokenExpiresIn: '30d'  // Refresh token: 30 dias
  },
  otp: {
    expiryMinutes: 10,
    length: 6
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM || 'onboarding@resend.dev'
  },
  systemApiKey: process.env.SYSTEM_API_KEY || 'keep-alive-secret-123'
};
