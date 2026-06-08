require('dotenv').config();
const { db } = require('../../src/db');
const { sql } = require('drizzle-orm');

async function run() {
    console.log('--- INICIANDO CORREÇÃO DO HISTÓRICO E SCHEMA (TRANSAÇÃO DRIZZLE) ---');
    
    try {
        await db.transaction(async (tx) => {
            console.log('1. Desabilitando temporariamente os triggers específicos na tabela internships...');
            await tx.execute(sql`ALTER TABLE internships DISABLE TRIGGER internships_updated_at_trigger;`);
            await tx.execute(sql`ALTER TABLE internships DISABLE TRIGGER trigger_log_internships;`);

            console.log('2. Limpando registros redundantes do histórico...');
            await tx.execute(sql`
                WITH ranked_history AS (
                    SELECT 
                        history_id,
                        internship_id,
                        ROW_NUMBER() OVER (
                            PARTITION BY 
                                internship_id, 
                                user_id, 
                                student_registration, 
                                student_name, 
                                course_sigla, 
                                company_id, 
                                company_name, 
                                start_date, 
                                end_date, 
                                json_data, 
                                status, 
                                last_modified_by, 
                                updated_at 
                            ORDER BY changed_at ASC
                        ) as rn
                    FROM internships_history
                )
                DELETE FROM internships_history
                WHERE history_id IN (
                    SELECT history_id 
                    FROM ranked_history 
                    WHERE rn > 1
                );
            `);

            console.log('3. Restaurando a data real de modificação (updated_at) das internships...');
            await tx.execute(sql`
                WITH latest_history AS (
                    SELECT DISTINCT ON (internship_id)
                        internship_id,
                        changed_at
                    FROM internships_history
                    ORDER BY internship_id, changed_at DESC
                )
                UPDATE internships i
                SET updated_at = lh.changed_at
                FROM latest_history lh
                WHERE i.id = lh.internship_id;
            `);

            await tx.execute(sql`
                UPDATE internships i
                SET updated_at = i.created_at
                WHERE i.id NOT IN (SELECT DISTINCT internship_id FROM internships_history);
            `);

            console.log('4. Removendo a coluna redundante has_occurrences...');
            await tx.execute(sql`ALTER TABLE internships DROP COLUMN IF EXISTS has_occurrences;`);

            console.log('5. Reabilitando os triggers específicos...');
            await tx.execute(sql`ALTER TABLE internships ENABLE TRIGGER internships_updated_at_trigger;`);
            await tx.execute(sql`ALTER TABLE internships ENABLE TRIGGER trigger_log_internships;`);
        });

        console.log('--- CORREÇÃO APLICADA COM SUCESSO NO BANCO DE DADOS ---');
        process.exit(0);
    } catch (err) {
        console.error('ERRO EXECUTANDO A CORREÇÃO NO BANCO:', err);
        process.exit(1);
    }
}

run();
