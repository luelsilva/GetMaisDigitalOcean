/**
 * Middleware centralizado para tratamento de erros.
 */
const errorHandler = (err, req, res, next) => {
    console.error(`[ERROR] ${err.stack || err.message}`);

    const status = err.status || 500;
    const message = err.message || 'Erro interno no servidor';

    res.status(status).json({
        error: message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};

module.exports = errorHandler;
