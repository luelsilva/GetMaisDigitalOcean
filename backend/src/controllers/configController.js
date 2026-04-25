const { db } = require('../db');
const { appSettings } = require('../db/schema');
const { eq } = require('drizzle-orm');

exports.getFeatureFlags = async (req, res) => {
    try {
        const flags = await db.select().from(appSettings).where(eq(appSettings.key, 'feature_flags'));
        
        // Se não existir no banco, retorna um padrão (falso)
        if (flags.length === 0) {
            return res.json({ use_tce_v2: false });
        }

        res.json(flags[0].value);
    } catch (error) {
        console.error('[CONFIG CONTROLLER GET ERR]', error);
        res.status(500).json({ error: 'Erro ao carregar configurações' });
    }
};

exports.updateFeatureFlags = async (req, res) => {
    try {
        const { use_tce_v2 } = req.body;
        
        // Verifica se já existe
        const existing = await db.select().from(appSettings).where(eq(appSettings.key, 'feature_flags'));
        
        if (existing.length === 0) {
            await db.insert(appSettings).values({
                key: 'feature_flags',
                value: { use_tce_v2 }
            });
        } else {
            await db.update(appSettings)
                .set({ value: { use_tce_v2 } })
                .where(eq(appSettings.key, 'feature_flags'));
        }

        res.json({ success: true, message: 'Configurações atualizadas com sucesso' });
    } catch (error) {
        console.error('[CONFIG CONTROLLER UPDATE ERR]', error);
        res.status(500).json({ error: 'Erro ao salvar configurações' });
    }
};
