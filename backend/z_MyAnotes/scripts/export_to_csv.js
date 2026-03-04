const { db, client } = require('../../src/db');
const schema = require('../../src/db/schema');
const fs = require('fs');
const path = require('path');

/**
 * Script para exportar dados das tabelas para CSV
 * Com conversão de JSON para Base64 nos campos específicos.
 */

async function exportToCSV() {
    const backupDir = path.join(__dirname, '../backups/csv');

    // Garantir que o diretório de backup existe
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    const tablesToExport = [
        //{ name: 'profiles', table: schema.profiles },
        //{ name: 'menu_sections', table: schema.menuSections },
        //{ name: 'menu_items', table: schema.menuItems },
        //{ name: 'courses', table: schema.courses },
        //{ name: 'teachers', table: schema.teachers },
        //{ name: 'course_teachers', table: schema.courseTeachers },
        //{ name: 'form_models', table: schema.formModels, base64Fields: ['config'] },
        { name: 'internships', table: schema.internships, base64Fields: ['jsonData'] }
    ];



    console.log('--- Iniciando exportação para CSV ---');

    for (const item of tablesToExport) {
        try {
            console.log(`Exportando: ${item.name}...`);
            const data = await db.select().from(item.table);

            if (data.length === 0) {
                console.log(`  Tabela ${item.name} está vazia. Criando arquivo apenas com cabeçalho.`);
            }

            // Processar campos Base64
            const processedData = data.map(row => {
                const newRow = { ...row };
                if (item.base64Fields) {
                    item.base64Fields.forEach(field => {
                        if (newRow[field]) {
                            const jsonStr = JSON.stringify(newRow[field]);
                            newRow[field] = Buffer.from(jsonStr).toString('base64');
                        }
                    });
                }
                return newRow;
            });

            // Gerar CSV
            const csvContent = jsonToCsv(processedData);
            const fileName = `${item.name}_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
            const filePath = path.join(backupDir, fileName);

            fs.writeFileSync(filePath, csvContent, 'utf8');
            console.log(`  Concluído! Salvo em: ${fileName}`);

        } catch (error) {
            console.error(`  Erro ao exportar ${item.name}:`, error);
        }
    }

    console.log('--- Exportação finalizada ---');
    await client.end();
}

/**
 * Converte um array de objetos para uma string CSV
 */
function jsonToCsv(items) {
    if (!items || items.length === 0) return '';

    const headers = Object.keys(items[0]);
    const csvRows = [headers.join(',')];

    for (const item of items) {
        const values = headers.map(header => {
            let val = item[header];

            if (val === null || val === undefined) {
                return '';
            }

            // Tratar strings e escapes para CSV
            let stringVal = String(val);

            // Se tiver vírgula, quebra de linha ou aspas, precisa envolver em aspas e escapar aspas internas
            if (stringVal.includes(',') || stringVal.includes('\n') || stringVal.includes('"')) {
                stringVal = `"${stringVal.replace(/"/g, '""')}"`;
            }

            return stringVal;
        });
        csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
}

exportToCSV();
