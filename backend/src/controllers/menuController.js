const { db } = require('../db');
const { menuSections, menuItems } = require('../db/schema');
const { eq, and, desc, sql } = require('drizzle-orm');

const menuController = {
    // 1) Listar itens do estagio_menu (Seções do Menu)
    getSideMenu: async (req, res) => {
        try {
            const results = await db.select()
                .from(menuSections)
                .where(eq(menuSections.isActive, true))
                .orderBy(menuSections.code);

            res.json(results);
        } catch (error) {
            console.error('[MenuAPI] Erro ao buscar seções:', error);
            res.status(500).json({ error: 'Erro ao buscar seções do menu' });
        }
    },

    // 2) Listar itens do estagio_menu_itens por Code (Itens da Seção)
    getSideMenuItens: async (req, res) => {
        try {
            const { code } = req.params;

            if (!code) {
                return res.status(400).json({ error: 'O parâmetro code é obrigatório' });
            }

            // Check if section exists and is active
            const [section] = await db.select()
                .from(menuSections)
                .where(eq(menuSections.code, parseInt(code)))
                .limit(1);

            if (!section || !section.isActive) {
                return res.json([]);
            }

            const items = await db.select()
                .from(menuItems)
                .where(and(
                    eq(menuItems.sectionId, parseInt(code)),
                    eq(menuItems.isActive, true)
                ))
                .orderBy(menuItems.model);

            res.json(items);
        } catch (error) {
            console.error('[MenuAPI] Erro ao buscar itens:', error);
            res.status(500).json({ error: 'Erro ao buscar itens do menu' });
        }
    },

    // 3) Buscar TUDO (Seções + Itens) em uma única chamada
    getFullMenu: async (req, res) => {
        try {
            const sections = await db.select()
                .from(menuSections)
                .where(eq(menuSections.isActive, true))
                .orderBy(menuSections.code);

            const allItems = await db.select()
                .from(menuItems)
                .where(eq(menuItems.isActive, true))
                .orderBy(menuItems.model);

            // Merge items into sections
            const fullMenu = sections.map(section => ({
                ...section,
                items: allItems.filter(item => item.sectionId === section.code)
            }));

            res.json(fullMenu);
        } catch (error) {
            console.error('[MenuAPI] Erro no FullMenu:', error);
            res.status(500).json({ error: 'Erro ao buscar menu completo' });
        }
    },

    // 4) Get Data Version (Latest update timestamp)
    getMenuVersion: async (req, res) => {
        try {
            // Get latest updated_at AND count to detect deletions
            const [lastSection] = await db.select({
                updatedAt: menuSections.updatedAt
            })
                .from(menuSections)
                .orderBy(desc(menuSections.updatedAt))
                .limit(1);

            const [lastItem] = await db.select({
                updatedAt: menuItems.updatedAt
            })
                .from(menuItems)
                .orderBy(desc(menuItems.updatedAt))
                .limit(1);

            // Get counts
            const [sectionCount] = await db.select({
                count: sql`count(*)`
            }).from(menuSections);

            const [itemCount] = await db.select({
                count: sql`count(*)`
            }).from(menuItems);

            const sectionDate = lastSection?.updatedAt ? new Date(lastSection.updatedAt).getTime() : 0;
            const itemDate = lastItem?.updatedAt ? new Date(lastItem.updatedAt).getTime() : 0;
            const totalCount = (Number(sectionCount?.count) || 0) + (Number(itemCount?.count) || 0);

            // Version is a combination of items count and latest timestamp
            const version = `${totalCount}-${Math.max(sectionDate, itemDate)}`;

            res.json({ version });
        } catch (error) {
            console.error('[MenuAPI] Erro ao buscar versão:', error);
            res.status(500).json({ error: 'Erro ao buscar versão do menu' });
        }
    }
};

module.exports = menuController;
