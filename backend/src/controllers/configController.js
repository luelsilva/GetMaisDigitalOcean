const { db } = require('../db');
const { appSettings, occurrenceRules } = require('../db/schema');
const { eq } = require('drizzle-orm');
const { checkAllOccurrences } = require('../services/occurrenceService');

exports.getFeatureFlags = async (req, res) => {
    try {
        const flags = await db.select().from(appSettings).where(eq(appSettings.key, 'feature_flags'));
        
        // Se não existir no banco, retorna um padrão (falso)
        if (flags.length === 0) {
            return res.json({ use_tce_v2: false, enable_tce_buttons: false });
        }

        const featureFlags = flags[0].value;
        res.json({
            use_tce_v2: !!featureFlags.use_tce_v2,
            enable_tce_buttons: !!featureFlags.enable_tce_buttons
        });
    } catch (error) {
        console.error('[CONFIG CONTROLLER GET ERR]', error);
        res.status(500).json({ error: 'Erro ao carregar configurações' });
    }
};

exports.updateFeatureFlags = async (req, res) => {
    try {
        const { use_tce_v2, enable_tce_buttons } = req.body;
        
        // Verifica se já existe
        const existing = await db.select().from(appSettings).where(eq(appSettings.key, 'feature_flags'));
        
        if (existing.length === 0) {
            await db.insert(appSettings).values({
                key: 'feature_flags',
                value: { use_tce_v2, enable_tce_buttons }
            });
        } else {
            const currentFlags = existing[0].value;
            await db.update(appSettings)
                .set({ 
                    value: { 
                        ...currentFlags, 
                        use_tce_v2: use_tce_v2 !== undefined ? use_tce_v2 : !!currentFlags.use_tce_v2, 
                        enable_tce_buttons: enable_tce_buttons !== undefined ? enable_tce_buttons : !!currentFlags.enable_tce_buttons 
                    } 
                })
                .where(eq(appSettings.key, 'feature_flags'));
        }

        res.json({ success: true, message: 'Configurações atualizadas com sucesso' });
    } catch (error) {
        console.error('[CONFIG CONTROLLER UPDATE ERR]', error);
        res.status(500).json({ error: 'Erro ao salvar configurações' });
    }
};

exports.getOccurrenceRules = async (req, res) => {
    try {
        const rules = await db.select().from(occurrenceRules);
        res.json(rules);
    } catch (error) {
        console.error('[CONFIG CONTROLLER RULES GET ERR]', error);
        res.status(500).json({ error: 'Erro ao carregar regras de ocorrências' });
    }
};

exports.updateOccurrenceRule = async (req, res) => {
    try {
        const { key } = req.params;
        const { name, daysLimit, descriptionTemplate, isActive } = req.body;

        const updateFields = {};
        if (name !== undefined) updateFields.name = name;
        if (daysLimit !== undefined) updateFields.daysLimit = Number(daysLimit);
        if (descriptionTemplate !== undefined) updateFields.descriptionTemplate = descriptionTemplate;
        if (isActive !== undefined) updateFields.isActive = !!isActive;
        updateFields.updatedAt = new Date();

        const [updated] = await db.update(occurrenceRules)
            .set(updateFields)
            .where(eq(occurrenceRules.key, key))
            .returning();

        if (!updated) {
            return res.status(404).json({ error: 'Regra de ocorrência não encontrada' });
        }

        res.json({ success: true, message: 'Regra atualizada com sucesso', rule: updated });
    } catch (error) {
        console.error('[CONFIG CONTROLLER RULE UPDATE ERR]', error);
        res.status(500).json({ error: 'Erro ao salvar regra de ocorrência' });
    }
};

exports.triggerOccurrenceCheck = async (req, res) => {
    try {
        await checkAllOccurrences();
        res.json({ success: true, message: 'Verificação de ocorrências executada com sucesso!' });
    } catch (error) {
        console.error('[CONFIG CONTROLLER TRIGGER CHECK ERR]', error);
        res.status(500).json({ error: 'Erro ao executar verificação de ocorrências' });
    }
};
