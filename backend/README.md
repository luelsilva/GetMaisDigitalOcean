# Backend - Authentication System API

This is the backend for the authentication system, built with Node.js, Express, and Drizzle ORM.

## Technologies

- **Runtime**: Node.js
- **Framework**: Express
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: JWT & Custom Auth Logic
- **Email**: Resend
- **Validation**: Zod

## Prerequisites

- Node.js (v18 or higher recommended)
- PostgreSQL Database (Local or Cloud like Supabase)

## Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   # or on Windows
   copy .env.example .env
   ```

2. Fill in the environment variables in `.env`:

   - `PORT`: Server port (default: 3000)
   - `SUPABASE_URL`: Your Supabase URL (if using Supabase)
   - `SUPABASE_ANON_KEY`: Supabase Anon Key
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase Service Role Key
   - `DATABASE_URL`: Connection string for PostgreSQL (e.g., `postgresql://user:pass@host:port/db`)
   - `JWT_SECRET`: A strong secret key for signing JWTs
   - `RESEND_API_KEY`: API Key for Resend email service
   - `EMAIL_FROM`: Sender email address configured in Resend

## Database Setup (Drizzle ORM)

Run the following commands to manage the database schema:

- **Generate migrations** (creates SQL files based on schema):
  ```bash
  npm run db:generate
  ```

- **Run migrations** (applies changes to the database):
  ```bash
  npm run db:migrate
  ```

- **Push schema directly** (prototyping only, not recommended for production):
  ```bash
  npm run db:push
  ```

- **Open Drizzle Studio** (GUI to manage database):
  ```bash
  npm run db:studio
  ```

## Running the Server

- **Development Mode** (with hot reload):
  ```bash
  npm run dev
  ```

- **Production Mode**:
  ```bash
  npm start
  ```

The server will start at `http://localhost:3000` (or the configured `PORT`).

## Endpoints de Documentos (Google Docs)

Integrado com a Google Docs e Drive API para processamento de templates.

- **URL Base**: `/api/documentos`
- **Endpoints**:
  - `POST /gerar-pdf`: Recebe `template_id`, `nome_documento` e `data` (JSON). Retorna arquivo PDF.
  - `POST /gerar-link`: Mesmos parâmetros, torna o documento público para leitura e retorna a URL do Google Docs.

---

## Project Info

- **Codename**: Urso
- **Version**: 1.0.0
- **Date**: 2025-12-27
- **AI Assistant**: Antigravity (Google DeepMind)

