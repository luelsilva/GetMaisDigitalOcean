const { db } = require('../db');
const { menuSections, menuItems } = require('../db/schema');
const { eq, desc, and, isNull } = require('drizzle-orm');

const adminMenuController = {
    // === SECTIONS ===

    // Listar todas as seções (admin vê tudo, inclusive inativos)
    listSections: async (req, res) => {
        try {
            const results = await db.select()
                .from(menuSections)
                .orderBy(menuSections.code);
            res.json(results);
        } catch (error) {
            console.error('[AdminMenuAPI] Erro ao listar seções:', error);
            res.status(500).json({ error: 'Erro ao listar seções' });
        }
    },

    // Criar nova seção
    createSection: async (req, res) => {
        try {
            const { code, caption, colorDark, colorLight, isActive } = req.body;

            // Validações básicas e garantindo que isActive seja booleano
            const active = isActive !== undefined ? isActive : true;

            const [newSection] = await db.insert(menuSections)
                .values({
                    code,
                    caption,
                    colorDark,
                    colorLight,
                    isActive: active
                })
                .returning();

            res.status(201).json(newSection);
        } catch (error) {
            console.error('[AdminMenuAPI] Erro ao criar seção:', error);
            if (error.code === '23505') { // Unique violation
                return res.status(409).json({ error: 'Código de seção já existe' });
            }
            res.status(500).json({ error: 'Erro ao criar seção' });
        }
    },

    // Atualizar seção
    updateSection: async (req, res) => {
        try {
            const { id } = req.params;
            const { code, caption, colorDark, colorLight, isActive } = req.body;

            const [updatedSection] = await db.update(menuSections)
                .set({
                    code,
                    caption,
                    colorDark,
                    colorLight,
                    isActive,
                    updatedAt: new Date()
                })
                .where(eq(menuSections.id, id))
                .returning();

            if (!updatedSection) {
                return res.status(404).json({ error: 'Seção não encontrada' });
            }

            res.json(updatedSection);
        } catch (error) {
            console.error('[AdminMenuAPI] Erro ao atualizar seção:', error);
            if (error.code === '23505') {
                return res.status(409).json({ error: 'Código de seção já existe' });
            }
            res.status(500).json({ error: 'Erro ao atualizar seção' });
        }
    },

    // Deletar seção
    deleteSection: async (req, res) => {
        try {
            const { id } = req.params;

            const [deletedSection] = await db.delete(menuSections)
                .where(eq(menuSections.id, id))
                .returning();

            if (!deletedSection) {
                return res.status(404).json({ error: 'Seção não encontrada' });
            }

            res.json({ message: 'Seção deletada com sucesso', section: deletedSection });
        } catch (error) {
            console.error('[AdminMenuAPI] Erro ao deletar seção:', error);
            res.status(500).json({ error: 'Erro ao deletar seção' });
        }
    },

    // === ITEMS ===

    // Listar itens (pode filtrar por sectionId via query param se quiser, mas aqui vamos listar todos ou por section)
    listItems: async (req, res) => {
        try {
            const { sectionId } = req.query;
            let query = db.select().from(menuItems);

            if (sectionId) {
                query = query.where(eq(menuItems.sectionId, parseInt(sectionId)));
            }

            const results = await query.orderBy(menuItems.model);
            res.json(results);
        } catch (error) {
            console.error('[AdminMenuAPI] Erro ao listar itens:', error);
            res.status(500).json({ error: 'Erro ao listar itens' });
        }
    },

    // Criar novo item
    createItem: async (req, res) => {
        try {
            const { sectionId, model, caption, link, isActive } = req.body;

            const [newItem] = await db.insert(menuItems)
                .values({
                    sectionId,
                    model,
                    caption,
                    link,
                    isActive: isActive !== undefined ? isActive : true
                })
                .returning();

            res.status(201).json(newItem);
        } catch (error) {
            console.error('[AdminMenuAPI] Erro ao criar item:', error);
            if (error.code === '23505') {
                return res.status(409).json({ error: 'Modelo do item já existe' });
            }
            res.status(500).json({ error: 'Erro ao criar item' });
        }
    },

    // Atualizar item
    updateItem: async (req, res) => {
        try {
            const { id } = req.params;
            const { sectionId, model, caption, link, isActive } = req.body;

            const [updatedItem] = await db.update(menuItems)
                .set({
                    sectionId,
                    model,
                    caption,
                    link,
                    isActive,
                    updatedAt: new Date()
                })
                .where(eq(menuItems.id, id))
                .returning();

            if (!updatedItem) {
                return res.status(404).json({ error: 'Item não encontrado' });
            }

            res.json(updatedItem);
        } catch (error) {
            console.error('[AdminMenuAPI] Erro ao atualizar item:', error);
            if (error.code === '23505') {
                return res.status(409).json({ error: 'Modelo do item já existe' });
            }
            res.status(500).json({ error: 'Erro ao atualizar item' });
        }
    },

    // Deletar item
    deleteItem: async (req, res) => {
        try {
            const { id } = req.params;

            const [deletedItem] = await db.delete(menuItems)
                .where(eq(menuItems.id, id))
                .returning();

            if (!deletedItem) {
                return res.status(404).json({ error: 'Item não encontrado' });
            }

            res.json({ message: 'Item deletado com sucesso', item: deletedItem });
        } catch (error) {
            console.error('[AdminMenuAPI] Erro ao deletar item:', error);
            res.status(500).json({ error: 'Erro ao deletar item' });
        }
    }
};

module.exports = adminMenuController;
