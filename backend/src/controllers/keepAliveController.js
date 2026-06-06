const config = require('../config');
const { checkAllOccurrences } = require('../services/occurrenceService');

const keepAliveController = {
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
