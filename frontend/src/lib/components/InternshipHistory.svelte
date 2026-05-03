<script lang="ts">
    import { onMount } from 'svelte';
    import { apiFetch } from '$lib/api';

    export let internshipId: string;

    let history: any[] = [];
    let loading = true;
    let error = '';

    onMount(async () => {
        await loadHistory();
    });

    async function loadHistory() {
        loading = true;
        error = '';
        try {
            const res = await apiFetch(`/internships/${internshipId}/history`);
            if (res.ok) {
                history = await res.json();
            } else {
                error = 'Falha ao carregar o histórico.';
            }
        } catch (err) {
            error = 'Erro de rede ao carregar histórico.';
        } finally {
            loading = false;
        }
    }

    function formatDate(dateStr: string) {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    let expandedItems: Record<string, boolean> = {};

    function toggleDiff(id: string) {
        expandedItems[id] = !expandedItems[id];
    }

    const statusMap: Record<string, string> = {
        'DRAFT': 'Rascunho (Editando)',
        'DRAFT_BY_TEACHER': 'Rascunho (Criado pelo Professor)',
        'WAITING_APPROVAL': 'Aguardando Avaliação',
        'REVISION_REQUESTED': 'Devolvido para Revisão',
        'APPROVED': 'Aprovado',
        'STARTED': 'Iniciado',
        'FINISHED': 'Finalizado',
        'ARCHIVED': 'Arquivado'
    };
</script>

<div class="history-container">
    <h3 class="title">Histórico de Alterações</h3>
    
    {#if loading}
        <div class="loading">Carregando histórico...</div>
    {:else if error}
        <div class="error">{error}</div>
    {:else if history.length === 0}
        <div class="empty">Nenhuma alteração registrada neste documento.</div>
    {:else}
        <div class="timeline">
            {#each history as item, i}
                <div class="timeline-item">
                    <div class="timeline-marker"></div>
                    <div class="timeline-content">
                        <div class="header">
                            <span class="date">{formatDate(item.changedAt)}</span>
                            {#if item.modifierName}
                                <span class="author">
                                    por <strong>{item.modifierName}</strong> 
                                    <span class="role badge">({item.modifierRole})</span>
                                </span>
                            {/if}
                        </div>
                        
                        <div class="action">
                            {#if item.operation === 'I'}
                                <span class="badge success">Criação</span>
                            {:else if item.operation === 'U'}
                                <span class="badge update">Atualização</span>
                            {:else if item.operation === 'D'}
                                <span class="badge danger">Exclusão</span>
                            {/if}
                            
                            {#if item.status}
                                <span>Status: <strong>{statusMap[item.status] || item.status}</strong></span>
                            {/if}
                        </div>

                        {#if item.jsonData}
                            <button class="btn-diff" on:click={() => toggleDiff(item.historyId)}>
                                {expandedItems[item.historyId] ? 'Ocultar Detalhes ▼' : 'Ver Detalhes do Formulário ▶'}
                            </button>

                            {#if expandedItems[item.historyId]}
                                <div class="diff-view">
                                    <!-- A representation of JSON data -->
                                    <pre>{JSON.stringify(item.jsonData, null, 2)}</pre>
                                </div>
                            {/if}
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .history-container {
        padding: 1.5rem;
        background: #ffffff;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        margin-top: 2rem;
        border: 1px solid #e5e7eb;
    }

    .title {
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 1.5rem;
        color: #111827;
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 0.5rem;
    }

    .timeline {
        position: relative;
        padding-left: 1.5rem;
    }

    .timeline::before {
        content: '';
        position: absolute;
        top: 0;
        bottom: 0;
        left: 7px;
        width: 2px;
        background: #e5e7eb;
    }

    .timeline-item {
        position: relative;
        margin-bottom: 1.5rem;
    }

    .timeline-marker {
        position: absolute;
        left: -1.5rem;
        top: 0.25rem;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #3b82f6;
        border: 3px solid #ffffff;
        box-shadow: 0 0 0 1px #e5e7eb;
    }

    .timeline-content {
        background: #f9fafb;
        padding: 1rem;
        border-radius: 6px;
        border: 1px solid #f3f4f6;
    }

    .header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        color: #6b7280;
        margin-bottom: 0.5rem;
        flex-wrap: wrap;
    }

    .date {
        font-weight: 500;
        color: #374151;
    }

    .author {
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }

    .badge {
        display: inline-block;
        padding: 0.125rem 0.375rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 500;
        background: #f3f4f6;
        color: #374151;
        text-transform: capitalize;
    }

    .badge.success { background: #d1fae5; color: #065f46; }
    .badge.update { background: #dbeafe; color: #1e40af; }
    .badge.danger { background: #fee2e2; color: #991b1b; }

    .action {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 0.5rem;
    }

    .btn-diff {
        background: none;
        border: none;
        color: #3b82f6;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        padding: 0;
        margin-top: 0.5rem;
    }

    .btn-diff:hover {
        text-decoration: underline;
    }

    .diff-view {
        margin-top: 0.75rem;
        padding: 0.75rem;
        background: #1f2937;
        color: #f3f4f6;
        border-radius: 4px;
        overflow-x: auto;
        font-size: 0.875rem;
    }

    pre {
        margin: 0;
    }

    .loading, .error, .empty {
        padding: 1rem;
        text-align: center;
        color: #6b7280;
    }
    
    .error {
        color: #ef4444;
    }
</style>
