require('dotenv').config();
const { db, client } = require('../../src/db');
const { internships, internshipsHistory } = require('../../src/db/schema');
const { eq, desc } = require('drizzle-orm');
const fs = require('fs');
const path = require('path');

async function recoverDates() {
    console.log('--- INICIANDO BUSCA DE DATAS NO HISTÓRICO ---');
    const csvRows = [];
    
    // Cabeçalho do CSV conforme solicitado
    csvRows.push('id do internships;created_at recuperada;updated_at recuperada;observacao');

    try {
        // Obter todos os estágios atuais
        console.log('Buscando todos os estágios da tabela internships...');
        const allInternships = await db.select({ id: internships.id }).from(internships);
        console.log(`Total de estágios encontrados: ${allInternships.length}`);

        let successCount = 0;
        let failCount = 0;

        // Iterar um a um
        for (const item of allInternships) {
            try {
                // Procurar no histórico pela última alteração (ordem decrescente da data de alteração)
                const historyEntry = await db.select({
                    createdAt: internshipsHistory.createdAt,
                    updatedAt: internshipsHistory.updatedAt
                })
                .from(internshipsHistory)
                .where(eq(internshipsHistory.internshipId, item.id))
                .orderBy(desc(internshipsHistory.changedAt))
                .limit(1);

                if (historyEntry && historyEntry.length > 0) {
                    const recoveredCreated = historyEntry[0].createdAt;
                    const recoveredUpdated = historyEntry[0].updatedAt;

                    const createdAtStr = recoveredCreated ? new Date(recoveredCreated).toISOString() : '';
                    const updatedAtStr = recoveredUpdated ? new Date(recoveredUpdated).toISOString() : '';

                    csvRows.push(`${item.id};${createdAtStr};${updatedAtStr};deu certo`);
                    successCount++;
                } else {
                    csvRows.push(`${item.id};;;falhou`);
                    failCount++;
                }
            } catch (err) {
                console.error(`Erro ao processar estágio ${item.id}:`, err);
                csvRows.push(`${item.id};;;falhou`);
                failCount++;
            }
        }

        // Caminho do CSV de destino
        const csvDir = path.join(__dirname, '../backups/csv');
        if (!fs.existsSync(csvDir)) {
            fs.mkdirSync(csvDir, { recursive: true });
        }
        
        const fileName = `recovered_internship_dates_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
        const filePath = path.join(csvDir, fileName);

        fs.writeFileSync(filePath, csvRows.join('\n'), 'utf8');

        console.log('\n--- PROCESSO CONCLUÍDO ---');
        console.log(`Sucessos: ${successCount}`);
        console.log(`Falhas: ${failCount}`);
        console.log(`Arquivo CSV salvo em: ${filePath}`);

    } catch (error) {
        console.error('Erro geral no processamento:', error);
    } finally {
        // Fechar conexão com o banco para encerrar o processo
        await client.end();
    }
}

recoverDates();
