require('dotenv').config();
const { db, client } = require('../../src/db');
const { internships } = require('../../src/db/schema');
const { eq, sql } = require('drizzle-orm');
const fs = require('fs');
const path = require('path');

async function applyRecoveredDates() {
    console.log('--- INICIANDO APLICAÇÃO DE DATAS RECUPERADAS ---');

    try {
        const backupDir = path.join(__dirname, '../backups/csv');
        
        // Encontrar o arquivo CSV mais recente gerado pelo script anterior
        if (!fs.existsSync(backupDir)) {
            throw new Error('Diretório de backups não encontrado.');
        }

        const files = fs.readdirSync(backupDir)
            .filter(f => f.startsWith('recovered_internship_dates_') && f.endsWith('.csv'))
            .sort(); // Classifica em ordem alfabética (o timestamp faz o mais recente ficar por último)

        if (files.length === 0) {
            throw new Error('Nenhum arquivo CSV de recuperação de datas encontrado em backups/csv.');
        }

        const latestFile = files[files.length - 1];
        const csvPath = path.join(backupDir, latestFile);
        console.log(`Lendo dados do arquivo: ${latestFile}`);

        // Ler e analisar o CSV
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        const lines = csvContent.split('\n').filter(line => line.trim() !== '');

        if (lines.length <= 1) {
            console.log('O arquivo CSV está vazio ou contém apenas o cabeçalho.');
            return;
        }

        const itemsToUpdate = [];

        // Ignorar o cabeçalho (i = 0)
        for (let i = 1; i < lines.length; i++) {
            const [id, createdAtStr, updatedAtStr, status] = lines[i].split(';');
            
            if (status && status.trim() === 'deu certo') {
                itemsToUpdate.push({
                    id: id.trim(),
                    createdAt: createdAtStr.trim(),
                    updatedAt: updatedAtStr.trim()
                });
            }
        }

        console.log(`Total de registros prontos para atualizar: ${itemsToUpdate.length}`);

        if (itemsToUpdate.length === 0) {
            console.log('Nenhum registro com status "deu certo" para atualizar.');
            return;
        }

        let successCount = 0;
        let failCount = 0;

        // 1. Desabilitar o trigger de updated_at para permitir a gravação das datas originais
        console.log('Desabilitando trigger internships_updated_at_trigger...');
        await db.execute(sql`ALTER TABLE internships DISABLE TRIGGER internships_updated_at_trigger;`);

        try {
            // 2. Rodar um a um para atualizar e conferir se deu certo
            for (let i = 0; i < itemsToUpdate.length; i++) {
                const item = itemsToUpdate[i];
                try {
                    const result = await db.update(internships)
                        .set({
                            createdAt: new Date(item.createdAt),
                            updatedAt: new Date(item.updatedAt)
                        })
                        .where(eq(internships.id, item.id));

                    console.log(`[${i + 1}/${itemsToUpdate.length}] Sucesso ao atualizar ID: ${item.id}`);
                    successCount++;
                } catch (updateError) {
                    console.error(`[${i + 1}/${itemsToUpdate.length}] FALHA ao atualizar ID: ${item.id}. Erro:`, updateError.message);
                    failCount++;
                }
            }
        } finally {
            // 3. Garantir que o trigger sempre seja reativado no final (mesmo se houver erro grave)
            console.log('Reabilitando trigger internships_updated_at_trigger...');
            await db.execute(sql`ALTER TABLE internships ENABLE TRIGGER internships_updated_at_trigger;`);
        }

        console.log('\n--- PROCESSO DE APLICAÇÃO FINALIZADO ---');
        console.log(`Atualizados com sucesso: ${successCount}`);
        console.log(`Falhas: ${failCount}`);

    } catch (error) {
        console.error('Erro durante o processamento geral:', error);
    } finally {
        // Encerrar a conexão com o banco de dados
        await client.end();
    }
}

applyRecoveredDates();
