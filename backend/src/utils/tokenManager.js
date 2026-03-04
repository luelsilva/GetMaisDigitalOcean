const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');
const { db } = require('../db');
const { refreshTokens } = require('../db/schema');
const { eq, and, gt } = require('drizzle-orm');

/**
 * Gera um access token JWT
 */
function generateAccessToken(userId, email, roles) {
    return jwt.sign(
        { id: userId, email, roles },
        config.jwt.secret,
        { expiresIn: config.jwt.accessTokenExpiresIn }
    );
}

/**
 * Gera um refresh token único e o salva no banco
 */
async function generateRefreshToken(userId, rememberMe = false) {
    // Gerar token aleatório
    const token = crypto.randomBytes(64).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Calcular expiração (30 dias padrão, ou 90 dias se "lembrar-me")
    const expiresAt = new Date();
    const days = rememberMe ? 90 : 30;
    expiresAt.setDate(expiresAt.getDate() + days);

    // Salvar no banco
    await db.insert(refreshTokens).values({
        userId,
        tokenHash,
        expiresAt
    });

    return token;
}

/**
 * Valida um refresh token e retorna o userId se válido
 */
async function validateRefreshToken(token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const [tokenData] = await db.select()
        .from(refreshTokens)
        .where(
            and(
                eq(refreshTokens.tokenHash, tokenHash),
                eq(refreshTokens.isRevoked, false),
                gt(refreshTokens.expiresAt, new Date())
            )
        )
        .limit(1);

    return tokenData ? tokenData.userId : null;
}

/**
 * Revoga um refresh token específico
 */
async function revokeRefreshToken(token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await db.update(refreshTokens)
        .set({ isRevoked: true })
        .where(eq(refreshTokens.tokenHash, tokenHash));
}

/**
 * Revoga todos os refresh tokens de um usuário
 */
async function revokeAllUserTokens(userId) {
    await db.update(refreshTokens)
        .set({ isRevoked: true })
        .where(eq(refreshTokens.userId, userId));
}

/**
 * Remove tokens expirados do banco (limpeza)
 */
async function cleanupExpiredTokens() {
    await db.delete(refreshTokens)
        .where(gt(new Date(), refreshTokens.expiresAt));
}

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    validateRefreshToken,
    revokeRefreshToken,
    revokeAllUserTokens,
    cleanupExpiredTokens
};
