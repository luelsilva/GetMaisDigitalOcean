-- ============================================
-- SQL COMPLETO PARA CRIAR O BANCO DE DADOS
-- Sistema de Autenticação com OTP
-- ============================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- REGRAS DE PERMISSÃO (roles):
-- generic, student, company, teacher, admin, sudo
-- ============================================

-- Criação dos ENUMs (com blocos separados para garantir a criação independente)
DO $$ BEGIN
    CREATE TYPE otp_type AS ENUM ('registration', 'password_reset');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================
-- 2^0  = Logado
-- 2^2  = Generic
-- 2^4  = Student
-- 2^6  = Company
-- 2^8  = Teacher
-- 2^10 = Admin
-- 2^12 = Sudo
-- ============================================ 
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('generic', 'student', 'company', 'teacher', 'admin', 'sudo');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE drive_item_type AS ENUM ('file', 'folder');
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- ============================================
-- TABELA: keep_alive
-- Mantém o banco ativo para evitar congelamento do Supabase.
-- agora no painel do supabase vá em interações e procure por cron
-- crie um novo job e configure para uma vez por dia
-- coloque a função sql abaixo no cron
--
--  INSERT INTO keep_alive DEFAULT VALUES;
--
-- ============================================
CREATE TABLE IF NOT EXISTS keep_alive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE keep_alive ENABLE ROW LEVEL SECURITY;

-- Tabela de Perfis de Usuários
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    roles user_role NOT NULL DEFAULT 'generic',
    is_verified BOOLEAN NOT NULL DEFAULT false,
    must_change_password BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Tabela de Códigos OTP
CREATE TABLE IF NOT EXISTS otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    type otp_type NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- Tabela de Refresh Tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;




-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_otp_codes_user_id ON otp_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_codes_type ON otp_codes(type);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON otp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);


-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql' SET search_path = public;

-- Função para converter NOW() em INT8 (milissegundos)
CREATE OR REPLACE FUNCTION now_to_int8() 
RETURNS int8 AS $$
BEGIN
    RETURN (EXTRACT(EPOCH FROM NOW()) * 1000)::int8;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários nas tabelas
COMMENT ON TABLE profiles IS 'Tabela de perfis de usuários do sistema';
COMMENT ON TABLE otp_codes IS 'Tabela de códigos OTP para verificação e recuperação de senha';
COMMENT ON TABLE refresh_tokens IS 'Tabela de refresh tokens para renovação automática de sessão';
COMMENT ON COLUMN profiles.is_verified IS 'Indica se o email do usuário foi verificado';
COMMENT ON COLUMN otp_codes.type IS 'Tipo do código OTP (registration ou password_reset)';
COMMENT ON COLUMN refresh_tokens.is_revoked IS 'Indica se o token foi revogado (logout manual)';

-- ============================================
-- TABELAS DO MENU
-- ============================================

CREATE TABLE IF NOT EXISTS "menu_sections" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "code" smallint NOT NULL,
    "caption" text NOT NULL,
    "color_dark" varchar(7) NOT NULL,
    "color_light" varchar(7) NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT "menu_sections_code_unique" UNIQUE("code")
);
ALTER TABLE menu_sections ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "menu_items" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "section_id" smallint NOT NULL,
    "model" varchar(10) NOT NULL,
    "caption" text NOT NULL,
    "link" text,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT "menu_items_model_unique" UNIQUE("model")
);
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
 ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_section_id_menu_sections_code_fk" FOREIGN KEY ("section_id") REFERENCES "menu_sections"("code") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Trigger para atualizar updated_at em menu_sections
DROP TRIGGER IF EXISTS menu_sections_updated_at_trigger ON menu_sections;
CREATE TRIGGER menu_sections_updated_at_trigger
    BEFORE UPDATE ON menu_sections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para atualizar updated_at em menu_items
DROP TRIGGER IF EXISTS menu_items_updated_at_trigger ON menu_items;
CREATE TRIGGER menu_items_updated_at_trigger
    BEFORE UPDATE ON menu_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABELAS DE CURSOS E PROFESSORES
-- ============================================

CREATE TABLE IF NOT EXISTS "courses" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" text NOT NULL,
    "sigla" varchar(10) NOT NULL,
    "short_name" varchar(40) NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT "courses_name_unique" UNIQUE("name"),
    CONSTRAINT "courses_sigla_unique" UNIQUE("sigla")
);
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "teachers" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "registration" varchar(20) NOT NULL,
    "name" text NOT NULL,
    "email" varchar(255) NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT "teachers_email_unique" UNIQUE("email")
);
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "course_teachers" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "course_id" UUID NOT NULL,
    "teacher_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT "course_teachers_course_teacher_unique" UNIQUE("course_id", "teacher_id")
);
ALTER TABLE course_teachers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
 ALTER TABLE "course_teachers" ADD CONSTRAINT "course_teachers_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "course_teachers" ADD CONSTRAINT "course_teachers_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Trigger para atualizar updated_at em courses
CREATE OR REPLACE FUNCTION update_courses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS courses_updated_at_trigger ON courses;
CREATE TRIGGER courses_updated_at_trigger
BEFORE UPDATE ON courses
FOR EACH ROW
EXECUTE FUNCTION update_courses_updated_at();

-- Trigger para atualizar updated_at em teachers
CREATE OR REPLACE FUNCTION update_teachers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS teachers_updated_at_trigger ON teachers;
CREATE TRIGGER teachers_updated_at_trigger
BEFORE UPDATE ON teachers
FOR EACH ROW
EXECUTE FUNCTION update_teachers_updated_at();

COMMENT ON TABLE courses IS 'Cursos técnicos oferecidos';
COMMENT ON TABLE teachers IS 'Professores responsáveis pelos cursos';
COMMENT ON TABLE course_teachers IS 'Relacionamento N:N entre cursos e professores';




-- ============================================
-- TABELA DE MODELOS DE FORMULÁRIOS (JSON)
-- ============================================

CREATE TABLE IF NOT EXISTS "form_models" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "model_id" varchar(50) NOT NULL,
    "bg_color" varchar(7),
    "card_bg_color" varchar(7),
    "title" text NOT NULL,
    "description" text,
    "title_color" varchar(7),
    "google_docs_id" varchar(100),
    "config" jsonb NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT "form_models_model_id_unique" UNIQUE("model_id")
);
ALTER TABLE form_models ENABLE ROW LEVEL SECURITY;

-- Trigger para atualizar updated_at em form_models
DROP TRIGGER IF EXISTS form_models_updated_at_trigger ON form_models;
CREATE TRIGGER form_models_updated_at_trigger
    BEFORE UPDATE ON form_models
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE form_models IS 'Modelos de formulários dinâmicos armazenados em JSONB';


-- ============================================
-- TABELA DE ESTÁGIOS (TCE)
-- ============================================

CREATE TABLE IF NOT EXISTS "internships" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID REFERENCES profiles(id) ON DELETE SET NULL,
    "student_registration" bigint,
    "student_name" text NOT NULL,
    "course_sigla" text NOT NULL,
    "company_name" text NULL,
    "company_cnpj" text NULL,
    "start_date" date NULL,
    "end_date" date NULL,
    "json_data" jsonb NULL,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "last_modified_by" UUID REFERENCES profiles(id) ON DELETE SET NULL
);
ALTER TABLE internships ENABLE ROW LEVEL SECURITY;

-- Cria um índice para melhorar a performance das buscas por usuário (opcional, mas recomendado)
CREATE INDEX IF NOT EXISTS "idx_internships_user_id" ON "internships"("user_id");


-- Trigger para atualizar updated_at em internships
DROP TRIGGER IF EXISTS internships_updated_at_trigger ON internships;
CREATE TRIGGER internships_updated_at_trigger
    BEFORE UPDATE ON internships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE internships IS 'Tabela de estágios criada a partir do formulário TCE';


-- ============================================
-- AUDITORIA E VERSIONAMENTO DE ESTÁGIOS
-- ============================================

CREATE TABLE IF NOT EXISTS "internships_history" (
    "history_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "internship_id" UUID NOT NULL,
    "operation" CHAR(1) NOT NULL, -- 'U' para Update, 'D' para Delete
    "changed_at" TIMESTAMPTZ DEFAULT now() NOT NULL,

    -- Cópia dos dados originais
    "user_id" UUID,
    "student_registration" bigint,
    "student_name" text,
    "course_sigla" text,
    "company_name" text,
    "company_cnpj" text,
    "start_date" date,
    "end_date" date,

    "json_data" jsonb, -- Aqui fica o conteúdo completo do formulário
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "last_modified_by" UUID
);
ALTER TABLE internships_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_internships_history_internship_id ON "internships_history"("internship_id");

CREATE OR REPLACE FUNCTION log_internships_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO internships_history (
            internship_id, operation, changed_at,
            user_id, student_registration, student_name, course_sigla, 
            company_name, company_cnpj, start_date, end_date, json_data, 
            created_at, updated_at, last_modified_by
        ) VALUES (
            OLD.id, 'D', NOW(),
            OLD.user_id, OLD.student_registration, OLD.student_name, OLD.course_sigla, 
            OLD.company_name, OLD.company_cnpj, OLD.start_date, OLD.end_date, OLD.json_data, 
            OLD.created_at, OLD.updated_at, OLD.last_modified_by
        );
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO internships_history (
            internship_id, operation, changed_at,
            user_id, student_registration, student_name, course_sigla, 
            company_name, company_cnpj, start_date, end_date, json_data, 
            created_at, updated_at, last_modified_by
        ) VALUES (
            OLD.id, 'U', NOW(),
            OLD.user_id, OLD.student_registration, OLD.student_name, OLD.course_sigla, 
            OLD.company_name, OLD.company_cnpj, OLD.start_date, OLD.end_date, OLD.json_data, 
            OLD.created_at, OLD.updated_at, OLD.last_modified_by
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_internships ON internships;

CREATE TRIGGER trigger_log_internships
    AFTER UPDATE OR DELETE ON internships
    FOR EACH ROW
    EXECUTE FUNCTION log_internships_changes();

COMMENT ON TABLE internships_history IS 'Histórico de alterações e exclusões da tabela de estágios';
