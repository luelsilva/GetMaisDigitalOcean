const { db } = require('../db');
const { teachers } = require('../db/schema');
const { eq, and, isNull } = require('drizzle-orm');
const { formatarNome } = require('../utils/utils');

// Listar todos os professores
exports.getAllTeachers = async (req, res, next) => {
    try {
        const result = await db.select().from(teachers)
            .orderBy(teachers.name);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

// Obter professor por ID
exports.getTeacherById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await db.select().from(teachers)
            .where(eq(teachers.id, id));
        if (result.length === 0) return res.status(404).json({ error: 'Professor não encontrado' });
        res.json(result[0]);
    } catch (error) {
        next(error);
    }
};

// Criar novo professor
exports.createTeacher = async (req, res, next) => {
    try {
        const { registration, name, email } = req.body;
        if (!registration || !name || !email) {
            return res.status(400).json({ error: 'Matrícula, nome e email são obrigatórios' });
        }

        const result = await db.insert(teachers)
            .values({
                registration,
                name: formatarNome(name),
                email: email.toLowerCase()
            })
            .returning();
        res.status(201).json(result[0]);
    } catch (error) {
        if (error.code === '23505') {
            if (error.detail && error.detail.includes('registration')) return res.status(400).json({ error: 'Matrícula já cadastrada' });
            if (error.detail && error.detail.includes('email')) return res.status(400).json({ error: 'Email já cadastrado' });
            return res.status(400).json({ error: 'Dados duplicados' });
        }
        next(error);
    }
};

// Atualizar professor
exports.updateTeacher = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { registration, name, email } = req.body;

        const updateData = { updatedAt: new Date() };
        if (registration) updateData.registration = registration;
        if (name) updateData.name = formatarNome(name);
        if (email) updateData.email = email.toLowerCase();

        const result = await db.update(teachers)
            .set(updateData)
            .where(eq(teachers.id, id))
            .returning();

        if (result.length === 0) return res.status(404).json({ error: 'Professor não encontrado' });
        res.json(result[0]);
    } catch (error) {
        if (error.code === '23505') {
            if (error.detail && error.detail.includes('registration')) return res.status(400).json({ error: 'Matrícula já em uso' });
            if (error.detail && error.detail.includes('email')) return res.status(400).json({ error: 'Email já em uso' });
            return res.status(400).json({ error: 'Dados duplicados' });
        }
        next(error);
    }
};

// Deletar professor
exports.deleteTeacher = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await db.delete(teachers)
            .where(eq(teachers.id, id))
            .returning();

        if (result.length === 0) return res.status(404).json({ error: 'Professor não encontrado' });
        res.status(200).json({ message: 'Professor removido com sucesso' });
    } catch (error) {
        next(error);
    }
};
