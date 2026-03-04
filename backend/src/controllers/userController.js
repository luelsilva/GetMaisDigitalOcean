const bcrypt = require('bcrypt');
const { db } = require('../db');
const { profiles } = require('../db/schema');
const { eq, asc, isNull } = require('drizzle-orm');
const { formatarNome } = require('../utils/utils');

const userController = {
    // Listar todos os usuários (sem o hash da senha)
    listUsers: async (req, res, next) => {
        try {
            const result = await db.select({
                id: profiles.id,
                email: profiles.email,
                fullName: profiles.fullName,
                roles: profiles.roles,
                isVerified: profiles.isVerified,
                mustChangePassword: profiles.mustChangePassword,
                createdAt: profiles.createdAt,
                updatedAt: profiles.updatedAt
            })
                .from(profiles)
                .where(isNull(profiles.deletedAt))
                .orderBy(asc(profiles.fullName));

            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    // Criar um novo usuário via admin
    createUser: async (req, res, next) => {
        try {
            const { email, password, fullName, roles, isVerified, mustChangePassword } = req.body;

            // 1. Normalização e Hash da senha
            const normalizedEmail = email.toLowerCase();
            const formattedFullName = formatarNome(fullName);
            const hashedPassword = await bcrypt.hash(password, 10);

            // 2. Verificar se o e-mail já existe (incluindo deletados)
            const [existingUser] = await db.select()
                .from(profiles)
                .where(eq(profiles.email, normalizedEmail))
                .limit(1);

            if (existingUser) {
                if (existingUser.deletedAt) {
                    return res.status(400).json({
                        error: 'Este e-mail pertence a um usuário removido. Reative-o ou use outro e-mail.'
                    });
                }
                return res.status(400).json({ error: 'Email já cadastrado' });
            }

            // 3. Inserir no banco
            const [newUser] = await db.insert(profiles)
                .values({
                    email: normalizedEmail,
                    passwordHash: hashedPassword,
                    fullName: formattedFullName,
                    roles: roles || 'generic',
                    isVerified: isVerified || false,
                    mustChangePassword: mustChangePassword || false
                })
                .returning({
                    id: profiles.id,
                    email: profiles.email,
                    fullName: profiles.fullName,
                    roles: profiles.roles,
                    isVerified: profiles.isVerified,
                    mustChangePassword: profiles.mustChangePassword
                });

            res.status(201).json(newUser);
        } catch (error) {
            // Erro de email duplicado
            if (error.code === '23505') {
                return res.status(400).json({ error: 'Email já cadastrado' });
            }
            next(error);
        }
    },

    // Atualizar dados de um usuário
    updateUser: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { fullName, roles, isVerified, mustChangePassword, password } = req.body;

            const updateData = {
                fullName: formatarNome(fullName),
                roles,
                isVerified,
                mustChangePassword,
                updatedAt: new Date()
            };

            // Se uma nova senha for fornecida, faz o hash e inclui no update
            if (password && password.trim().length > 0) {
                updateData.passwordHash = await bcrypt.hash(password, 10);
            }

            const [updatedUser] = await db.update(profiles)
                .set(updateData)
                .where(eq(profiles.id, id))
                .returning({
                    id: profiles.id,
                    email: profiles.email,
                    fullName: profiles.fullName,
                    roles: profiles.roles,
                    isVerified: profiles.isVerified,
                    mustChangePassword: profiles.mustChangePassword
                });

            if (!updatedUser) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }

            res.json(updatedUser);
        } catch (error) {
            next(error);
        }
    },

    // Deletar um usuário
    deleteUser: async (req, res, next) => {
        try {
            const { id } = req.params;

            // Impedir que o usuário delete a si mesmo
            if (req.user.id === id) {
                return res.status(400).json({ error: 'Você não pode deletar sua própria conta via painel administrativo.' });
            }

            // 1. Obter o e-mail atual do usuário
            const [user] = await db.select({ email: profiles.email })
                .from(profiles)
                .where(eq(profiles.id, id))
                .limit(1);

            if (!user) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }

            // 2. Única chamada: Soft delete e atualização do e-mail
            const timestamp = Date.now();
            const newEmail = `${user.email}_deleted_${timestamp}`;

            await db.update(profiles)
                .set({
                    deletedAt: new Date(),
                    email: newEmail
                })
                .where(eq(profiles.id, id));

            res.json({ message: 'Usuário removido com sucesso (soft delete)' });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = userController;
