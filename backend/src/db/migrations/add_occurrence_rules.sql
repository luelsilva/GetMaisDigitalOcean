-- Migration: Create occurrence_rules table and seed the 8 default rules

CREATE TABLE IF NOT EXISTS "occurrence_rules" (
    "key" VARCHAR(50) PRIMARY KEY,
    "name" VARCHAR(100) NOT NULL,
    "days_limit" INTEGER NOT NULL DEFAULT 0,
    "description_template" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE "occurrence_rules" ENABLE ROW LEVEL SECURITY;

INSERT INTO "occurrence_rules" ("key", "name", "days_limit", "description_template", "is_active") VALUES
('start_date_passed_not_started', 'Data de Início Vencida (Não Iniciado)', 0, 'A data de início ({date}) já venceu há mais de {days_limit} dias, mas o status é ''{status}'' (deveria ser ''Estagiando'' - STARTED).', true),
('end_date_passed_not_finished', 'Data de Término Vencida (Não Finalizado)', 0, 'A data de término ({date}) já passou há mais de {days_limit} dias, mas o status é ''{status}'' (deveria ser ''Finalizado'' - FINISHED).', true),
('draft_inactive_limit', 'Rascunho Sem Atualização', 7, 'Este contrato está em rascunho sem movimentações desde {date} (há mais de {days_limit} dias).', true),
('waiting_approval_inactive_limit', 'Aprovação Pendente Parada', 5, 'Contrato aguardando aprovação sem movimentações desde {date} (há mais de {days_limit} dias).', true),
('revision_requested_inactive_limit', 'Revisão Solicitada Parada', 5, 'Revisão solicitada sem movimentações desde {date} (há mais de {days_limit} dias).', true),
('approved_inactive_limit', 'Aprovado sem Iniciar', 5, 'Contrato aprovado há mais de {days_limit} dias ({date}), mas o status ainda não foi alterado.', true),
('started_date_passed_limit', 'Acompanhamento de Estágio Ativo', 30, 'Estágio está ativo há mais de {days_limit} dias (iniciou em {date}). Solicitar relatório de atividades.', true),
('finished_date_passed_limit', 'Estágio Finalizado sem Arquivo', 15, 'Estágio finalizado em {date} (há mais de {days_limit} dias), mas ainda não foi arquivado.', true)
ON CONFLICT ("key") DO UPDATE SET
    "name" = EXCLUDED.name,
    "description_template" = EXCLUDED.description_template;
