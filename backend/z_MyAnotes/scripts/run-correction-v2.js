require('dotenv').config();
const { db } = require('../../src/db');
const { sql } = require('drizzle-orm');

async function run() {
    console.log('--- INICIANDO CORREÇÃO DO HISTÓRICO E UPDATED_AT (V2) ---');
    
    try {
        await db.transaction(async (tx) => {
            console.log('1. Desabilitando temporariamente os triggers específicos...');
            await tx.execute(sql`ALTER TABLE internships DISABLE TRIGGER internships_updated_at_trigger;`);
            await tx.execute(sql`ALTER TABLE internships DISABLE TRIGGER trigger_log_internships;`);

            console.log('2. Limpando registros do histórico indevidos (agrupando apenas por dados de negócio)...');
            // Removemos updated_at do PARTITION BY para agrupar as alterações de checagem junto com a última alteração legítima
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
                                last_modified_by
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

            console.log('3. Calculando e restaurando data legítima de modificação (updated_at) nos estágios...');
            // Lógica unificada para calcular a data real legítima de modificação
            await tx.execute(sql`
                WITH real_dates AS (
                    SELECT 
                        i.id AS internship_id,
                        COALESCE(
                            -- Caso A: Última alteração de antes do bug (06/06/2026)
                            (
                                SELECT MAX(h.changed_at)
                                FROM internships_history h
                                WHERE h.internship_id = i.id 
                                  AND h.changed_at < '2026-06-06 00:00:00-03'::timestamptz
                            ),
                            -- Caso B: Se todas as alterações forem de hoje em diante, pegamos o primeiro valor de updated_at antes da primeira alteração
                            (
                                SELECT MIN(h.updated_at)
                                FROM internships_history h
                                WHERE h.internship_id = i.id
                            ),
                            -- Caso C: Se não tiver histórico, mantemos o created_at original
                            i.created_at
                        ) AS real_updated_at
                    FROM internships i
                )
                UPDATE internships i
                SET updated_at = rd.real_updated_at
                FROM real_dates rd
                WHERE i.id = rd.internship_id;
            `);

            console.log('4. Reabilitando os triggers específicos...');
            await tx.execute(sql`ALTER TABLE internships ENABLE TRIGGER internships_updated_at_trigger;`);
            await tx.execute(sql`ALTER TABLE internships ENABLE TRIGGER trigger_log_internships;`);
        });

        console.log('--- CORREÇÃO V2 APLICADA COM SUCESSO NO BANCO DE DADOS ---');
        process.exit(0);
    } catch (err) {
        console.error('ERRO EXECUTANDO A CORREÇÃO NO BANCO:', err);
        process.exit(1);
    }
}

run();
