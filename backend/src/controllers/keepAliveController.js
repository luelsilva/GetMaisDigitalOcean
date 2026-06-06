const { db } = require('../db');
const { keepAlive } = require('../db/schema');
const config = require('../config');
const { checkAllOccurrences } = require('../services/occurrenceService');

const keepAliveController = {
    ping: async (req, res) => {
        try {
            // Insere um novo registro para manter o banco ativo
            await db.insert(keepAlive).values({
                createdAt: new Date()
            });

            res.status(200).json({
                status: 'success',
                message: 'Keep alive recorded',
                timestamp: new Date()
            });
        } catch (error) {
            console.error('[KEEP-ALIVE] Error:', error);
            res.status(500).json({ status: 'error', message: 'Database ping failed' });
        }
    },

    clear: async (req, res) => {
        try {
            const apiKey = req.headers['x-api-key'];
            console.log(apiKey);
            console.log(config.systemApiKey);

            if (!apiKey || apiKey !== config.systemApiKey) {
                return res.status(401).json({ status: 'error', message: 'Unauthorized' });
            }

            await db.delete(keepAlive);
            res.status(200).json({
                status: 'success',
                message: 'Keep alive table cleared'
            });
        } catch (error) {
            console.error('[KEEP-ALIVE] Clear Error:', error);
            res.status(500).json({ status: 'error', message: 'Failed to clear keep alive table' });
        }
    },

    checkOccurrences: async (req, res) => {
        try {
            const apiKey = req.headers['x-api-key'] || req.query.apiKey;

            if (!apiKey || apiKey !== config.systemApiKey) {
                return res.status(401).json({ status: 'error', message: 'Unauthorized' });
            }

            // Executa a verificação
            await checkAllOccurrences();

            res.status(200).json({
                status: 'success',
                message: 'Verificação de ocorrências concluída com sucesso'
            });
        } catch (error) {
            console.error('[SYSTEM] Error triggering occurrence check:', error);
            res.status(500).json({ status: 'error', message: 'Failed to check occurrences' });
        }
    }
};

module.exports = keepAliveController;
