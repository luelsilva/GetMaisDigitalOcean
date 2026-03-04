const { client } = require('../db');

const dbController = {
    getStats: async (req, res) => {
        try {
            // Pegar lista de tabelas do schema public
            const tablesResult = await client`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
                ORDER BY table_name;
            `;

            const stats = [];

            for (const table of tablesResult) {
                const countResult = await client.unsafe(`SELECT count(*) FROM "${table.table_name}"`);
                stats.push({
                    name: table.table_name,
                    count: parseInt(countResult[0].count)
                });
            }

            res.json({
                database: 'PostgreSQL (Supabase)',
                tables: stats,
                totalTables: stats.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('[DB Controller] Erro ao obter estatísticas:', error);
            res.status(500).json({ error: 'Erro ao obter estatísticas do banco de dados' });
        }
    }
};

module.exports = dbController;
