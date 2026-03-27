-- ========================================================
-- MIGRATION: ADICIONAR STATUS AO TCE (ENTREGA DE ESTÁGIOS)
-- ========================================================

-- 1. Criar o tipo ENUM se ele não existir
DO $$ BEGIN
    CREATE TYPE internship_status AS ENUM (
        'DRAFT', 
        'WAITING_APPROVAL', 
        'REVISION_REQUESTED', 
        'APPROVED', 
        'STARTED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Adicionar a coluna de status na tabela principal (internships)
ALTER TABLE "internships" 
ADD COLUMN IF NOT EXISTS "status" internship_status DEFAULT 'DRAFT' NOT NULL;

-- 3. Adicionar a coluna de status na tabela de histórico (internships_history)
ALTER TABLE "internships_history" 
ADD COLUMN IF NOT EXISTS "status" internship_status;

-- 4. Atualizar a função de auditoria para incluir o campo status
CREATE OR REPLACE FUNCTION log_internships_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO internships_history (
            internship_id, operation, changed_at,
            user_id, student_registration, student_name, course_sigla, 
            company_name, start_date, end_date, json_data, 
            created_at, updated_at, last_modified_by, status
        ) VALUES (
            OLD.id, 'D', NOW(),
            OLD.user_id, OLD.student_registration, OLD.student_name, OLD.course_sigla, 
            OLD.company_name, OLD.start_date, OLD.end_date, OLD.json_data, 
            OLD.created_at, OLD.updated_at, OLD.last_modified_by, OLD.status
        );
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO internships_history (
            internship_id, operation, changed_at,
            user_id, student_registration, student_name, course_sigla, 
            company_name, start_date, end_date, json_data, 
            created_at, updated_at, last_modified_by, status
        ) VALUES (
            OLD.id, 'U', NOW(),
            OLD.user_id, OLD.student_registration, OLD.student_name, OLD.course_sigla, 
            OLD.company_name, OLD.start_date, OLD.end_date, OLD.json_data, 
            OLD.created_at, OLD.updated_at, OLD.last_modified_by, OLD.status
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário final para confirmar
COMMENT ON COLUMN internships.status IS 'Status atual do ciclo de vida do TCE';
