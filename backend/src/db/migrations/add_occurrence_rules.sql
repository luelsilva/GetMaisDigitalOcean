-- Migration: Create occurrence_rules table and seed initial settings

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
('created_over_a_week_editing', 'Prazo de Edição Excedido', 7, 'Registro criado em {date} (há mais de {days_limit} dias), mas ainda está em edição.', true),
('start_date_passed_not_started', 'Data de Início Vencida', 0, 'A data de início ({date}) já venceu há mais de {days_limit} dias, mas o status do estágio é ''{status}'' (deveria ser ''Estagiando'' - STARTED).', true),
('end_date_passed_not_finished', 'Data de Término Vencida', 0, 'A data de término ({date}) já passou há mais de {days_limit} dias, mas o estágio ainda não está marcado como ''Finalizado'' (FINISHED).', true)
ON CONFLICT ("key") DO NOTHING;
