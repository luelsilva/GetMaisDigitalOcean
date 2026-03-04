const { db } = require('../db');
const { formModels } = require('../db/schema');
const { eq, asc, and, isNull } = require('drizzle-orm');

// Listar todos os modelos de formulários
const listForms = async (req, res, next) => {
    try {
        const result = await db.select()
            .from(formModels)
            .orderBy(asc(formModels.modelId));
        res.json(result);
    } catch (error) {
        next(error);
    }
};

// Buscar um modelo específico pelo modelId
const getFormByModelId = async (req, res, next) => {
    try {
        const { modelId } = req.params;
        const result = await db.select()
            .from(formModels)
            .where(eq(formModels.modelId, modelId));

        if (result.length === 0) {
            return res.status(404).json({ error: 'Modelo de formulário não encontrado' });
        }

        res.json(result[0]);
    } catch (error) {
        next(error);
    }
};

// Criar um novo modelo
const createForm = async (req, res, next) => {
    try {
        const { modelId, title, description, bgColor, cardBgColor, titleColor, googleDocsId, config, isActive } = req.body;
        const [newForm] = await db.insert(formModels)
            .values({ modelId, title, description, bgColor, cardBgColor, titleColor, googleDocsId, config, isActive })
            .returning();
        res.status(201).json(newForm);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Model ID já existe' });
        }
        next(error);
    }
};

// Atualizar um modelo
const updateForm = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { modelId, title, description, bgColor, cardBgColor, titleColor, googleDocsId, config, isActive } = req.body;

        const [updated] = await db.update(formModels)
            .set({
                modelId,
                title,
                description,
                bgColor,
                cardBgColor,
                titleColor,
                googleDocsId,
                config,
                isActive,
                updatedAt: new Date()
            })
            .where(eq(formModels.id, id))
            .returning();

        if (!updated) {
            return res.status(404).json({ error: 'Modelo não encontrado' });
        }

        res.json(updated);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Model ID já existe' });
        }
        next(error);
    }
};

// Deletar um modelo
const deleteForm = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [deleted] = await db.delete(formModels)
            .where(eq(formModels.id, id))
            .returning();

        if (!deleted) {
            return res.status(404).json({ error: 'Modelo não encontrado' });
        }

        res.status(200).json({ message: 'Modelo removido com sucesso' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    listForms,
    getFormByModelId,
    createForm,
    updateForm,
    deleteForm
};
