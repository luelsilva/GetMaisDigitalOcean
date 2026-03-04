const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const { profiles, otpCodes } = require('../db/schema');
const { eq, and, gt, isNull } = require('drizzle-orm');
const config = require('../config');
const { generateOTP } = require('../utils/otpGenerator');
const emailService = require('../services/emailService');
const { formatarNome } = require('../utils/utils');

const authController = {
    // Registro de usuário
    register: async (req, res, next) => {
        try {
            const { email, password, full_name, role } = req.body;

            // 1. Normalização e Hash da senha
            const normalizedEmail = email.toLowerCase();
            const formattedFullName = formatarNome(full_name);
            const hashedPassword = await bcrypt.hash(password, 10);

            // Se for empresa, já cria verificada
            const isCompany = role === 'company';

            // 2. Criar perfil
            const [user] = await db.insert(profiles)
                .values({
                    email: normalizedEmail,
                    passwordHash: hashedPassword,
                    fullName: formattedFullName,
                    isVerified: isCompany, // Se for empresa, is_verified = true
                    roles: role || 'generic'
                })
                .returning();

            // Se for empresa, não gera OTP e nem envia e-mail de ativação
            if (isCompany) {
                return res.status(201).json({
                    message: 'Conta de empresa criada com sucesso!',
                    userId: user.id,
                    isVerified: true
                });
            }

            // 3. Gerar e salvar OTP (Apenas para usuários comuns)
            const otp = generateOTP();
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + config.otp.expiryMinutes);

            await db.insert(otpCodes).values({
                userId: user.id,
                code: otp,
                type: 'registration',
                expiresAt
            });

            // 4. Enviar e-mail real via Resend
            const emailResult = await emailService.sendOTPEmail(email, otp, full_name);

            if (!emailResult.success) {
                console.warn('[AUTH] Falha ao enviar e-mail:', emailResult.error);
            }

            res.status(201).json({
                message: 'Usuário registrado. Verifique seu e-mail para ativar a conta.',
                userId: user.id
            });

        } catch (error) {
            // Erro de email duplicado (constraint unique)
            // Drizzle pode encapsular o erro do driver no .cause
            const errorCode = error.code || (error.cause && error.cause.code);

            if (errorCode === '23505') {
                return res.status(400).json({ error: 'Email já cadastrado' });
            }

            console.error(error);
            res.status(500).json({ error: 'Erro interno no servidor' });
        }
    },

    verifyOtp: async (req, res, next) => {
        try {
            const { email, code } = req.body;

            // 1. Buscar usuário
            const [user] = await db.select({ id: profiles.id })
                .from(profiles)
                .where(and(eq(profiles.email, email), isNull(profiles.deletedAt)))
                .limit(1);

            if (!user) {
                return res.status(400).json({ error: 'Código inválido ou expirado' });
            }

            // 2. Buscar código válido no banco
            const [otpData] = await db.select()
                .from(otpCodes)
                .where(
                    and(
                        eq(otpCodes.userId, user.id),
                        eq(otpCodes.code, code),
                        eq(otpCodes.type, 'registration'),
                        gt(otpCodes.expiresAt, new Date())
                    )
                )
                .limit(1);

            if (!otpData) {
                return res.status(400).json({ error: 'Código inválido ou expirado' });
            }

            // 3. Ativar conta
            await db.update(profiles)
                .set({ isVerified: true })
                .where(eq(profiles.id, user.id));

            // 4. Deletar código usado
            await db.delete(otpCodes)
                .where(eq(otpCodes.id, otpData.id));

            res.status(200).json({ message: 'Conta verificada com sucesso!' });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao verificar código' });
        }
    },

    // Reenvio de OTP
    resendOtp: async (req, res, next) => {
        try {
            const { email } = req.body;

            // 1. Buscar usuário
            const [user] = await db.select({
                id: profiles.id,
                fullName: profiles.fullName,
                isVerified: profiles.isVerified
            })
                .from(profiles)
                .where(and(eq(profiles.email, email), isNull(profiles.deletedAt)))
                .limit(1);

            if (!user) {
                // Retornamos sucesso fictício para evitar enumeração
                return res.status(200).json({
                    message: 'Se o cadastro existir e não estiver verificado, um novo código será enviado.'
                });
            }

            if (user.isVerified) {
                return res.status(400).json({ error: 'Conta já está verificada' });
            }

            const message = 'Se o cadastro existir e não estiver verificado, um novo código será enviado.';

            // 2. Gerar novo OTP
            const otp = generateOTP();
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + config.otp.expiryMinutes);

            // 3. Deletar códigos antigos e inserir novo
            await db.delete(otpCodes)
                .where(
                    and(
                        eq(otpCodes.userId, user.id),
                        eq(otpCodes.type, 'registration')
                    )
                );

            await db.insert(otpCodes).values({
                userId: user.id,
                code: otp,
                type: 'registration',
                expiresAt
            });

            // 4. Enviar e-mail real via Resend
            const emailResult = await emailService.sendOTPEmail(email, otp, user.fullName);

            if (!emailResult.success) {
                console.warn('[AUTH] Falha ao reenviar e-mail:', emailResult.error);
                return res.status(500).json({ error: 'Falha ao enviar e-mail de verificação' });
            }

            res.status(200).json({ message });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao reenviar código' });
        }
    },

    // Esqueci a Senha - Enviar OTP de Recuperação
    forgotPassword: async (req, res) => {
        try {
            const { email } = req.body;

            // 1. Verificar se usuário existe
            const [user] = await db.select({
                id: profiles.id,
                fullName: profiles.fullName
            })
                .from(profiles)
                .where(and(eq(profiles.email, email), isNull(profiles.deletedAt)))
                .limit(1);

            // Por segurança, não informamos se o email existe ou não
            if (!user) {
                return res.status(200).json({
                    message: 'Se o cadastro existir, enviaremos um código de recuperação.'
                });
            }

            // 2. Gerar OTP de reset
            const otp = generateOTP();
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + config.otp.expiryMinutes);

            // 3. Deletar códigos antigos e salvar novo OTP do tipo 'password_reset'
            await db.delete(otpCodes)
                .where(
                    and(
                        eq(otpCodes.userId, user.id),
                        eq(otpCodes.type, 'password_reset')
                    )
                );

            await db.insert(otpCodes).values({
                userId: user.id,
                code: otp,
                type: 'password_reset',
                expiresAt
            });

            // 4. Enviar e-mail
            await emailService.sendOTPEmail(email, otp, user.fullName);

            res.status(200).json({ message: 'Código de recuperação enviado para o seu e-mail.' });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao processar solicitação de senha' });
        }
    },

    // Resetar Senha com OTP
    resetPassword: async (req, res) => {
        try {
            const { email, code, newPassword } = req.body;

            // 1. Buscar usuário
            const [user] = await db.select({ id: profiles.id })
                .from(profiles)
                .where(and(eq(profiles.email, email), isNull(profiles.deletedAt)))
                .limit(1);

            if (!user) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }

            // 2. Verificar código de reset
            const [otpData] = await db.select()
                .from(otpCodes)
                .where(
                    and(
                        eq(otpCodes.userId, user.id),
                        eq(otpCodes.code, code),
                        eq(otpCodes.type, 'password_reset'),
                        gt(otpCodes.expiresAt, new Date())
                    )
                )
                .limit(1);

            if (!otpData) {
                return res.status(400).json({ error: 'Código inválido ou expirado' });
            }

            // 3. Hash da nova senha e atualização
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await db.update(profiles)
                .set({ passwordHash: hashedPassword })
                .where(eq(profiles.id, user.id));

            // 4. Limpar código usado
            await db.delete(otpCodes)
                .where(eq(otpCodes.id, otpData.id));

            res.status(200).json({ message: 'Senha alterada com sucesso!' });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao resetar senha' });
        }
    },

    me: async (req, res) => {
        try {
            // req.user vem do middleware authenticateToken
            const userId = req.user.id;

            const [user] = await db.select({
                id: profiles.id,
                email: profiles.email,
                name: profiles.fullName,
                roles: profiles.roles,
                mustChangePassword: profiles.mustChangePassword
            })
                .from(profiles)
                .where(and(eq(profiles.id, userId), isNull(profiles.deletedAt)))
                .limit(1);

            if (!user) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }

            res.json({
                id: user.id,
                email: user.email,
                name: user.name,
                roles: user.roles,
                mustChangePassword: !!user.mustChangePassword
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao buscar perfil' });
        }
    },

    // Login
    login: async (req, res) => {
        try {
            const { email, password, rememberMe } = req.body;

            // 1. Buscar usuário
            const [user] = await db.select()
                .from(profiles)
                .where(and(eq(profiles.email, email), isNull(profiles.deletedAt)))
                .limit(1);

            if (!user) {
                return res.status(401).json({ error: 'Credenciais inválidas' });
            }

            // 2. Verificar se está verificado
            if (!user.isVerified) {
                return res.status(403).json({
                    error: 'Por favor, verifique seu e-mail antes de logar',
                    verified: false,
                    email: user.email
                });
            }

            // 3. Comparar senha
            const isMatch = await bcrypt.compare(password, user.passwordHash);
            if (!isMatch) {
                return res.status(401).json({ error: 'Credenciais inválidas' });
            }

            // 4. Importar tokenManager
            const { generateAccessToken, generateRefreshToken } = require('../utils/tokenManager');

            // 5. Gerar Access Token (15 minutos)
            const accessToken = generateAccessToken(user.id, user.email, user.roles);

            // 6. Gerar Refresh Token (30 ou 90 dias dependendo do rememberMe)
            const refreshToken = await generateRefreshToken(user.id, rememberMe);

            res.status(200).json({
                accessToken,
                refreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.fullName,
                    roles: user.roles,
                    mustChangePassword: user.mustChangePassword
                }
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro no login' });
        }
    },

    // Refresh Token - Renovar Access Token
    refresh: async (req, res) => {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(401).json({ error: 'Refresh token não fornecido' });
            }

            const { validateRefreshToken, generateAccessToken } = require('../utils/tokenManager');

            // Validar refresh token
            const userId = await validateRefreshToken(refreshToken);

            if (!userId) {
                return res.status(403).json({ error: 'Refresh token inválido ou expirado' });
            }

            // Buscar dados do usuário
            const [user] = await db.select({
                id: profiles.id,
                email: profiles.email,
                name: profiles.fullName,
                roles: profiles.roles
            })
                .from(profiles)
                .where(and(eq(profiles.id, userId), isNull(profiles.deletedAt)))
                .limit(1);

            if (!user) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }

            // Gerar novo access token
            const accessToken = generateAccessToken(user.id, user.email, user.roles);

            res.status(200).json({
                accessToken,
                user
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao renovar token' });
        }
    },

    // Logout - Revogar refresh token
    logout: async (req, res) => {
        try {
            const { refreshToken } = req.body;

            if (refreshToken) {
                const { revokeRefreshToken } = require('../utils/tokenManager');
                await revokeRefreshToken(refreshToken);
            }

            res.status(200).json({ message: 'Logout realizado com sucesso' });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao fazer logout' });
        }
    },

    // Trocar Senha (Forçado ou Voluntário)
    changePassword: async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;
            const userId = req.user.id;

            // 1. Buscar usuário
            const [user] = await db.select()
                .from(profiles)
                .where(and(eq(profiles.id, userId), isNull(profiles.deletedAt)))
                .limit(1);

            if (!user) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }

            // 2. Verificar senha atual (importante!)
            const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
            if (!isMatch) {
                return res.status(400).json({ error: 'Senha atual incorreta' });
            }

            // 3. Hash da nova senha
            const hashedNewPassword = await bcrypt.hash(newPassword, 10);

            // 4. Atualizar senha e resetar flag
            await db.update(profiles)
                .set({
                    passwordHash: hashedNewPassword,
                    mustChangePassword: false,
                    updatedAt: new Date()
                })
                .where(eq(profiles.id, userId));

            res.status(200).json({ message: 'Senha alterada com sucesso!' });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao alterar senha' });
        }
    },

    // Login ou Registro Automático de Empresa
    loginOrRegisterCompany: async (req, res) => {
        try {
            const { email, password, full_name } = req.body;
            const normalizedEmail = email.toLowerCase();

            // 1. Buscar usuário
            let [user] = await db.select()
                .from(profiles)
                .where(and(eq(profiles.email, normalizedEmail), isNull(profiles.deletedAt)))
                .limit(1);

            if (user) {
                // 2. Se existe, verificar senha
                const isMatch = await bcrypt.compare(password, user.passwordHash);
                if (!isMatch) {
                    return res.status(401).json({
                        error: 'Este e-mail já está em uso com uma senha diferente. Por favor, use a senha cadastrada ou recupere seu acesso.'
                    });
                }

                // Forçar verificação se for empresa entrando pela primeira vez por este fluxo
                if (!user.isVerified) {
                    await db.update(profiles).set({ isVerified: true }).where(eq(profiles.id, user.id));
                    user.isVerified = true;
                }
            } else {
                // 3. Se não existe, registrar como empresa e já verificado
                const formattedFullName = formatarNome(full_name);
                const hashedPassword = await bcrypt.hash(password, 10);

                [user] = await db.insert(profiles)
                    .values({
                        email: normalizedEmail,
                        passwordHash: hashedPassword,
                        fullName: formattedFullName,
                        isVerified: true,
                        roles: 'company'
                    })
                    .returning();
            }

            // 4. Gerar tokens de acesso (com rememberMe default para empresas)
            const { generateAccessToken, generateRefreshToken } = require('../utils/tokenManager');
            const accessToken = generateAccessToken(user.id, user.email, user.roles);
            const refreshToken = await generateRefreshToken(user.id, true);

            res.status(200).json({
                accessToken,
                refreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.fullName,
                    roles: user.roles,
                    mustChangePassword: !!user.mustChangePassword
                }
            });

        } catch (error) {
            console.error('[AUTH] Erro no login/registro de empresa:', error);
            res.status(500).json({ error: 'Erro ao processar identificação da empresa' });
        }
    }
};

module.exports = authController;
