/**
 * check-dates.js
 * 
 * Lê todos os registros da tabela internships e compara:
 *   json_data.dt_inicio  vs  start_date
 *   json_data.dt_fim     vs  end_date
 * 
 * Exibe no console apenas os registros com datas divergentes.
 * Não faz nenhuma alteração no banco.
 * 
 * Uso:
 *   node z_MyAnotes/scripts/check-dates.js
 */

require('dotenv').config();
const { db } = require('../../src/db');
const { sql } = require('drizzle-orm');

// ─── Normaliza qualquer representação de data para "YYYY-MM-DD" ──────────────
function toISO(value) {
    if (!value) return null;
    // Se já for string no formato YYYY-MM-DD (vindo do campo date do PG)
    if (typeof value === 'string') {
        // Remove sufixo de hora caso venha como "2025-06-15T00:00:00..."
        return value.split('T')[0];
    }
    // Se for objeto Date
    if (value instanceof Date) {
        return value.toISOString().split('T')[0];
    }
    return null;
}

async function check() {
    console.log('='.repeat(60));
    console.log('  VERIFICAÇÃO DE DATAS: internships vs json_data');
    console.log('='.repeat(60));

    try {
        const rows = await db.execute(sql`
            SELECT
                id,
                student_name,
                course_sigla,
                status,
                start_date,
                end_date,
                json_data
            FROM internships
            WHERE deleted_at IS NULL
            ORDER BY student_name
        `);

        console.log(`\nTotal de registros analisados: ${rows.length}\n`);

        let divergentes = 0;

        for (const row of rows) {
            const json = row.json_data || {};

            const dbInicio = toISO(row.start_date);
            const dbFim    = toISO(row.end_date);
            const jsInicio = toISO(json.dt_inicio);
            const jsFim    = toISO(json.dt_fim);

            const inicioDiverge = jsInicio && dbInicio && jsInicio !== dbInicio;
            const fimDiverge    = jsFim    && dbFim    && jsFim    !== dbFim;

            if (inicioDiverge || fimDiverge) {
                divergentes++;
                console.log(`[${divergentes}] ${row.student_name} (${row.course_sigla}) — status: ${row.status}`);
                console.log(`    ID: ${row.id}`);

                if (inicioDiverge) {
                    console.log(`    ❌ dt_inicio  json: ${jsInicio}  |  start_date banco: ${dbInicio}`);
                }
                if (fimDiverge) {
                    console.log(`    ❌ dt_fim     json: ${jsFim}     |  end_date   banco: ${dbFim}`);
                }

                // Informação extra: mostra quando json tem data mas banco não tem (ou vice-versa)
                if (jsInicio && !dbInicio) {
                    console.log(`    ⚠️  dt_inicio no json (${jsInicio}) mas start_date no banco é NULL`);
                }
                if (!jsInicio && dbInicio) {
                    console.log(`    ⚠️  start_date no banco (${dbInicio}) mas dt_inicio no json é NULL/ausente`);
                }
                if (jsFim && !dbFim) {
                    console.log(`    ⚠️  dt_fim no json (${jsFim}) mas end_date no banco é NULL`);
                }
                if (!jsFim && dbFim) {
                    console.log(`    ⚠️  end_date no banco (${dbFim}) mas dt_fim no json é NULL/ausente`);
                }

                console.log('-'.repeat(60));
            }
        }

        if (divergentes === 0) {
            console.log('✅ Nenhuma divergência encontrada. Todas as datas estão consistentes.');
        } else {
            console.log(`\n⚠️  Total de registros com divergência: ${divergentes} de ${rows.length}`);
        }

        process.exit(0);
    } catch (err) {
        console.error('Erro ao consultar banco de dados:', err);
        process.exit(1);
    }
}

check();
