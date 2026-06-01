const fs = require('fs');
const path = require('path');
const https = require('https');

// Caminhos
const csvPath = path.join(__dirname, 'cursos_links.csv');
const dataDir = path.join(__dirname, 'data');

/**
 * Faz o download de um arquivo a partir de uma URL e o salva no caminho de destino.
 * Trata redirecionamentos automaticamente.
 * @param {string} url - URL para download
 * @param {string} destPath - Caminho onde o arquivo será salvo
 * @returns {Promise<void>}
 */
function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            // Tratar redirecionamento (status 301, 302, 303, 307 ou 308)
            if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
                const redirectUrl = response.headers.location;
                if (redirectUrl) {
                    downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
                    return;
                }
            }

            if (response.statusCode !== 200) {
                reject(new Error(`Falha no download (Status: ${response.statusCode}) para a URL: ${url}`));
                return;
            }

            const fileStream = fs.createWriteStream(destPath);
            response.pipe(fileStream);

            fileStream.on('finish', () => {
                fileStream.close();
                resolve();
            });

            fileStream.on('error', (err) => {
                // Remover arquivo parcialmente baixado em caso de erro
                fs.unlink(destPath, () => {});
                reject(err);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

/**
 * Converte um link de visualização/edição de planilha Google para o link de exportação em CSV
 * @param {string} url - URL original do Google Sheets
 * @returns {string|null} - URL de exportação CSV ou null se inválido
 */
function getCsvExportUrl(url) {
    const spreadsheetIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!spreadsheetIdMatch) {
        return null;
    }
    const spreadsheetId = spreadsheetIdMatch[1];
    
    // Tenta capturar o gid do parâmetro da query ou hash (ex: gid=349322359 ou #gid=349322359)
    const gidMatch = url.match(/[?&#]gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : '0';

    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
}

async function startDownload() {
    console.log('--- Iniciando download das planilhas de cursos ---');

    if (!fs.existsSync(csvPath)) {
        console.error(`[ERRO] Arquivo de links não encontrado: ${csvPath}`);
        process.exit(1);
    }

    // Criar diretório data se não existir
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log(`[PASTA] Diretório criado: ${dataDir}`);
    }

    try {
        const fileContent = fs.readFileSync(csvPath, 'utf8');
        const lines = fileContent.split(/\r?\n/);
        
        let successCount = 0;
        let failCount = 0;

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine.startsWith('#')) {
                continue; // Pular linhas vazias ou comentários
            }

            const parts = trimmedLine.split(',');
            if (parts.length < 2) {
                console.warn(`[AVISO] Linha inválida pulada: "${trimmedLine}"`);
                continue;
            }

            const sigla = parts[0].trim();
            const url = parts.slice(1).join(',').trim(); // Une o restante caso a URL contenha vírgulas

            const exportUrl = getCsvExportUrl(url);
            if (!exportUrl) {
                console.error(`[ERRO] Não foi possível extrair o ID da planilha para o curso: ${sigla}`);
                failCount++;
                continue;
            }

            const destPath = path.join(dataDir, `${sigla}.csv`);
            console.log(`[BAIXANDO] Curso: ${sigla.toUpperCase()}...`);
            
            try {
                await downloadFile(exportUrl, destPath);
                console.log(`  [OK] Salvo com sucesso em: ${path.basename(destPath)}`);
                successCount++;
            } catch (error) {
                console.error(`  [FALHA] Erro ao baixar curso ${sigla.toUpperCase()}:`, error.message);
                failCount++;
            }
        }

        console.log(`\n--- Resumo ---`);
        console.log(`Sucesso: ${successCount}`);
        console.log(`Falhas: ${failCount}`);
        console.log(`-----------------------------------------------`);
    } catch (error) {
        console.error('[ERRO CRÍTICO] Falha no processamento:', error.message);
    }
}

// Executar o script se chamado diretamente
if (require.main === module) {
    startDownload();
}

module.exports = {
    startDownload,
    downloadFile,
    getCsvExportUrl
};
