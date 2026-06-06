require('dotenv').config();

const { checkAllOccurrences } = require('../../src/services/occurrenceService');

async function test() {
    console.log('--- INICIANDO TESTE DA FUNÇÃO DE OCORRÊNCIAS ---');
    const start = Date.now();
    await checkAllOccurrences();
    const duration = Date.now() - start;
    console.log(`--- TESTE CONCLUÍDO COM SUCESSO EM ${duration}ms ---`);
    process.exit(0);
}

test().catch(err => {
    console.error('ERRO EXECUTANDO O TESTE:', err);
    process.exit(1);
});
