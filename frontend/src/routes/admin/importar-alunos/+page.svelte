<script lang="ts">
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';

    onMount(() => {
        // Redireciona imediatamente
        window.location.href = 'https://importalunos.getmais.com.br';
    });
</script>

<svelte:head>
    <title>Importar Alunos | GetMais</title>
</svelte:head>

<div class="redirect-container" in:fade>
    <div class="redirect-card">
        <div class="icon">🔄</div>
        <h1>Redirecionando...</h1>
        <p>Você está sendo redirecionado para a ferramenta de importação de alunos.</p>
        <p class="sub">Se não for redirecionado automaticamente em instantes, clique no botão abaixo:</p>
        
        <a href="https://importalunos.getmais.com.br" class="btn-redirect">
            Acessar Importador de Alunos
        </a>
    </div>
</div>

<style>
    .redirect-container {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 70vh;
        padding: 2rem;
    }

    .redirect-card {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 24px;
        padding: 3rem;
        max-width: 500px;
        width: 100%;
        text-align: center;
        box-shadow: 0 10px 30px -10px rgba(0,0,0,0.05);
    }

    .icon {
        font-size: 3rem;
        margin-bottom: 1.5rem;
        animation: spin 2s linear infinite;
        display: inline-block;
    }

    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    h1 {
        font-size: 1.5rem;
        font-weight: 800;
        color: #1e293b;
        margin-bottom: 0.75rem;
    }

    p {
        color: #475569;
        font-size: 0.95rem;
        line-height: 1.5;
        margin-bottom: 0.5rem;
    }

    .sub {
        color: #94a3b8;
        font-size: 0.85rem;
        margin-bottom: 2rem;
    }

    .btn-redirect {
        display: inline-block;
        width: 100%;
        padding: 0.85rem;
        background: #3b82f6;
        color: white;
        text-decoration: none;
        border-radius: 12px;
        font-weight: 700;
        font-size: 0.95rem;
        transition: all 0.2s;
        box-shadow: 0 4px 12px rgba(59,130,246,0.2);
    }

    .btn-redirect:hover {
        background: #2563eb;
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(59,130,246,0.3);
    }
</style>
