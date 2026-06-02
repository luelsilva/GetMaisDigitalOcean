#!/usr/bin/env node
/**
 * generate-internal-token.js
 *
 * Gera um INTERNAL_TOKEN seguro e atualiza os dois .env automaticamente:
 *   - GetMaisDigitalOcean/backend/.env
 *   - processador-alunos/backend/.env
 *
 * Uso:
 *   node z_MyAnotes/scripts/generate-internal-token.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ─── Caminhos dos dois .env ──────────────────────────────────────────────────
// __dirname = GetMaisDigitalOcean/backend/z_MyAnotes/scripts
// subindo 4 níveis chegamos na pasta pai de GetMaisDigitalOcean e processador-alunos
const ROOT = path.resolve(__dirname, '../../../..'); // pasta pai dos dois repos

const ENV_FILES = [
    path.join(ROOT, 'GetMaisDigitalOcean', 'backend', '.env'),
    path.join(ROOT, 'processador-alunos', 'backend', '.env'),
];

// ─── Gerar token ─────────────────────────────────────────────────────────────
const token = crypto.randomBytes(32).toString('hex');

console.log('\n🔑 Token gerado:');
console.log(`   ${token}`);
console.log('');

// ─── Atualizar cada .env ─────────────────────────────────────────────────────
let atualizados = 0;

for (const envPath of ENV_FILES) {
    if (!fs.existsSync(envPath)) {
        console.warn(`⚠️  Arquivo não encontrado: ${envPath}`);
        continue;
    }

    let content = fs.readFileSync(envPath, 'utf8');

    if (content.includes('INTERNAL_TOKEN=')) {
        // Substituir valor existente
        content = content.replace(/^INTERNAL_TOKEN=.*/m, `INTERNAL_TOKEN=${token}`);
        console.log(`✅ Atualizado: ${envPath}`);
    } else {
        // Adicionar ao final se não existir
        content += `\nINTERNAL_TOKEN=${token}\n`;
        console.log(`✅ Adicionado: ${envPath}`);
    }

    fs.writeFileSync(envPath, content, 'utf8');
    atualizados++;
}

console.log(`\n✔  ${atualizados} arquivo(s) atualizado(s).`);
console.log('   Reinicie os containers para aplicar o novo token.\n');
