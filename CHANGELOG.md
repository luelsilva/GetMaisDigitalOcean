# Changelog

Todas as mudanças notáveis para o projeto **GetMaisDigitalOcean** serão documentadas neste arquivo.

O formato é baseado no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-03-27

### Added
- **Workflow de Status do TCE**: Adicionado sistema completo de estágios com ciclo de vida (Rascunho, Aguardando Aprovação, Revisão, Aprovado, Iniciado).
- **Dashboard de Métricas**: Adicionado painel visual no topo da lista de estagiários com contagem dinâmica por status.
- **Filtros Avançados**: Implementada a busca específica por nome de aluno separada da busca geral.
- **Botão de Busca Manual**: Alterado o comportamento da página para busca sob demanda (on-click), melhorando a performance e controle do usuário.
- **Tradução**: Interface da lista de estagiários migrada para Português (Brasil).

### Changed
- **Segurança no Backend**: Implementada validação de transição de status baseada em permissões (apenas professores/admins podem aprovar).
- **Bloqueio de Edição**: Estágios em status "Aguardando Aprovação" ou superior agora são bloqueados para edição por parte do aluno/empresa.
- **Modernização do Frontend**: Refatoração completa da página de listagem para **Svelte 5 (Runes)**, utilizando `$state` e `$derived`.
- **Ordenação**: Lista de estagiários agora é retornada exclusivamente em ordem alfabética por nome do aluno.

### Fixed
- **Integridade de Dados**: Migração SQL para garantir a criação do tipo ENUM `internship_status` e colunas de histórico de forma segura no Supabase.

---

## [1.0.0] - 2026-03-26

### Added
- Lançamento inicial do sistema com Autenticação OTP e gestão básica de Formulários TCE.
