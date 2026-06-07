-- Migration para adicionar a coluna description na tabela keep_alive
ALTER TABLE keep_alive ADD COLUMN IF NOT EXISTS description TEXT;
