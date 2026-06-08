const { db } = require('../db');
const { internships, internshipOccurrences, occurrenceRules, keepAlive } = require('../db/schema');
const { eq, and, isNull, sql, inArray } = require('drizzle-orm');

// Helper para formatar data do formato YYYY-MM-DD para DD/MM/YYYY
function formatDatePtBR(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Helper para interpolar templates de descrição
function interpolateTemplate(template, data) {
    let result = template;
    for (const key in data) {
        result = result.replace(new RegExp(`{${key}}`, 'g'), data[key]);
    }
    return result;
}

const statusLabels = {
    DRAFT: 'Editando',
    DRAFT_BY_TEACHER: 'Rascunho Professor',
    WAITING_APPROVAL: 'Aguardando Aprovação',
    REVISION_REQUESTED: 'Revisão Solicitada',
    APPROVED: 'Aprovado',
    STARTED: 'Estagiando',
    FINISHED: 'Finalizado',
    ARCHIVED: 'Arquivado'
};

/**
 * Executa a verificação diária de ocorrências para todos os estágios ativos.
 */
async function checkAllOccurrences(description) {
    console.log('[OCCURRENCE CHECK] Iniciando verificação otimizada com 8 regras dinâmicas...');
    try {
        if (description) {
            try {
                await db.insert(keepAlive).values({ description });
                console.log(`[OCCURRENCE CHECK] Registro de keep_alive inserido: "${description}"`);
            } catch (keepAliveErr) {
                console.error('[OCCURRENCE CHECK] Erro ao inserir registro de keep_alive:', keepAliveErr);
            }
        }
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const today = new Date(todayStr);

        // 1. Carregar regras cadastradas no banco de dados
        const dbRules = await db.select().from(occurrenceRules);
        const rulesMap = new Map(dbRules.map(r => [r.key, r]));

        // 2. Buscar todos os estágios não deletados
        const activeInternships = await db.select()
            .from(internships)
            .where(isNull(internships.deletedAt));

        // 3. Buscar todas as ocorrências ativas (não resolvidas)
        const openOccurrences = await db.select()
            .from(internshipOccurrences)
            .where(isNull(internshipOccurrences.resolvedAt));

        // Mapear ocorrências ativas por `${internshipId}_${ruleKey}` -> ocorrência
        const openOccMap = new Map();
        for (const occ of openOccurrences) {
            openOccMap.set(`${occ.internshipId}_${occ.ruleKey}`, occ);
        }

        const occurrencesToInsert = [];
        const occurrenceIdsToResolve = [];

        for (const internship of activeInternships) {
            const internshipId = internship.id;
            const status = internship.status;
            
            // --- REGRA 1: Data de Início Vencida (Não Iniciado) ---
            // se internships.status != 'STARTED' ou != 'FINISHED' ou != 'ARCHIVED' mas internships.start_date já passou x dias
            const r1 = rulesMap.get('start_date_passed_not_started') || { daysLimit: 0, isActive: true, descriptionTemplate: 'A data de início ({date}) já venceu há mais de {days_limit} dias, mas o status é {status}.' };
            let rule1Met = false;
            let rule1Desc = '';
            if (r1.isActive && internship.startDate) {
                const startLimit = new Date(internship.startDate);
                startLimit.setDate(startLimit.getDate() + r1.daysLimit);
                const isPastStart = startLimit <= today;
                const isNotStarted = !['STARTED', 'FINISHED', 'ARCHIVED'].includes(status);
                rule1Met = isPastStart && isNotStarted;
                if (rule1Met) {
                    rule1Desc = interpolateTemplate(r1.descriptionTemplate, {
                        date: formatDatePtBR(internship.startDate),
                        days_limit: r1.daysLimit,
                        status: statusLabels[status] || status
                    });
                }
            }

            // --- REGRA 2: Data de Término Vencida (Não Finalizado) ---
            // se internships.status != 'FINISHED' ou != 'ARCHIVED' mas internships.end_date já passou x dias
            const r2 = rulesMap.get('end_date_passed_not_finished') || { daysLimit: 0, isActive: true, descriptionTemplate: 'A data de término ({date}) já passou há mais de {days_limit} dias, mas o status é {status}.' };
            let rule2Met = false;
            let rule2Desc = '';
            if (r2.isActive && internship.endDate) {
                const endLimit = new Date(internship.endDate);
                endLimit.setDate(endLimit.getDate() + r2.daysLimit);
                const isPastEnd = endLimit <= today;
                const isNotFinished = !['FINISHED', 'ARCHIVED'].includes(status);
                rule2Met = isPastEnd && isNotFinished;
                if (rule2Met) {
                    rule2Desc = interpolateTemplate(r2.descriptionTemplate, {
                        date: formatDatePtBR(internship.endDate),
                        days_limit: r2.daysLimit,
                        status: statusLabels[status] || status
                    });
                }
            }

            // --- REGRA 3: Rascunho sem movimentações ---
            // se internships.status = 'DRAFT' ou 'DRAFT_BY_TEACHER' e internships.updated_at a mais de x dias
            const r3 = rulesMap.get('draft_inactive_limit') || { daysLimit: 7, isActive: true, descriptionTemplate: 'Este contrato está em rascunho sem movimentações desde {date} (há mais de {days_limit} dias).' };
            let rule3Met = false;
            let rule3Desc = '';
            if (r3.isActive) {
                const updateLimit = new Date(internship.updatedAt);
                updateLimit.setDate(updateLimit.getDate() + r3.daysLimit);
                const isDraft = ['DRAFT', 'DRAFT_BY_TEACHER'].includes(status);
                rule3Met = isDraft && updateLimit < now;
                if (rule3Met) {
                    rule3Desc = interpolateTemplate(r3.descriptionTemplate, {
                        date: new Date(internship.updatedAt).toLocaleDateString('pt-BR'),
                        days_limit: r3.daysLimit
                    });
                }
            }

            // --- REGRA 4: Aguardando Aprovação sem movimentações ---
            // se internships.status = 'WAITING_APPROVAL' e internships.updated_at a mais de x dias
            const r4 = rulesMap.get('waiting_approval_inactive_limit') || { daysLimit: 5, isActive: true, descriptionTemplate: 'Contrato aguardando aprovação sem movimentações desde {date} (há mais de {days_limit} dias).' };
            let rule4Met = false;
            let rule4Desc = '';
            if (r4.isActive) {
                const updateLimit = new Date(internship.updatedAt);
                updateLimit.setDate(updateLimit.getDate() + r4.daysLimit);
                rule4Met = (status === 'WAITING_APPROVAL') && updateLimit < now;
                if (rule4Met) {
                    rule4Desc = interpolateTemplate(r4.descriptionTemplate, {
                        date: new Date(internship.updatedAt).toLocaleDateString('pt-BR'),
                        days_limit: r4.daysLimit
                    });
                }
            }

            // --- REGRA 5: Revisão Solicitada sem movimentações ---
            // se internships.status = 'REVISION_REQUESTED' e internships.updated_at a mais de x dias
            const r5 = rulesMap.get('revision_requested_inactive_limit') || { daysLimit: 5, isActive: true, descriptionTemplate: 'Revisão solicitada sem movimentações desde {date} (há mais de {days_limit} dias).' };
            let rule5Met = false;
            let rule5Desc = '';
            if (r5.isActive) {
                const updateLimit = new Date(internship.updatedAt);
                updateLimit.setDate(updateLimit.getDate() + r5.daysLimit);
                rule5Met = (status === 'REVISION_REQUESTED') && updateLimit < now;
                if (rule5Met) {
                    rule5Desc = interpolateTemplate(r5.descriptionTemplate, {
                        date: new Date(internship.updatedAt).toLocaleDateString('pt-BR'),
                        days_limit: r5.daysLimit
                    });
                }
            }

            // --- REGRA 6: Aprovado sem movimentações/sem iniciar ---
            // se internships.status = 'APPROVED' e internships.updated_at a mais de x dias
            const r6 = rulesMap.get('approved_inactive_limit') || { daysLimit: 5, isActive: true, descriptionTemplate: 'Contrato aprovado há mais de {days_limit} dias ({date}), mas o status ainda não foi alterado.' };
            let rule6Met = false;
            let rule6Desc = '';
            if (r6.isActive) {
                const updateLimit = new Date(internship.updatedAt);
                updateLimit.setDate(updateLimit.getDate() + r6.daysLimit);
                rule6Met = (status === 'APPROVED') && updateLimit < now;
                if (rule6Met) {
                    rule6Desc = interpolateTemplate(r6.descriptionTemplate, {
                        date: new Date(internship.updatedAt).toLocaleDateString('pt-BR'),
                        days_limit: r6.daysLimit
                    });
                }
            }

            // --- REGRA 7: STARTED com término passado ---
            // se internships.status = 'STARTED' e internships.end_date já passou a mais de x dias
            const r7 = rulesMap.get('started_end_date_passed_limit') || { daysLimit: 0, isActive: true, descriptionTemplate: 'Estágio está com status \'Estagiando\' (STARTED), mas a data de término ({date}) já passou há mais de {days_limit} dias.' };
            let rule7Met = false;
            let rule7Desc = '';
            if (r7.isActive && internship.endDate) {
                const endLimit = new Date(internship.endDate);
                endLimit.setDate(endLimit.getDate() + r7.daysLimit);
                rule7Met = (status === 'STARTED') && endLimit <= today;
                if (rule7Met) {
                    rule7Desc = interpolateTemplate(r7.descriptionTemplate, {
                        date: formatDatePtBR(internship.endDate),
                        days_limit: r7.daysLimit
                    });
                }
            }

            // --- REGRA 8: FINISHED com data fim passada ---
            // se internships.status = 'FINISHED' e internships.end_date já passou a mais de x dias
            const r8 = rulesMap.get('finished_date_passed_limit') || { daysLimit: 15, isActive: true, descriptionTemplate: 'Estágio finalizado em {date} (há mais de {days_limit} dias), mas ainda não foi arquivado.' };
            let rule8Met = false;
            let rule8Desc = '';
            if (r8.isActive && internship.endDate) {
                const endLimit = new Date(internship.endDate);
                endLimit.setDate(endLimit.getDate() + r8.daysLimit);
                rule8Met = (status === 'FINISHED') && endLimit <= today;
                if (rule8Met) {
                    rule8Desc = interpolateTemplate(r8.descriptionTemplate, {
                        date: formatDatePtBR(internship.endDate),
                        days_limit: r8.daysLimit
                    });
                }
            }

            const rules = [
                { key: 'start_date_passed_not_started', met: rule1Met, description: rule1Desc, active: r1.isActive },
                { key: 'end_date_passed_not_finished', met: rule2Met, description: rule2Desc, active: r2.isActive },
                { key: 'draft_inactive_limit', met: rule3Met, description: rule3Desc, active: r3.isActive },
                { key: 'waiting_approval_inactive_limit', met: rule4Met, description: rule4Desc, active: r4.isActive },
                { key: 'revision_requested_inactive_limit', met: rule5Met, description: rule5Desc, active: r5.isActive },
                { key: 'approved_inactive_limit', met: rule6Met, description: rule6Desc, active: r6.isActive },
                { key: 'started_end_date_passed_limit', met: rule7Met, description: rule7Desc, active: r7.isActive },
                { key: 'finished_date_passed_limit', met: rule8Met, description: rule8Desc, active: r8.isActive }
            ];

            // Avaliar cada regra
            for (const rule of rules) {
                const mapKey = `${internshipId}_${rule.key}`;
                const existing = openOccMap.get(mapKey);

                // Se a regra não estiver ativa no sistema, resolvemos qualquer pendência dela automaticamente
                if (!rule.active) {
                    if (existing) {
                        occurrenceIdsToResolve.push(existing.id);
                    }
                    continue;
                }

                if (rule.met) {
                    // Se atendeu aos critérios da regra e não houver ocorrência criada
                    if (!existing) {
                        occurrencesToInsert.push({
                            internshipId,
                            ruleKey: rule.key,
                            description: rule.description,
                            createdAt: new Date()
                        });
                    }
                } else {
                    // Se não atendeu e havia uma ocorrência ativa (pendente), resolve automaticamente
                    if (existing) {
                        occurrenceIdsToResolve.push(existing.id);
                    }
                }
            }
        }

        // 5. Salvar novos alertas em lote (Bulk Insert)
        if (occurrencesToInsert.length > 0) {
            await db.insert(internshipOccurrences).values(occurrencesToInsert);
        }

        // 6. Resolver alertas antigos em lote (Bulk Update)
        if (occurrenceIdsToResolve.length > 0) {
            await db.update(internshipOccurrences)
                .set({
                    resolvedAt: now,
                    resolvedBy: null
                })
                .where(inArray(internshipOccurrences.id, occurrenceIdsToResolve));
        }

        console.log(`[OCCURRENCE CHECK] Concluído de forma otimizada. Novas: ${occurrencesToInsert.length}, Auto-resolvidas: ${occurrenceIdsToResolve.length}`);
    } catch (error) {
        console.error('[OCCURRENCE CHECK ERROR] Falha ao executar verificação:', error);
    }
}

module.exports = {
    checkAllOccurrences
};
