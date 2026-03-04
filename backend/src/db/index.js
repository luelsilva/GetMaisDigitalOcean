const postgres = require('postgres');
const { drizzle } = require('drizzle-orm/postgres-js');
const config = require('../config');
const schema = require('./schema');

// Obter DATABASE_URL do ambiente
const getDatabaseUrl = () => {
    if (!process.env.DATABASE_URL) {
        throw new Error(
            'DATABASE_URL não encontrada no .env. ' +
            'Adicione a connection string do PostgreSQL do Supabase. ' +
            'Você pode encontrá-la em: Settings > Database > Connection String (URI mode). ' +
            'Exemplo: postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:6543/postgres?pgbouncer=true'
        );
    }
    return process.env.DATABASE_URL;
};

// Criar cliente PostgreSQL otimizado para serverless ou local
const client = postgres(getDatabaseUrl(), {
    max: process.env.NODE_ENV === 'production' ? 1 : 10, // 1 para serverless, 10 para desenvolvimento local
    idle_timeout: 20, // Fechar conexão após 20s de inatividade
    connect_timeout: 10, // Timeout de conexão de 10s
    prepare: false // Desabilitar prepared statements para compatibilidade com pgBouncer
});

// Criar instância do Drizzle
const db = drizzle(client, { schema });

module.exports = { db, client };
