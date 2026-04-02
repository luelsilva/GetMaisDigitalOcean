-- Mígration para adicionar company_id nas tabelas internships e internships_history

-- 1. Adiciona a coluna company_id na tabela internships
ALTER TABLE internships
ADD COLUMN company_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 2. Adiciona a coluna company_id na tabela internships_history
ALTER TABLE internships_history
ADD COLUMN company_id UUID;

-- 3. Atualiza a função de trigger para incluir o novo campo company_id no histórico
CREATE OR REPLACE FUNCTION log_internships_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO internships_history (
            internship_id, operation, changed_at,
            user_id, student_registration, student_name, course_sigla, 
            company_id, company_name, start_date, end_date, json_data, 
            created_at, updated_at, last_modified_by, status
        ) VALUES (
            OLD.id, 'D', NOW(),
            OLD.user_id, OLD.student_registration, OLD.student_name, OLD.course_sigla, 
            OLD.company_id, OLD.company_name, OLD.start_date, OLD.end_date, OLD.json_data, 
            OLD.created_at, OLD.updated_at, OLD.last_modified_by, OLD.status
        );
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO internships_history (
            internship_id, operation, changed_at,
            user_id, student_registration, student_name, course_sigla, 
            company_id, company_name, start_date, end_date, json_data, 
            created_at, updated_at, last_modified_by, status
        ) VALUES (
            OLD.id, 'U', NOW(),
            OLD.user_id, OLD.student_registration, OLD.student_name, OLD.course_sigla, 
            OLD.company_id, OLD.company_name, OLD.start_date, OLD.end_date, OLD.json_data, 
            OLD.created_at, OLD.updated_at, OLD.last_modified_by, OLD.status
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
