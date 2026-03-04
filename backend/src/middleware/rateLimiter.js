const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

/**
 * Limitador de taxa global para a aplicação.
 * Aumentado para suportar redes compartilhadas.
 */
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    limit: 500, // Aumentado para 500 para evitar bloqueios em redes compartilhadas
    message: { error: 'Muitas requisições deste IP, tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Limitador Híbrido: IP + E-mail
 * Bloqueia apenas o usuário específico em um IP, permitindo que outros usuários no mesmo IP continuem usando o sistema.
 */
const strictAuthLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    limit: 10, // 10 tentativas por e-mail no mesmo IP
    keyGenerator: (req) => {
        // Usa ipKeyGenerator para normalizar IPv6 corretamente e prevenir bypass
        const normalizedIp = ipKeyGenerator(req);
        const email = req.body?.email || 'anonymous';
        return `${normalizedIp}_${email}`;
    },
    message: { error: 'Muitas tentativas para este e-mail. Aguarde 5 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true // Se o login der certo, não conta no limite (opcional)
});

/**
 * Limitador de Segurança por IP (Burst protection)
 * Impede que um único IP faça requisições de auth massivas.
 */
const authBurstyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100, // Permite até 100 tentativas de auth por IP vindo de uma escola/escritório
    message: { error: 'Limite de tentativas para este IP excedido. Tente em 15 minutos.' },
});

module.exports = { globalLimiter, strictAuthLimiter, authBurstyLimiter };
