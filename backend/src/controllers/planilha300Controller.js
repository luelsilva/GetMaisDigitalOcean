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
 */
function toGoogleSheetsCsvUrl(url) {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) return null;
    const sheetId = match[1];
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
 *   SIGLA_planilha300_current.csv   ← versão recém-baixada (aguardando processamento)
 *   SIGLA_planilha300_previous.csv  ← última versão processada (baseline de comparação)
 */
function getPaths(sigla) {
    const base = sigla.toUpperCase();
    return {
        current:  path.join(SAVE_DIR, `${base}_planilha300_current.csv`),
        previous: path.join(SAVE_DIR, `${base}_planilha300_previous.csv`)
    };
}

/**
 * Compara dois arquivos CSV linha a linha.
 * Retorna true se forem idênticos.
 */
function csvSaoIguais(pathA, pathB) {
    const a = fs.readFileSync(pathA, 'utf8');
    const b = fs.readFileSync(pathB, 'utf8');
    return a === b;
}

// ─────────────────────────────────────────────────────────────────────────────
// ETAPA 1 — DOWNLOAD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ETAPA 1 — DOWNLOAD
 *
 * Verifica primeiro se existe QUALQUER arquivo current no diretório.
 * Se existir → há processamento pendente → aborta com mensagem.
 * Se não existir → baixa a planilha de cada curso (que tiver link) e salva como current.
 *
 * POST /api/planilhas300/sync
 */
exports.syncPlanilhas = async (req, res, next) => {
    try {
        ensureSaveDir();

        // ── Verificação global: algum current pendente? ──────────────────────
        const pendentesDePorcessamento = fs.readdirSync(SAVE_DIR)
            .filter(f => f.endsWith('_current.csv'));

        if (pendentesDePorcessamento.length > 0) {
            return res.status(409).json({
                message: 'Existem planilhas baixadas aguardando processamento. Execute /processar antes de sincronizar novamente.',
                pendentes: pendentesDePorcessamento
            });
        }
        // ─────────────────────────────────────────────────────────────────────

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
            const { current } = getPaths(curso.sigla);
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
                fs.writeFileSync(current, csvData, 'utf8');

                resultados.push({
                    sigla:    curso.sigla,
                    status:   'ok',
                    arquivo:  path.basename(current),
                    mensagem: 'Planilha baixada e salva como current.'
                });

            } catch (fetchErr) {
                resultados.push({
                    sigla:    curso.sigla,
                    status:   'erro',
                    mensagem: `Erro ao baixar: ${fetchErr.message}`
                });
            }
        }

        const baixados = resultados.filter(r => r.status === 'ok').length;
        const erros    = resultados.filter(r => r.status === 'erro').length;

        return res.json({
            message:   `Download concluído. ${baixados} baixado(s), ${erros} erro(s).`,
            diretorio: SAVE_DIR,
            resultados
        });

    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// ETAPA 2 — COMPARAÇÃO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Para cada curso:
 *   - previous não existe → nada (current é inédito, vai para processamento)
 *   - previous existe, current não → nada (não há novidade para comparar)
 *   - ambos existem → compara linha a linha:
 *       iguais     → deleta current (sem novidades, não precisa processar)
 *       diferentes → mantém current (há mudanças, passa para processamento)
 *
 * POST /api/planilhas300/comparar
 */
exports.compararPlanilhas = async (req, res, next) => {
    try {
        ensureSaveDir();

        const todosCursos = await db
            .select({ id: courses.id, sigla: courses.sigla })
            .from(courses)
            .where(isNotNull(courses.linkPlanilha300));

        const resultados = [];

        for (const curso of todosCursos) {
            const { current, previous } = getPaths(curso.sigla);

            const temCurrent  = fs.existsSync(current);
            const temPrevious = fs.existsSync(previous);

            // previous não existe → current é novidade absoluta, passa para processamento
            if (!temPrevious) {
                resultados.push({
                    sigla:    curso.sigla,
                    status:   'novo',
                    mensagem: temCurrent
                        ? 'Sem previous. Current é inédito e será processado.'
                        : 'Sem previous e sem current. Nada a fazer.'
                });
                continue;
            }

            // previous existe, current não → sem novidade
            if (!temCurrent) {
                resultados.push({
                    sigla:    curso.sigla,
                    status:   'sem_novidade',
                    mensagem: 'Previous existe mas não há current. Nada a fazer.'
                });
                continue;
            }

            // Ambos existem → compara
            const iguais = csvSaoIguais(current, previous);

            if (iguais) {
                fs.unlinkSync(current);
                resultados.push({
                    sigla:    curso.sigla,
                    status:   'sem_alteracao',
                    mensagem: 'Planilha idêntica ao previous. Current deletado. Nada a processar.'
                });
            } else {
                resultados.push({
                    sigla:    curso.sigla,
                    status:   'alterado',
                    mensagem: 'Planilha diferente do previous. Current mantido para processamento.'
                });
            }
        }

        const alterados    = resultados.filter(r => r.status === 'alterado').length;
        const semAlteracao = resultados.filter(r => r.status === 'sem_alteracao').length;
        const novos        = resultados.filter(r => r.status === 'novo' && fs.existsSync(getPaths(r.sigla).current)).length;

        return res.json({
            message:    `Comparação concluída. ${alterados + novos} para processar, ${semAlteracao} sem alteração.`,
            resultados
        });

    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// ETAPA 3 — PROCESSAMENTO  (a ser implementado)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Processa somente os cursos que possuem current.
 * Ao finalizar com sucesso, renomeia current → previous,
 * fechando o ciclo para a próxima execução de sync.
 *
 * POST /api/planilhas300/processar
 *
 * TODO: implementar a lógica de negócio do processamento.
 *       Ao concluir com sucesso cada curso, executar:
 *
 *         fs.renameSync(current, previous);
 *
 *       Isso garante que o próximo sync possa baixar novamente
 *       e que o previous fique como baseline de comparação.
 */
exports.processarPlanilhas = async (req, res, next) => {
    try {
        ensureSaveDir();

        const todosCursos = await db
            .select({ id: courses.id, sigla: courses.sigla })
            .from(courses)
            .where(isNotNull(courses.linkPlanilha300));

        const cursosComCurrent = todosCursos.filter(c => fs.existsSync(getPaths(c.sigla).current));

        if (cursosComCurrent.length === 0) {
            return res.json({ message: 'Nenhum current encontrado. Nada a processar.', resultados: [] });
        }

        const resultados = [];

        for (const curso of cursosComCurrent) {
            const { current, previous } = getPaths(curso.sigla);

            // ================================================================
            // TODO: inserir aqui a lógica de processamento do CSV do curso
            //       Ex: ler o CSV, comparar com o banco, atualizar registros...
            //
            // Exemplo de estrutura esperada:
            //
            //   const csvContent = fs.readFileSync(current, 'utf8');
            //   await processarCsvDoCurso(curso, csvContent);
            //
            // ================================================================

            // Após processamento bem-sucedido: current → previous (fecha o ciclo)
            fs.renameSync(current, previous);

            resultados.push({
                sigla:    curso.sigla,
                status:   'processado',
                mensagem: 'Processamento concluído. Current promovido a previous.'
            });
        }

        return res.json({
            message:   `${resultados.length} planilha(s) processada(s).`,
            resultados
        });

    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITÁRIO — LISTAGEM
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/planilhas300
 * Lista os arquivos CSV disponíveis no diretório, agrupados por curso.
 */
exports.listPlanilhas = async (req, res, next) => {
    try {
        ensureSaveDir();

        const files = fs.readdirSync(SAVE_DIR).filter(f => f.endsWith('.csv'));

        const grupos = {};
        for (const file of files) {
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

        return res.json({ diretorio: SAVE_DIR, cursos: grupos });
    } catch (error) {
        next(error);
    }
};
