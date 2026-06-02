<script lang="ts">
    import { fade, fly } from 'svelte/transition';
    import { apiFetch } from '$lib/api';

    // ─── Estado ────────────────────────────────────
    type Status = 'idle' | 'loading' | 'success' | 'error';

    let status: Status = $state('idle');
    let mensagem = $state('');
    let dragover = $state(false);
    let selectedFile: File | null = $state(null);

    const dataAtual = new Date();
    let anoInicio = $state(String(dataAtual.getFullYear()));
    let semestreInicio = $state(dataAtual.getMonth() + 1 <= 6 ? '1' : '2');
    let totalHoras = $state('300');

    // ─── Lógica de Upload ──────────────────────────
    function handleDrop(e: DragEvent) {
        e.preventDefault();
        dragover = false;
        const file = e.dataTransfer?.files[0];
        if (file) selecionarArquivo(file);
    }

    function handleFileInput(e: Event) {
        const input = e.target as HTMLInputElement;
        if (input.files?.[0]) selecionarArquivo(input.files[0]);
    }

    function selecionarArquivo(file: File) {
        if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
            status = 'error';
            mensagem = 'Formato inválido. Envie apenas arquivos .csv ou .xlsx';
            return;
        }
        selectedFile = file;
        status = 'idle';
        mensagem = '';
    }

    async function enviar() {
        if (!selectedFile) return;

        status = 'loading';
        mensagem = '';

        const form = new FormData();
        form.append('file', selectedFile);
        form.append('ano_inicio_curso', anoInicio);
        form.append('semestre_inicio_curso', semestreInicio);
        form.append('total_horas_estagio', totalHoras);

        try {
            // apiFetch injeta o Authorization: Bearer automaticamente
            const response = await apiFetch('/alunos/importar', {
                method: 'POST',
                body: form,
                // Não definir Content-Type — o browser define multipart/form-data com boundary
                headers: {},
            });

            const data = await response.json();

            if (response.ok) {
                status = 'success';
                const ignorados = data.registros_ignorados > 0
                    ? ` (${data.registros_ignorados} já existiam e foram ignorados)`
                    : '';
                mensagem = `${data.registros_importados} alunos importados com sucesso!${ignorados}`;
                selectedFile = null;
            } else {
                status = 'error';
                mensagem = data.detail || data.error || 'Erro ao processar o arquivo.';
            }
        } catch {
            status = 'error';
            mensagem = 'Erro de conexão. Verifique se o servidor está disponível.';
        }
    }
</script>

<svelte:head>
    <title>Importar Alunos | Admin GetMais</title>
</svelte:head>

<div class="page" in:fade>
    <header class="page-header">
        <div class="header-icon">📥</div>
        <div>
            <h1>Importar Alunos</h1>
            <p>Faça o upload da planilha XLSX/CSV exportada do SISGESC para cadastrar alunos no sistema.</p>
        </div>
    </header>

    <div class="card" in:fly={{ y: 20, duration: 300 }}>
        <!-- Campos do formulário -->
        <div class="fields-row">
            <div class="field">
                <label for="ano-inicio">Ano Início do Curso</label>
                <input id="ano-inicio" type="number" bind:value={anoInicio} min="2000" max="2100" />
            </div>
            <div class="field">
                <label for="semestre">Semestre de Início</label>
                <select id="semestre" bind:value={semestreInicio}>
                    <option value="1">1º Semestre</option>
                    <option value="2">2º Semestre</option>
                </select>
            </div>
            <div class="field">
                <label for="horas">Total de Horas de Estágio</label>
                <input id="horas" type="number" bind:value={totalHoras} min="1" />
            </div>
        </div>

        <!-- Drop zone -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            id="drop-zone"
            class="drop-zone"
            class:dragover
            class:has-file={selectedFile}
            ondragenter={(e) => { e.preventDefault(); dragover = true; }}
            ondragover={(e) => { e.preventDefault(); dragover = true; }}
            ondragleave={() => { dragover = false; }}
            ondrop={handleDrop}
            onclick={() => document.getElementById('file-input')?.click()}
        >
            {#if selectedFile}
                <div class="file-preview">
                    <span class="file-icon">📄</span>
                    <div>
                        <p class="file-name">{selectedFile.name}</p>
                        <span class="file-size">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <button
                        class="remove-btn"
                        onclick={(e) => { e.stopPropagation(); selectedFile = null; }}
                        aria-label="Remover arquivo"
                    >✕</button>
                </div>
            {:else}
                <div class="upload-hint">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
                        stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    <p>Arraste o arquivo aqui ou <strong>clique para procurar</strong></p>
                    <span>Aceita .csv e .xlsx</span>
                </div>
            {/if}
        </div>

        <input type="file" id="file-input" accept=".csv,.xlsx" hidden onchange={handleFileInput} />

        <!-- Botão de envio -->
        <button
            id="btn-importar"
            class="btn-primary"
            onclick={enviar}
            disabled={!selectedFile || status === 'loading'}
        >
            {#if status === 'loading'}
                <span class="spinner"></span> Processando...
            {:else}
                Importar Alunos
            {/if}
        </button>

        <!-- Mensagem de resultado -->
        {#if status !== 'idle' && mensagem}
            <div class="alert" class:alert-success={status === 'success'} class:alert-error={status === 'error'} in:fly={{ y: 10, duration: 200 }}>
                <span>{status === 'success' ? '✅' : '❌'}</span>
                {mensagem}
            </div>
        {/if}
    </div>

    <div class="info-box">
        <h3>ℹ️ Como usar</h3>
        <ol>
            <li>Exporte a relação de alunos do <strong>SISGESC</strong> no formato <code>.xlsx</code></li>
            <li>Preencha o ano e semestre de início do curso</li>
            <li>Arraste o arquivo ou clique na área de upload</li>
            <li>Clique em <strong>Importar Alunos</strong></li>
        </ol>
        <p class="note">Alunos cujo número de matrícula inicie com <code>*</code> são ignorados automaticamente. Registros duplicados (mesma turma + CPF) também são pulados.</p>
    </div>
</div>

<style>
    .page {
        padding: 2rem;
        max-width: 800px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .page-header {
        display: flex;
        align-items: center;
        gap: 1.25rem;
    }

    .header-icon {
        font-size: 2.5rem;
        width: 64px;
        height: 64px;
        background: #eff6ff;
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .page-header h1 {
        font-size: 1.75rem;
        font-weight: 800;
        color: #1e293b;
        margin: 0 0 0.25rem;
    }

    .page-header p {
        color: #64748b;
        margin: 0;
        font-size: 0.95rem;
    }

    .card {
        background: white;
        border-radius: 20px;
        padding: 2rem;
        border: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .fields-row {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 1rem;
    }

    .field {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }

    .field label {
        font-size: 0.85rem;
        font-weight: 600;
        color: #475569;
    }

    .field input,
    .field select {
        padding: 0.6rem 0.85rem;
        border-radius: 10px;
        border: 1px solid #e2e8f0;
        font-size: 0.95rem;
        color: #1e293b;
        background: #f8fafc;
        font-family: inherit;
        outline: none;
        transition: border-color 0.2s;
    }

    .field input:focus,
    .field select:focus {
        border-color: #3b82f6;
        background: white;
    }

    /* Drop zone */
    .drop-zone {
        border: 2px dashed #cbd5e1;
        border-radius: 16px;
        padding: 2.5rem 1.5rem;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s ease;
        background: #f8fafc;
    }

    .drop-zone:hover,
    .drop-zone.dragover {
        border-color: #3b82f6;
        background: #eff6ff;
    }

    .drop-zone.has-file {
        border-style: solid;
        border-color: #10b981;
        background: #f0fdf4;
    }

    .upload-hint {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        color: #94a3b8;
    }

    .upload-hint p {
        margin: 0;
        color: #475569;
        font-size: 0.95rem;
    }

    .upload-hint p strong { color: #3b82f6; }

    .upload-hint span {
        font-size: 0.8rem;
    }

    .file-preview {
        display: flex;
        align-items: center;
        gap: 1rem;
        justify-content: center;
    }

    .file-icon { font-size: 2rem; }

    .file-name {
        font-weight: 600;
        color: #1e293b;
        margin: 0 0 0.2rem;
        word-break: break-all;
    }

    .file-size {
        font-size: 0.8rem;
        color: #64748b;
    }

    .remove-btn {
        background: #fee2e2;
        border: none;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        cursor: pointer;
        color: #ef4444;
        font-size: 0.8rem;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
    }

    .remove-btn:hover { background: #fecaca; }

    /* Botão */
    .btn-primary {
        padding: 0.85rem 2rem;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 1rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        align-self: flex-end;
    }

    .btn-primary:hover:not(:disabled) {
        background: #2563eb;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35);
    }

    .btn-primary:disabled {
        background: #93c5fd;
        cursor: not-allowed;
    }

    /* Spinner */
    .spinner {
        width: 18px;
        height: 18px;
        border: 2px solid rgba(255,255,255,0.4);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* Alerts */
    .alert {
        padding: 1rem 1.25rem;
        border-radius: 12px;
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        font-size: 0.9rem;
        font-weight: 500;
    }

    .alert-success {
        background: #f0fdf4;
        color: #15803d;
        border: 1px solid #bbf7d0;
    }

    .alert-error {
        background: #fef2f2;
        color: #b91c1c;
        border: 1px solid #fecaca;
    }

    /* Info box */
    .info-box {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 1.5rem;
    }

    .info-box h3 {
        margin: 0 0 1rem;
        font-size: 1rem;
        color: #1e293b;
    }

    .info-box ol {
        margin: 0 0 1rem;
        padding-left: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        color: #475569;
        font-size: 0.9rem;
    }

    .info-box code {
        background: #e2e8f0;
        padding: 0.1rem 0.4rem;
        border-radius: 4px;
        font-size: 0.85rem;
    }

    .note {
        margin: 0;
        font-size: 0.85rem;
        color: #64748b;
        line-height: 1.5;
    }

    @media (max-width: 600px) {
        .page { padding: 1rem; }
        .btn-primary { align-self: stretch; }
    }
</style>
