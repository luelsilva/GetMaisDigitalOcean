const { db } = require('../db');
const { internships, internshipOccurrences, occurrenceRules } = require('../db/schema');
const { eq, and, isNull, sql } = require('drizzle-orm');

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
async function checkAllOccurrences() {
    console.log('[OCCURRENCE CHECK] Iniciando verificação com regras dinâmicas...');
    try {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const today = new Date(todayStr);

        // 1. Carregar regras cadastradas no banco de dados
        const dbRules = await db.select().from(occurrenceRules);
        const rulesMap = new Map(dbRules.map(r => [r.key, r]));

        // Buscar todos os estágios não deletados
        const activeInternships = await db.select()
            .from(internships)
            .where(isNull(internships.deletedAt));

        let newCount = 0;
        let autoResolvedCount = 0;

        for (const internship of activeInternships) {
            const internshipId = internship.id;
            const status = internship.status;
            
            // --- REGRA 1: Prazo de Edição Excedido ---
            const r1 = rulesMap.get('created_over_a_week_editing') || { daysLimit: 7, isActive: true, descriptionTemplate: 'Registro criado em {date} (há mais de {days_limit} dias), mas ainda está em edição.' };
            let rule1Met = false;
            let rule1Desc = '';
            if (r1.isActive) {
                const editLimit = new Date();
                editLimit.setDate(editLimit.getDate() - r1.daysLimit);
                const isEditing = ['DRAFT', 'DRAFT_BY_TEACHER', 'REVISION_REQUESTED'].includes(status);
                const isCreatedOverLimit = new Date(internship.createdAt) < editLimit;
                rule1Met = isEditing && isCreatedOverLimit;
                if (rule1Met) {
                    rule1Desc = interpolateTemplate(r1.descriptionTemplate, {
                        date: new Date(internship.createdAt).toLocaleDateString('pt-BR'),
                        days_limit: r1.daysLimit
                    });
                }
            }

            // --- REGRA 2: Data de Início Vencida ---
            const r2 = rulesMap.get('start_date_passed_not_started') || { daysLimit: 0, isActive: true, descriptionTemplate: 'A data de início ({date}) já venceu há mais de {days_limit} dias, mas o status do estágio é \'{status}\' (deveria ser \'Estagiando\' - STARTED).' };
            let rule2Met = false;
            let rule2Desc = '';
            if (r2.isActive && internship.startDate) {
                const startLimit = new Date(internship.startDate);
                // Adiciona o limite em dias (prazo tolerância)
                startLimit.setDate(startLimit.getDate() + r2.daysLimit);
                const isPastStart = startLimit <= today;
                const isNotStarted = !['STARTED', 'FINISHED', 'ARCHIVED'].includes(status);
                rule2Met = isPastStart && isNotStarted;
                if (rule2Met) {
                    rule2Desc = interpolateTemplate(r2.descriptionTemplate, {
                        date: formatDatePtBR(internship.startDate),
                        days_limit: r2.daysLimit,
                        status: statusLabels[status] || status
                    });
                }
            }

            // --- REGRA 3: Data de Término Vencida ---
            const r3 = rulesMap.get('end_date_passed_not_finished') || { daysLimit: 0, isActive: true, descriptionTemplate: 'A data de término ({date}) já passou há mais de {days_limit} dias, mas o estágio ainda não está marcado como \'{status}\' (FINISHED).' };
            let rule3Met = false;
            let rule3Desc = '';
            if (r3.isActive && internship.endDate) {
                const endLimit = new Date(internship.endDate);
                // Adiciona o limite em dias (prazo tolerância)
                endLimit.setDate(endLimit.getDate() + r3.daysLimit);
                const isPastEnd = endLimit <= today;
                const isNotFinished = !['FINISHED', 'ARCHIVED'].includes(status);
                rule3Met = isPastEnd && isNotFinished;
                if (rule3Met) {
                    rule3Desc = interpolateTemplate(r3.descriptionTemplate, {
                        date: formatDatePtBR(internship.endDate),
                        days_limit: r3.daysLimit,
                        status: statusLabels['FINISHED']
                    });
                }
            }

            const rules = [
                { key: 'created_over_a_week_editing', met: rule1Met, description: rule1Desc, active: r1.isActive },
                { key: 'start_date_passed_not_started', met: rule2Met, description: rule2Desc, active: r2.isActive },
                { key: 'end_date_passed_not_finished', met: rule3Met, description: rule3Desc, active: r3.isActive }
            ];

            // Avaliar cada regra
            for (const rule of rules) {
                // Buscar ocorrência existente para este estágio e regra
                const [existing] = await db.select()
                    .from(internshipOccurrences)
                    .where(
                        and(
                            eq(internshipOccurrences.internshipId, internshipId),
                            eq(internshipOccurrences.ruleKey, rule.key)
                        )
                    )
                    .limit(1);

                // Se a regra não estiver ativa no sistema, resolvemos qualquer pendência dela automaticamente
                if (!rule.active) {
                    if (existing && !existing.resolvedAt) {
                        await db.update(internshipOccurrences)
                            .set({
                                resolvedAt: new Date(),
                                resolvedBy: null // Indica resolução automática pelo sistema (regra desativada)
                            })
                            .where(eq(internshipOccurrences.id, existing.id));
                        autoResolvedCount++;
                    }
                    continue;
                }

                if (rule.met) {
                    // Se atendeu aos critérios da regra e não houver ocorrência criada
                    if (!existing) {
                        await db.insert(internshipOccurrences).values({
                            internshipId,
                            ruleKey: rule.key,
                            description: rule.description,
                            createdAt: new Date()
                        });
                        newCount++;
                    }
                } else {
                    // Se não atendeu e havia uma ocorrência ativa (pendente), resolve automaticamente
                    if (existing && !existing.resolvedAt) {
                        await db.update(internshipOccurrences)
                            .set({
                                resolvedAt: new Date(),
                                resolvedBy: null
                            })
                            .where(eq(internshipOccurrences.id, existing.id));
                        autoResolvedCount++;
                    }
                }
            }

            // Atualizar status hasOccurrences do estágio
            const pendingOccurrences = await db.select()
                .from(internshipOccurrences)
                .where(
                    and(
                        eq(internshipOccurrences.internshipId, internshipId),
                        isNull(internshipOccurrences.resolvedAt)
                    )
                );

            const hasOccurrencesNow = pendingOccurrences.length > 0;

            if (internship.hasOccurrences !== hasOccurrencesNow) {
                await db.update(internships)
                    .set({ hasOccurrences: hasOccurrencesNow })
                    .where(eq(internships.id, internshipId));
            }
        }

        console.log(`[OCCURRENCE CHECK] Concluído. Novas: ${newCount}, Auto-resolvidas: ${autoResolvedCount}`);
    } catch (error) {
        console.error('[OCCURRENCE CHECK ERROR] Falha ao executar verificação:', error);
    }
}

module.exports = {
    checkAllOccurrences
};
