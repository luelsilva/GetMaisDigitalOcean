const { db, client } = require('../../src/db');
const schema = require('../../src/db/schema');
const fs = require('fs');
const path = require('path');

/**
 * Script para importar dados de arquivos CSV de volta para o banco de dados.
 * Altamente robusto, com logs detalhados e tratamento de tipos.
 */

async function importFromCSV() {
    const backupDir = path.join(__dirname, '../backups/csv');

    if (!fs.existsSync(backupDir)) {
        console.error(`[ERRO] Diretório de backups não encontrado: ${backupDir}`);
        process.exit(1);
    }

    const tablesToImport = [
        { name: 'profiles', table: schema.profiles },
        { name: 'menu_sections', table: schema.menuSections },
        { name: 'courses', table: schema.courses },
        { name: 'teachers', table: schema.teachers },
        { name: 'form_models', table: schema.formModels, base64Fields: ['config'] },
        //{ name: 'internships', table: schema.internships, base64Fields: ['jsonData'] },
        { name: 'menu_items', table: schema.menuItems },
        { name: 'course_teachers', table: schema.courseTeachers }
    ];


    console.log('--- Iniciando importação de CSV ---');

    for (const item of tablesToImport) {
        try {
            const files = fs.readdirSync(backupDir)
                .filter(f => f.startsWith(`${item.name}_`))
                .sort((a, b) => b.localeCompare(a));

            if (files.length === 0) {
                console.warn(`  [AVISO] Nenhum arquivo CSV encontrado para a tabela ${item.name}. Pulando...`);
                continue;
            }

            const latestFile = path.join(backupDir, files[0]);
            console.log(`[TABELA] ${item.name.toUpperCase()} (Arquivo: ${files[0]})`);

            const csvContent = fs.readFileSync(latestFile, 'utf8');
            const rows = parseCsv(csvContent);

            if (rows.length === 0) {
                console.log(`  - Arquivo vazio ou sem dados. Pulando...`);
                continue;
            }

            console.log(`  - Encontrados ${rows.length} registros para processar.`);

            // Processar campos
            const processedRows = rows.map((row, idx) => {
                const newRow = { ...row };

                Object.keys(newRow).forEach(key => {
                    let value = newRow[key];

                    if (value === '' || value === 'null' || value === undefined) {
                        newRow[key] = null;
                        return;
                    }

                    if (item.base64Fields && item.base64Fields.includes(key)) {
                        try {
                            const decoded = Buffer.from(value, 'base64').toString('utf8');
                            newRow[key] = JSON.parse(decoded);
                            return;
                        } catch (e) {
                            console.error(`    [ERRO LINHA ${idx + 1}] Falha JSON no campo ${key}:`, e.message);
                        }
                    }

                    const lowerKey = key.toLowerCase();
                    const isTimestamp = lowerKey.endsWith('at') || lowerKey === 'expires';
                    const isDateOnly = lowerKey.startsWith('data') || lowerKey.includes('date');

                    if (isTimestamp) {
                        const d = new Date(value);
                        if (!isNaN(d.getTime())) {
                            newRow[key] = d;
                            return;
                        }
                    } else if (isDateOnly) {
                        const d = new Date(value);
                        if (!isNaN(d.getTime())) {
                            // Formato YYYY-MM-DD para colunas do tipo DATE no Postgres
                            newRow[key] = d.toISOString().split('T')[0];
                            return;
                        }
                    }

                    if (value === 'true') { newRow[key] = true; return; }
                    if (value === 'false') { newRow[key] = false; return; }

                    if (key === 'code' || key === 'sectionId' || key === 'orderIndex' || key === 'matriculaAluno') {
                        const n = Number(value);
                        if (!isNaN(n)) { newRow[key] = n; return; }
                    }
                });

                return newRow;
            });

            if (processedRows.length > 0) {
                console.log('  - Exemplo do primeiro registro processado:', JSON.stringify(processedRows[0], (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));
            }

            // Inserção com tratamento de erro por linha se necessário
            let imported = 0;
            let failed = 0;

            const chunkSize = 20;
            for (let i = 0; i < processedRows.length; i += chunkSize) {
                const chunk = processedRows.slice(i, i + chunkSize);
                try {
                    await db.insert(item.table).values(chunk).onConflictDoNothing();
                    imported += chunk.length;
                } catch (err) {
                    console.error(`  - Lote de ${chunk.length} falhou, tentando um por um...`);
                    for (const singleRow of chunk) {
                        try {
                            await db.insert(item.table).values(singleRow).onConflictDoNothing();
                            imported++;
                        } catch (singleErr) {
                            failed++;
                            console.error(`    [ERRO REGISTRO]`, singleErr);
                        }
                    }
                }
            }

            console.log(`  - Resumo: ${imported} processados (com sucesso ou ignorados por conflito), ${failed} falhas.`);

        } catch (error) {
            console.error(`  [FALHA CRÍTICA] Tabela ${item.name}:`, error.message);
        }
    }

    console.log('\n--- Processo de importação finalizado ---');
    await client.end();
}

/**
 * Parser de CSV manual melhorado
 */
function parseCsv(csvString) {
    if (!csvString) return [];

    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;

    // Normalizar quebras de linha
    const content = csvString.replace(/\r\n/g, '\n');

    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        const next = content[i + 1];

        if (char === '"') {
            if (inQuotes && next === '"') {
                currentField += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentField);
            currentField = '';
        } else if (char === '\n' && !inQuotes) {
            currentRow.push(currentField);
            if (currentRow.length > 1 || currentRow[0] !== '') {
                rows.push(currentRow);
            }
            currentRow = [];
            currentField = '';
        } else {
            currentField += char;
        }
    }

    if (currentField !== '' || currentRow.length > 0) {
        currentRow.push(currentField);
        rows.push(currentRow);
    }

    if (rows.length < 2) return [];

    const headers = rows[0].map(h => h.trim());
    return rows.slice(1).map(row => {
        const obj = {};
        headers.forEach((h, i) => {
            if (h) obj[h] = row[i];
        });
        return obj;
    });
}

importFromCSV();
