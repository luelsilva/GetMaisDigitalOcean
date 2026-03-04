---
description: Como fazer backup (dump) e restaurar o banco de dados do Supabase
---

# Supabase Backup & Restore

Este guia descreve como realizar o dump (backup) e o restore do banco de dados PostgreSQL do Supabase.

## Pré-requisitos

- **PostgreSQL Client Tools**: Você precisa ter o `pg_dump` e `psql` instalados na sua máquina.
  - Windows: Instale o PostgreSQL (os binários ficam em `C:\Program Files\PostgreSQL\<version>\bin`).
  - Linux/Mac: Geralmente disponíveis nos pacotes `postgresql-client`.
- **String de Conexão**: Obtenha a string de conexão no painel do Supabase:
  - Settings -> Database -> Connection string -> URI
  - Formato: `postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres`

## 1. Backup (Dump)

Para fazer o backup apenas da estrutura (schema) e dos dados, use o comando `pg_dump`.

### Comando Básico
```bash
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" -f dump_supabase.sql
```

### Opções Úteis
- `--clean`: Inclui comandos DROP para limpar objetos existentes antes de criar novos.
- `--if-exists`: Usa IF EXISTS ao dropar objetos.
- `--no-owner`: Pula comandos de definição de proprietário (útil ao restaurar em outro banco).
- `--no-acl`: Pula privilégios (GRANT/REVOKE).
- `--schema-only`: Faz dump apenas da estrutura.
- `--data-only`: Faz dump apenas dos dados.

### Exemplo Recomendado (Backup Completo)
```bash
pg_dump "sua_connection_string" --clean --if-exists --no-owner --no-acl -f backup_completo.sql
```

## 2. Restore

Para restaurar o backup em um banco de dados (pode ser o mesmo ou outro), use o `psql`.

> **CUIDADO**: Se o backup foi gerado com `--clean`, ele apagará os dados existentes no banco de destino!

### Comando
```bash
psql "sua_connection_string" -f backup_completo.sql
```

## 3. Migrar entre Projetos (Supabase -> Supabase)

Se você deseja clonar o banco de produção para um ambiente de desenvolvimento ou vice-versa:

1.  **Dump da Origem**:
    ```bash
    pg_dump "url_origem" --clean --if-exists --no-owner --no-acl -f migration.sql
    ```

2.  **Restore no Destino**:
    ```bash
    psql "url_destino" -f migration.sql
    ```

## 4. Scripts Automatizados

Para facilitar o processo, existem scripts Node.js na pasta `urso/scripts`:

### Gerar Backup
```bash
# Backup Completo (Estrutura + Dados)
npm run db:backup
# ou
node scripts/backup_db.js

# Backup Somente Dados
npm run db:backup:data
# ou
node scripts/backup_db.js --data-only
```
- Cria um arquivo `.sql` com timestamp na pasta `scripts/backups`.
- O nome do arquivo indicará se é `full` ou `data_only`.
- O backup completo usa as opções `--clean --if-exists --no-owner --no-acl`.
- O backup de dados usa `--data-only --no-owner --no-acl`.

### Restaurar Backup
```bash
node scripts/restore_db.js [nome_do_arquivo.sql]
```
- Se nenhum arquivo for especificado, ele restaurará o **mais recente** encontrado em `scripts/backups`.
- **Certifique-se de que o `psql` está no seu PATH.**

## Notas Importantes
- Certifique-se de que a versão do `pg_dump` local é compatível (igual ou superior) à versão do PostgreSQL no Supabase (geralmente 15 ou 16).
- Para bancos muito grandes, considere usar ferramentas de migração ou o recurso de PITR (Point-in-Time Recovery) do próprio Supabase (plano Pro).
