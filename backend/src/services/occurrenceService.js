const { db } = require('../db');
const { internships, internshipOccurrences } = require('../db/schema');
const { eq, and, isNull, sql } = require('drizzle-orm');

// Helper para formatar data do formato YYYY-MM-DD para DD/MM/YYYY
function formatDatePtBR(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Executa a verificação diária de ocorrências para todos os estágios ativos.
 */
async function checkAllOccurrences() {
    console.log('[OCCURRENCE CHECK] Iniciando verificação diária...');
    try {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const today = new Date(todayStr);

        // Buscar todos os estágios não deletados
        const activeInternships = await db.select()
            .from(internships)
            .where(isNull(internships.deletedAt));

        let newCount = 0;
        let autoResolvedCount = 0;

        for (const internship of activeInternships) {
            const internshipId = internship.id;
            const status = internship.status;
            
            // 1. Regra: Criado há mais de uma semana mas ainda está em edição
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const isEditing = ['DRAFT', 'DRAFT_BY_TEACHER', 'REVISION_REQUESTED'].includes(status);
            const isCreatedOverAWeek = new Date(internship.createdAt) < oneWeekAgo;
            const rule1Met = isEditing && isCreatedOverAWeek;

            // 2. Regra: Data de início já passou mas o status não é STARTED
            let rule2Met = false;
            if (internship.startDate) {
                const startDate = new Date(internship.startDate);
                const isPastStart = startDate <= today;
                const isNotStarted = !['STARTED', 'FINISHED', 'ARCHIVED'].includes(status);
                rule2Met = isPastStart && isNotStarted;
            }

            // 3. Regra: Data de término já passou mas o status não é FINISHED
            let rule3Met = false;
            if (internship.endDate) {
                const endDate = new Date(internship.endDate);
                const isPastEnd = endDate <= today;
                const isNotFinished = !['FINISHED', 'ARCHIVED'].includes(status);
                rule3Met = isPastEnd && isNotFinished;
            }

            const rules = [
                {
                    key: 'created_over_a_week_editing',
                    met: rule1Met,
                    description: `Registro criado em ${new Date(internship.createdAt).toLocaleDateString('pt-BR')} (há mais de uma semana), mas ainda está em edição.`
                },
                {
                    key: 'start_date_passed_not_started',
                    met: rule2Met,
                    description: `A data de início (${formatDatePtBR(internship.startDate)}) já venceu, mas o status do estágio é '${status}' (deveria ser 'Estagiando' - STARTED).`
                },
                {
                    key: 'end_date_passed_not_finished',
                    met: rule3Met,
                    description: `A data de término (${formatDatePtBR(internship.endDate)}) já passou, mas o estágio ainda não está marcado como 'Finalizado' (FINISHED).`
                }
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

                if (rule.met) {
                    // Se a condição for atendida e não houver nenhuma ocorrência registrada, cria uma nova pendência
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
                    // Se a condição NÃO for atendida mas houver uma ocorrência pendente (não resolvida), resolve-a automaticamente
                    if (existing && !existing.resolvedAt) {
                        await db.update(internshipOccurrences)
                            .set({
                                resolvedAt: new Date(),
                                resolvedBy: null // Indica resolução automática pelo sistema
                            })
                            .where(eq(internshipOccurrences.id, existing.id));
                        autoResolvedCount++;
                    }
                }
            }

            // Atualizar o campo has_occurrences na tabela internships
            // Verifica se existe alguma ocorrência pendente (sem resolved_at)
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
