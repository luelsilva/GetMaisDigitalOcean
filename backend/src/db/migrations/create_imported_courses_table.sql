-- =========================================================================
-- TABELA: imported_students_data
-- Salva os dados consolidados das planilhas de alunos dos 7 cursos importados
-- =========================================================================

CREATE TABLE IF NOT EXISTS "imported_students_data" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "course_sigla" VARCHAR(10) NOT NULL,                    -- Sigla do curso correspondente (ex: mec, ee, fm, em, seg, et, ai)
    
    -- Dados do Aluno e Matrícula
    "numero_registro" INTEGER,                              -- Campo original "Nº"
    "student_registration" BIGINT,                          -- Campo "Matricula"
    "student_name" TEXT NOT NULL,                           -- Campo "Estudante"
    "course_status" VARCHAR(50),                            -- Campo "Situaçao do curso"
    "dispensation_percentage" VARCHAR(20),                  -- Campo "% Dispensa" (armazenado como texto para preservar o símbolo %)
    
    -- Dados de Empresa e Contato
    "company_worked" VARCHAR(255) DEFAULT NULL,             -- Campo "Empresa que Trabalha" (específico do fm.csv, nulo para os demais)
    "student_cpf" VARCHAR(20),                              -- Campo "CPF"
    "student_phone" VARCHAR(100),                           -- Campo "Telefone"
    
    -- Dados de Estágio e Relatório
    "internship_grade" VARCHAR(20),                         -- Campo "Nota do estágio" (texto por conta de formatações brasileiras "8,5")
    "report_delivery_date" DATE,                            -- Campo "Data de entrega do relatório"
    "course_name" TEXT,                                     -- Campo "CURSO"
    "internship_start_date" DATE,                           -- Primeiro campo sob "Data início e fim do Estágio"
    "internship_end_date" DATE,                             -- Segundo campo sob "Data início e fim do Estágio" (coluna em branco adjacente)
    
    -- Informações Temporais do Curso
    "course_start_year" INTEGER,                            -- Campo "Ano Início do curso"
    "course_start_semester" INTEGER,                         -- Campo "Semestre Inicio do curso"
    "course_end_year" INTEGER,                              -- Campo "Ano final do curso"
    "course_end_semester" INTEGER,                           -- Campo "Semestre Final do curso"
    "max_year_to_finish" INTEGER,                           -- Campo "Ano máximo para finalizar o estágio"
    "max_semester_to_finish" INTEGER,                        -- Campo "Semestre do ano para finalizar o estágio"
    
    -- Comunicação e Notas adicionais
    "student_email" TEXT,                                   -- Campo "EMAIL"
    "observations" TEXT,                                    -- Campo "Observações" (pode conter quebras de linha)
    
    -- Metadados de Auditoria
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Habilitar Row Level Security (RLS) se necessário (alinhado ao restante do projeto)
ALTER TABLE "imported_students_data" ENABLE ROW LEVEL SECURITY;

-- Índices de performance para buscas e filtragem
CREATE INDEX IF NOT EXISTS "idx_imported_students_course_sigla" ON "imported_students_data"("course_sigla");
CREATE INDEX IF NOT EXISTS "idx_imported_students_registration" ON "imported_students_data"("student_registration");
CREATE INDEX IF NOT EXISTS "idx_imported_students_cpf" ON "imported_students_data"("student_cpf");
CREATE INDEX IF NOT EXISTS "idx_imported_students_name" ON "imported_students_data"("student_name");

-- Trigger para atualização automática da coluna updated_at
DROP TRIGGER IF EXISTS "update_imported_students_data_updated_at" ON "imported_students_data";
CREATE TRIGGER "update_imported_students_data_updated_at"
    BEFORE UPDATE ON "imported_students_data"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários explicativos da tabela
COMMENT ON TABLE "imported_students_data" IS 'Tabela consolidada com os dados dos estudantes importados das planilhas Google Sheets dos 7 cursos';
COMMENT ON COLUMN "imported_students_data"."course_sigla" IS 'Sigla identificadora do curso importado (mec, ee, fm, em, seg, et, ai)';
COMMENT ON COLUMN "imported_students_data"."company_worked" IS 'Empresa na qual o estudante trabalha (proveniente apenas da planilha fm)';
COMMENT ON COLUMN "imported_students_data"."internship_start_date" IS 'Data de início do estágio do estudante';
COMMENT ON COLUMN "imported_students_data"."internship_end_date" IS 'Data de término do estágio do estudante';
