<script lang="ts">
    import { apiFetch } from '$lib/api';
    import { onMount } from 'svelte';

    export let data;

    let useTceV2 = data.features?.use_tce_v2 || false;
    let enableTceButtons = data.features?.enable_tce_buttons || false;
    let loading = false;
    let message = { text: '', type: '' };

    let rules = data.occurrenceRules || [];
    let rulesLoading = false;
    let rulesMessage = { text: '', type: '' };

    async function saveRules() {
        rulesLoading = true;
        rulesMessage = { text: '', type: '' };
        
        try {
            const promises = rules.map(rule => {
                return apiFetch(`/config/occurrence-rules/${rule.key}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        name: rule.name,
                        daysLimit: rule.daysLimit,
                        descriptionTemplate: rule.descriptionTemplate,
                        isActive: rule.isActive
                    })
                });
            });

            const results = await Promise.all(promises);
            const allOk = results.every(res => res.ok);

            if (allOk) {
                rulesMessage = { text: 'Regras de ocorrências salvas com sucesso!', type: 'success' };
            } else {
                rulesMessage = { text: 'Erro ao salvar algumas regras de ocorrências', type: 'error' };
            }
        } catch (err) {
            rulesMessage = { text: 'Falha na comunicação com o servidor', type: 'error' };
        } finally {
            rulesLoading = false;
            setTimeout(() => { rulesMessage = { text: '', type: '' }; }, 3000);
        }
    }

    let checkLoading = false;

    async function triggerCheck() {
        checkLoading = true;
        rulesMessage = { text: '', type: '' };

        try {
            const res = await apiFetch('/config/check-occurrences', {
                method: 'POST'
            });

            const result = await res.json();

            if (res.ok) {
                rulesMessage = { text: 'Verificação de ocorrências executada com sucesso!', type: 'success' };
            } else {
                rulesMessage = { text: result.error || 'Erro ao executar verificação.', type: 'error' };
            }
        } catch {
            rulesMessage = { text: 'Falha na comunicação com o servidor.', type: 'error' };
        } finally {
            checkLoading = false;
            setTimeout(() => { rulesMessage = { text: '', type: '' }; }, 3000);
        }
    }

    async function saveSettings() {
        loading = true;
        message = { text: '', type: '' };

        try {
            const res = await apiFetch('/config/features', {
                method: 'PUT',
                body: JSON.stringify({ 
                    use_tce_v2: useTceV2,
                    enable_tce_buttons: enableTceButtons
                })
            });

            const result = await res.json();

            if (res.ok) {
                message = { text: 'Configurações salvas com sucesso!', type: 'success' };
            } else {
                message = { text: result.error || 'Erro ao salvar configurações', type: 'error' };
            }
        } catch (err) {
            message = { text: 'Falha na comunicação com o servidor', type: 'error' };
        } finally {
            loading = false;
            // Limpa mensagem após 3 segundos
            setTimeout(() => { message = { text: '', type: '' }; }, 3000);
        }
    }
</script>

<svelte:head>
    <title>Configurações do Sistema | Admin</title>
</svelte:head>

<div class="settings-page">
    <header class="page-header">
        <div class="header-content">
            <h1>Configurações do Sistema</h1>
            <p>Gerencie funcionalidades globais e Feature Flags.</p>
        </div>
    </header>

    <main class="settings-container">
        <section class="settings-card">
            <div class="card-header">
                <span class="icon">🚀</span>
                <h2>Funcionalidades em Teste</h2>
            </div>
            
            <div class="settings-list">
                <div class="setting-item">
                    <div class="setting-info">
                        <h3>Nova Versão do TCE (v2)</h3>
                        <p>Ativa o redirecionamento automático da página de GOTCE para a nova interface v2.</p>
                    </div>
                    <div class="setting-control">
                        <label class="switch">
                            <input type="checkbox" bind:checked={useTceV2}>
                            <span class="slider round"></span>
                        </label>
                    </div>
                </div>

                <div class="setting-item" style="border-top: 1px solid #f1f5f9; padding-top: 1.5rem; margin-top: 1.5rem;">
                    <div class="setting-info">
                        <h3>Botões de Ação do TCE v2</h3>
                        <p>Habilita os botões "Enviar para o professor avaliar" (para empresas) e "Devolver" (para professores) na interface do TCE v2.</p>
                    </div>
                    <div class="setting-control">
                        <label class="switch">
                            <input type="checkbox" bind:checked={enableTceButtons}>
                            <span class="slider round"></span>
                        </label>
                    </div>
                </div>
            </div>

            <footer class="card-footer">
                {#if message.text}
                    <div class="alert {message.type}" role="alert">
                        {message.text}
                    </div>
                {/if}
                
                <button 
                    class="btn-save" 
                    on:click={saveSettings} 
                    disabled={loading}
                >
                    {#if loading}
                        <span class="spinner"></span> Salvando...
                    {:else}
                        Salvar Alterações
                    {/if}
                </button>
            </footer>
        </section>

        <section class="settings-card">
            <div class="card-header">
                <span class="icon">⚠️</span>
                <h2>Regras de Atenção de Estágio (Ocorrências)</h2>
            </div>
            
            <div class="settings-list">
                <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 1.5rem;">
                    Configure os prazos de tolerância, mensagens de alerta e quais conferências automáticas o sistema deve processar diariamente.
                </p>

                {#each rules as rule, idx}
                    <div class="rule-item" style="border-bottom: 1px solid #f1f5f9; padding-bottom: 1.5rem; margin-bottom: 1.5rem; {idx === rules.length - 1 ? 'border-bottom: none; margin-bottom: 0; padding-bottom: 0;' : ''}">
                        <div class="rule-info-row" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 2rem;">
                            <div class="setting-info" style="flex: 1;">
                                <h3 style="font-size: 1.05rem; font-weight: 600; color: #1e293b; margin-bottom: 0.25rem;">{rule.name}</h3>
                                <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 0.5rem;">Chave técnica: <code style="background: #f1f5f9; padding: 0.1rem 0.3rem; border-radius: 4px; font-size: 0.75rem; font-family: monospace;">{rule.key}</code></p>
                            </div>
                            <div class="setting-control">
                                <label class="switch">
                                    <input type="checkbox" bind:checked={rule.isActive}>
                                    <span class="slider round"></span>
                                </label>
                            </div>
                        </div>

                        {#if rule.isActive}
                            <div class="rule-details" style="display: grid; gap: 1rem; margin-top: 0.75rem; background: #f8fafc; padding: 1rem; border-radius: 12px; border: 1px solid #e2e8f0;">
                                <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
                                    <label style="font-size: 0.85rem; font-weight: 600; min-width: 150px; color: #475569;">Prazo de Alerta (Dias):</label>
                                    <input 
                                        type="number" 
                                        bind:value={rule.daysLimit} 
                                        min="0"
                                        style="max-width: 80px; padding: 0.4rem; border-radius: 6px; border: 1px solid #cbd5e1; outline: none; font-size: 0.9rem;"
                                    />
                                    <span style="font-size: 0.8rem; color: #64748b;">(dias de tolerância antes de disparar o alerta)</span>
                                </div>
                                <div style="display: grid; gap: 0.35rem;">
                                    <label style="font-size: 0.85rem; font-weight: 600; color: #475569;">Template da Mensagem:</label>
                                    <textarea 
                                        bind:value={rule.descriptionTemplate}
                                        rows="2"
                                        style="width: 100%; padding: 0.5rem; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.85rem; resize: vertical; outline: none; line-height: 1.5; color: #334155;"
                                    ></textarea>
                                    <span style="font-size: 0.75rem; color: #64748b;">Variáveis suportadas: <code style="background: #f1f5f9; padding: 0.1rem 0.2rem; border-radius: 3px; font-family: monospace;">{"{date}"}</code>, <code style="background: #f1f5f9; padding: 0.1rem 0.2rem; border-radius: 3px; font-family: monospace;">{"{days_limit}"}</code>, <code style="background: #f1f5f9; padding: 0.1rem 0.2rem; border-radius: 3px; font-family: monospace;">{"{status}"}</code></span>
                                </div>
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>

            <footer class="card-footer">
                {#if rulesMessage.text}
                    <div class="alert {rulesMessage.type}" role="alert" style="margin-right: auto;">
                        {rulesMessage.text}
                    </div>
                {/if}
                
                <button 
                    class="btn-save" 
                    on:click={saveRules} 
                    disabled={rulesLoading || checkLoading}
                    style="background: #2563eb; color: white;"
                >
                    {#if rulesLoading}
                        <span class="spinner"></span> Salvando...
                    {:else}
                        Salvar Regras
                    {/if}
                </button>

                <button 
                    class="btn-save" 
                    on:click={triggerCheck} 
                    disabled={rulesLoading || checkLoading}
                    style="background: #eab308; color: #1e293b;"
                >
                    {#if checkLoading}
                        <span class="spinner" style="border-top-color: #1e293b;"></span> Executando...
                    {:else}
                        Recalcular Ocorrências
                    {/if}
                </button>
            </footer>
        </section>

        <section class="info-card">
            <h3>Como funciona?</h3>
            <p>Ao ativar a <strong>Nova Versão do TCE</strong>, qualquer usuário que acessar a rota <code>/gotce</code> será redirecionado para <code>/gotce/v2</code>.</p>
            <p class="warning">⚠️ Use com cautela em produção. Certifique-se de que a V2 está estável.</p>
        </section>
    </main>
</div>

<style>
    .settings-page {
        padding: 2rem;
        max-width: 900px;
        margin: 0 auto;
        color: #334155;
    }

    .page-header {
        margin-bottom: 2rem;
    }

    .page-header h1 {
        font-size: 2rem;
        font-weight: 700;
        color: #1e293b;
        margin-bottom: 0.5rem;
    }

    .page-header p {
        color: #64748b;
    }

    .settings-container {
        display: grid;
        gap: 2rem;
    }

    .settings-card {
        background: white;
        border-radius: 16px;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
        overflow: hidden;
        border: 1px solid #e2e8f0;
    }

    .card-header {
        padding: 1.5rem;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .card-header .icon {
        font-size: 1.5rem;
    }

    .card-header h2 {
        font-size: 1.25rem;
        font-weight: 600;
        margin: 0;
    }

    .settings-list {
        padding: 1.5rem;
    }

    .setting-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 2rem;
        padding-bottom: 1.5rem;
    }

    .setting-info h3 {
        font-size: 1.1rem;
        font-weight: 600;
        margin-bottom: 0.25rem;
    }

    .setting-info p {
        font-size: 0.9rem;
        color: #64748b;
    }

    .card-footer {
        padding: 1.5rem;
        background: #f8fafc;
        border-top: 1px solid #e2e8f0;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 1rem;
    }

    /* Switch Component */
    .switch {
        position: relative;
        display: inline-block;
        width: 50px;
        height: 28px;
    }

    .switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }

    .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #cbd5e1;
        transition: .4s;
    }

    .slider:before {
        position: absolute;
        content: "";
        height: 20px;
        width: 20px;
        left: 4px;
        bottom: 4px;
        background-color: white;
        transition: .4s;
    }

    input:checked + .slider {
        background-color: #3b82f6;
    }

    input:focus + .slider {
        box-shadow: 0 0 1px #3b82f6;
    }

    input:checked + .slider:before {
        transform: translateX(22px);
    }

    .slider.round {
        border-radius: 34px;
    }

    .slider.round:before {
        border-radius: 50%;
    }

    /* Buttons & UI */
    .btn-save {
        background: #2563eb;
        color: white;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-weight: 600;
        border: none;
        cursor: pointer;
        transition: background 0.2s;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .btn-save:hover:not(:disabled) {
        background: #1d4ed8;
    }

    .btn-save:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }

    .alert {
        padding: 0.75rem 1rem;
        border-radius: 8px;
        font-size: 0.9rem;
        flex-grow: 1;
    }

    .alert.success {
        background: #f0fdf4;
        color: #166534;
        border: 1px solid #bbf7d0;
    }

    .alert.error {
        background: #fef2f2;
        color: #991b1b;
        border: 1px solid #fecaca;
    }

    .info-card {
        background: #eff6ff;
        padding: 1.5rem;
        border-radius: 12px;
        border: 1px solid #bfdbfe;
    }

    .info-card h3 {
        color: #1e40af;
        margin-bottom: 0.5rem;
    }

    .info-card p {
        font-size: 0.9rem;
        color: #1e40af;
        margin-bottom: 0.5rem;
    }

    .warning {
        font-weight: 600;
        color: #991b1b !important;
    }

    .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }
</style>
