-- ============================================================
-- SCRIPT DE CORREÇÃO: Sincronizar company_name, start_date, end_date
-- a partir do json_data para registros com campos NULL
--
-- Motivo: Bug no frontend onde ações de status (aprovar, reprovar,
-- enviar para aprovação) sobrescreviam os campos com NULL ao espalhar
-- pageData.internship (dados antigos da sessão) no corpo do PUT.
--
-- Criado em: 2026-05-25
-- ============================================================


-- ============================================================
-- PASSO 1: PRÉVIA (DRY RUN) — Veja o que será corrigido
-- Execute primeiro para conferir antes de aplicar
-- ============================================================

SELECT
    id,
    student_name,
    status,

    -- Valores atuais (que estão NULL)
    company_name   AS company_name_atual,
    start_date     AS start_date_atual,
    end_date       AS end_date_atual,

    -- Valores que serão restaurados do json_data
    COALESCE(
        NULLIF(TRIM(json_data->>'nome_empresa'),  ''),
        NULLIF(TRIM(json_data->>'NomeEmpresa'),   ''),
        NULLIF(TRIM(json_data->>'razao_social'),  ''),
        NULLIF(TRIM(json_data->>'empresa'),       '')
    ) AS company_name_novo,

    COALESCE(
        NULLIF(TRIM(json_data->>'dt_inicio'),    ''),
        NULLIF(TRIM(json_data->>'data_inicio'),  ''),
        NULLIF(TRIM(json_data->>'DataInicio'),   '')
    ) AS start_date_novo,

    COALESCE(
        NULLIF(TRIM(json_data->>'dt_fim'),       ''),
        NULLIF(TRIM(json_data->>'data_final'),   ''),
        NULLIF(TRIM(json_data->>'DataFinal'),    '')
    ) AS end_date_novo

FROM internships
WHERE
    deleted_at IS NULL
    AND (
        (company_name IS NULL AND (
            json_data->>'nome_empresa' IS NOT NULL OR
            json_data->>'NomeEmpresa'  IS NOT NULL OR
            json_data->>'razao_social' IS NOT NULL OR
            json_data->>'empresa'      IS NOT NULL
        ))
        OR
        (start_date IS NULL AND (
            json_data->>'dt_inicio'   IS NOT NULL OR
            json_data->>'data_inicio' IS NOT NULL OR
            json_data->>'DataInicio'  IS NOT NULL
        ))
        OR
        (end_date IS NULL AND (
            json_data->>'dt_fim'      IS NOT NULL OR
            json_data->>'data_final'  IS NOT NULL OR
            json_data->>'DataFinal'   IS NOT NULL
        ))
    )
ORDER BY student_name;


-- ============================================================
-- PASSO 2: APLICAR A CORREÇÃO
-- Execute somente após conferir o resultado acima
-- ============================================================

UPDATE internships
SET
    company_name = COALESCE(
        company_name,  -- Mantém se já tiver valor
        NULLIF(TRIM(json_data->>'nome_empresa'),  ''),
        NULLIF(TRIM(json_data->>'NomeEmpresa'),   ''),
        NULLIF(TRIM(json_data->>'razao_social'),  ''),
        NULLIF(TRIM(json_data->>'empresa'),       '')
    ),

    start_date = COALESCE(
        start_date,    -- Mantém se já tiver valor
        NULLIF(TRIM(json_data->>'dt_inicio'),    '')::date,
        NULLIF(TRIM(json_data->>'data_inicio'),  '')::date,
        NULLIF(TRIM(json_data->>'DataInicio'),   '')::date
    ),

    end_date = COALESCE(
        end_date,      -- Mantém se já tiver valor
        NULLIF(TRIM(json_data->>'dt_fim'),       '')::date,
        NULLIF(TRIM(json_data->>'data_final'),   '')::date,
        NULLIF(TRIM(json_data->>'DataFinal'),    '')::date
    ),

    updated_at = now()

WHERE
    deleted_at IS NULL
    AND (
        (company_name IS NULL AND (
            json_data->>'nome_empresa' IS NOT NULL OR
            json_data->>'NomeEmpresa'  IS NOT NULL OR
            json_data->>'razao_social' IS NOT NULL OR
            json_data->>'empresa'      IS NOT NULL
        ))
        OR
        (start_date IS NULL AND (
            json_data->>'dt_inicio'   IS NOT NULL OR
            json_data->>'data_inicio' IS NOT NULL OR
            json_data->>'DataInicio'  IS NOT NULL
        ))
        OR
        (end_date IS NULL AND (
            json_data->>'dt_fim'      IS NOT NULL OR
            json_data->>'data_final'  IS NOT NULL OR
            json_data->>'DataFinal'   IS NOT NULL
        ))
    );

-- Mostra quantas linhas foram afetadas
-- (o resultado do UPDATE já retorna o número de linhas)


-- ============================================================
-- PASSO 3: VERIFICAR O RESULTADO
-- Rode após o UPDATE para confirmar que não há mais divergências
-- ============================================================

SELECT
    COUNT(*) AS registros_ainda_divergentes
FROM internships
WHERE
    deleted_at IS NULL
    AND (
        (company_name IS NULL AND (
            json_data->>'nome_empresa' IS NOT NULL OR
            json_data->>'NomeEmpresa'  IS NOT NULL OR
            json_data->>'razao_social' IS NOT NULL OR
            json_data->>'empresa'      IS NOT NULL
        ))
        OR
        (start_date IS NULL AND (
            json_data->>'dt_inicio'   IS NOT NULL OR
            json_data->>'data_inicio' IS NOT NULL OR
            json_data->>'DataInicio'  IS NOT NULL
        ))
        OR
        (end_date IS NULL AND (
            json_data->>'dt_fim'      IS NOT NULL OR
            json_data->>'data_final'  IS NOT NULL OR
            json_data->>'DataFinal'   IS NOT NULL
        ))
    );
-- Resultado esperado: 0
