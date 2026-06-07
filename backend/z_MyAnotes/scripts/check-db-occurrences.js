require('dotenv').config();
const { db } = require('../../src/db');
const { sql } = require('drizzle-orm');

async function check() {
    console.log('--- DIAGNÓSTICO DE OCORRÊNCIAS NO BANCO DE DADOS ---');
    try {
        // Query para obter estágios e a quantidade de ocorrências ativas
        const query = sql`
            SELECT 
                i.id,
                i.student_name,
                i.course_sigla,
                i.updated_at,
                i.status,
                COUNT(io.id) as active_alerts_count,
                string_agg(io.description, ' | ') as alert_descriptions
            FROM internships i
            JOIN internship_occurrences io ON io.internship_id = i.id
            WHERE io.resolved_at IS NULL AND i.deleted_at IS NULL
            GROUP BY i.id, i.student_name, i.course_sigla, i.updated_at, i.status
            ORDER BY active_alerts_count DESC
            LIMIT 5;
        `;

        const result = await db.execute(query);

        console.log(`Total de estágios com ocorrências ativas (amostra limitada a 5): ${result.length}\n`);

        if (result.length === 0) {
            console.log('Nenhuma ocorrência ativa encontrada no banco de dados no momento.');
            
            // Vamos listar o total geral na tabela de ocorrências
            const totalOcc = await db.execute(sql`SELECT COUNT(*) FROM internship_occurrences WHERE resolved_at IS NULL;`);
            console.log(`Total de ocorrências não resolvidas no banco: ${totalOcc[0].count}`);
        } else {
            result.forEach((row, index) => {
                console.log(`${index + 1}. Aluno: ${row.student_name} (${row.course_sigla})`);
                console.log(`   Status: ${row.status} | Modificado em: ${new Date(row.updated_at).toLocaleString('pt-BR')}`);
                console.log(`   Qtd Alertas Ativos: ${row.active_alerts_count}`);
                console.log(`   Descrição do(s) Alerta(s): ${row.alert_descriptions}`);
                console.log('-'.repeat(50));
            });
        }

        process.exit(0);
    } catch (err) {
        console.error('Erro ao consultar banco de dados:', err);
        process.exit(1);
    }
}

check();
