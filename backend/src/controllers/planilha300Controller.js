const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const { db } = require('../db');
const { courses } = require('../db/schema');
const { isNotNull } = require('drizzle-orm');

// Diretório onde os CSVs serão salvos
const SAVE_DIR = path.join(__dirname, '..', 'data', 'planilhas_300');

/**
 * Converte um link do Google Sheets (qualquer formato) para a URL de exportação CSV.
 * Suporta:
 *   - https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=...
 *   - https://docs.google.com/spreadsheets/d/SHEET_ID/pub?...
 *   - https://docs.google.com/spreadsheets/d/SHEET_ID/...
 */
function toGoogleSheetsCsvUrl(url) {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) return null;

    const sheetId = match[1];

    // Extrair gid (aba específica), se presente
    const gidMatch = url.match(/[?&#]gid=(\d+)/);
    const gid = gidMatch ? gidMatch[1] : '0';

    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

/**
 * Garante que o diretório de destino exista.
 */
function ensureSaveDir() {
    if (!fs.existsSync(SAVE_DIR)) {
        fs.mkdirSync(SAVE_DIR, { recursive: true });
    }
}

/**
 * Retorna os caminhos padronizados para os arquivos de um curso.
 * Ex:  TDS_planilha300_current.csv   ← versão atual
 *      TDS_planilha300_previous.csv  ← versão anterior (para comparação)
 */
function getPaths(sigla) {
    const base = sigla.toUpperCase();
    return {
        current:  path.join(SAVE_DIR, `${base}_planilha300_current.csv`),
        previous: path.join(SAVE_DIR, `${base}_planilha300_previous.csv`)
    };
}

/**
 * Rotaciona os arquivos:
 *   current  →  previous  (sobrescreve o previous anterior)
 *   novo CSV →  current
 */
function rotateCsv(sigla, novoCsv) {
    const { current, previous } = getPaths(sigla);

    // Se já existe um current, promove para previous
    if (fs.existsSync(current)) {
        fs.renameSync(current, previous);
    }

    // Salva o novo conteúdo como current
    fs.writeFileSync(current, novoCsv, 'utf8');
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/planilhas300/sync
 * Baixa/atualiza os CSVs de todos os cursos com link_planilha_300 cadastrado.
 * Rotaciona: current → previous, novo download → current.
 */
exports.syncPlanilhas = async (req, res, next) => {
    try {
        ensureSaveDir();

        // 1. Buscar cursos com link preenchido
        const cursosComLink = await db
            .select({
                id:              courses.id,
                sigla:           courses.sigla,
                name:            courses.name,
                linkPlanilha300: courses.linkPlanilha300
            })
            .from(courses)
            .where(isNotNull(courses.linkPlanilha300));

        if (cursosComLink.length === 0) {
            return res.json({
                message: 'Nenhum curso com link de planilha cadastrado.',
                resultados: []
            });
        }

        const resultados = [];

        for (const curso of cursosComLink) {
            const link   = curso.linkPlanilha300.trim();
            const csvUrl = toGoogleSheetsCsvUrl(link);

            if (!csvUrl) {
                resultados.push({
                    sigla:    curso.sigla,
                    status:   'erro',
                    mensagem: `Link inválido: não foi possível extrair o ID da planilha. URL: ${link}`
                });
                continue;
            }

            try {
                const response = await fetch(csvUrl, { redirect: 'follow' });

                if (!response.ok) {
                    resultados.push({
                        sigla:    curso.sigla,
                        status:   'erro',
                        mensagem: `HTTP ${response.status} ao baixar a planilha.`
                    });
                    continue;
                }

                const csvData = await response.text();

                // Rotaciona: current → previous, novo → current
                const { current, previous } = getPaths(curso.sigla);
                const haviaPrevious = fs.existsSync(current); // antes de rotacionar
                rotateCsv(curso.sigla, csvData);

                resultados.push({
                    sigla:    curso.sigla,
                    status:   'ok',
                    current:  path.basename(current),
                    previous: haviaPrevious ? path.basename(previous) : null,
                    mensagem: haviaPrevious
                        ? 'Planilha atualizada. Versão anterior salva como previous.'
                        : 'Primeira versão da planilha salva.'
                });

            } catch (fetchErr) {
                resultados.push({
                    sigla:    curso.sigla,
                    status:   'erro',
                    mensagem: `Erro ao baixar: ${fetchErr.message}`
                });
            }
        }

        const sucessos = resultados.filter(r => r.status === 'ok').length;
        const erros    = resultados.filter(r => r.status === 'erro').length;

        return res.json({
            message:    `Sincronização concluída. ${sucessos} planilha(s) atualizada(s), ${erros} erro(s).`,
            diretorio:  SAVE_DIR,
            resultados
        });

    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/planilhas300
 * Lista os arquivos CSV disponíveis no diretório, agrupados por curso.
 */
exports.listPlanilhas = async (req, res, next) => {
    try {
        ensureSaveDir();

        const files = fs.readdirSync(SAVE_DIR).filter(f => f.endsWith('.csv'));

        // Agrupar por sigla do curso
        const grupos = {};
        for (const file of files) {
            // Padrão esperado: SIGLA_planilha300_(current|previous).csv
            const match = file.match(/^([A-Z0-9]+)_planilha300_(current|previous)\.csv$/);
            if (!match) continue;

            const [, sigla, tipo] = match;
            if (!grupos[sigla]) grupos[sigla] = {};

            const stat = fs.statSync(path.join(SAVE_DIR, file));
            grupos[sigla][tipo] = {
                arquivo:           file,
                tamanhoBytes:      stat.size,
                ultimaModificacao: stat.mtime
            };
        }

        return res.json({
            diretorio: SAVE_DIR,
            cursos:    grupos
        });

    } catch (error) {
        next(error);
    }
};
