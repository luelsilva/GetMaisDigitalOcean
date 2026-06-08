require('dotenv').config();
const { db } = require('../../src/db');
const { internships, internshipOccurrences } = require('../../src/db/schema');
const { sql, isNull, and } = require('drizzle-orm');

async function test() {
    console.log('--- INSPECIONANDO MAPEAMENTO DE PROPRIEDADES DRIZZLE ---');
    try {
        const queryFields = {
            id: internships.id,
            studentName: internships.studentName,
            status: internships.status,
            hasOccurrences: sql`EXISTS (
                SELECT 1 FROM ${internshipOccurrences} io
                WHERE io.internship_id = "internships"."id" AND io.resolved_at IS NULL
            )`.mapWith(Boolean),
        };

        const drizzleQuery = db.select(queryFields)
            .from(internships)
            .where(
                and(
                    isNull(internships.deletedAt),
                    sql`EXISTS (
                        SELECT 1 FROM ${internshipOccurrences} io
                        WHERE io.internship_id = ${internships.id} AND io.resolved_at IS NULL
                    )`
                )
            )
            .limit(3);

        console.log('SQL Gerado pelo Drizzle:');
        console.log(drizzleQuery.toSQL());

        const result = await drizzleQuery;
        console.log('\nResultados da Query Drizzle:');
        console.log(JSON.stringify(result, null, 2));

        process.exit(0);
    } catch (err) {
        console.error('Erro ao executar query:', err);
        process.exit(1);
    }
}

test();
