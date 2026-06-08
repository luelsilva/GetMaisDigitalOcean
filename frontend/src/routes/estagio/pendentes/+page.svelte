<script lang="ts">
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';
    import { apiFetch } from '$lib/api';
    import { user as currentUserStore } from '$lib/stores/auth';
    import { goto } from '$app/navigation';

    // State
    let alunosList = $state<any[]>([]);
    let coursesList = $state<any[]>([]);
    let loading = $state(true);
    let errorMessage = $state('');
    
    // Filtros e busca
    let searchQuery = $state('');
    let selectedCourse = $state('all');
    let selectedStatus = $state('all');

    // Modais
    let isObsModalOpen = $state(false);
    let isEditModalOpen = $state(false);
    let selectedAluno = $state<any>(null);
    let isAddingObs = $state(false);

    // Form de Observações
    let newObsText = $state('');
    let teacherName = $state('');

    // Opções para a situação carregadas dinamicamente
    let situacoesOptions = $state<string[]>([]);

    // Form de Edição de Estágio
    let editForm = $state({
        porcentagemDispensa: '',
        notaEstagio: '',
        dataEntregaRelatorio: '',
        dataInicioEstagio: '',
        dataFimEstagio: '',
        anoInicioCurso: '',
        semestreInicioCurso: '',
        totalHorasEstagio: '',
        situacao: ''
    });

    // Carregar alunos da API
    async function loadAlunos() {
        try {
            loading = true;
            errorMessage = '';
            const res = await apiFetch('/alunos');
            if (res.ok) {
                alunosList = await res.json();
            } else {
                throw new Error('Falha ao carregar lista de alunos.');
            }
        } catch (error: any) {
            errorMessage = error.message;
        } finally {
            loading = false;
        }
    }

    // Carregar cursos do banco para popular o filtro
    async function loadCourses() {
        try {
            const res = await apiFetch('/courses');
            if (res.ok) {
                coursesList = await res.json();
            }
        } catch (error) {
            console.error('Falha ao carregar cursos:', error);
        }
    }

    // Carregar situações do banco
    async function loadSituacoes() {
        try {
            const res = await apiFetch('/alunos/situacoes');
            if (res.ok) {
                const data = await res.json();
                situacoesOptions = data.map((item: any) => item.nome);
            }
        } catch (error) {
            console.error('Falha ao carregar situações:', error);
        }
    }

    // Gerenciamento de Observações
    function openObsModal(aluno: any) {
        selectedAluno = aluno;
        newObsText = '';
        const name = $currentUserStore?.name || $currentUserStore?.email?.split('@')[0] || '';
        const email = $currentUserStore?.email ? ` (${$currentUserStore.email})` : '';
        teacherName = `${name}${email}`;
        isAddingObs = false;
        isObsModalOpen = true;
    }

    async function addObservation() {
        if (!newObsText.trim()) return;

        try {
            const res = await apiFetch(`/alunos/${selectedAluno.id}/observacoes`, {
                method: 'POST',
                body: JSON.stringify({
                    texto: newObsText,
                    nomeProfessor: teacherName
                })
            });

            if (res.ok) {
                const newObs = await res.json();
                // Atualiza a lista local
                selectedAluno.observacoes = [newObs, ...selectedAluno.observacoes];
                alunosList = [...alunosList];
                newObsText = '';
                isAddingObs = false;
            } else {
                const data = await res.json();
                alert(data.error || 'Erro ao adicionar observação');
            }
        } catch (err) {
            alert('Erro de conexão ao salvar observação');
        }
    }

    async function deleteObservation(obsId: number) {
        if (!confirm('Deseja realmente excluir esta observação?')) return;

        try {
            const res = await apiFetch(`/alunos/observacoes/${obsId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                // Atualiza a lista local
                selectedAluno.observacoes = selectedAluno.observacoes.filter((o: any) => o.id !== obsId);
                alunosList = [...alunosList];
            } else {
                const data = await res.json();
                alert(data.error || 'Erro ao remover observação');
            }
        } catch (err) {
            alert('Erro de conexão ao remover observação');
        }
    }

    // Gerenciamento de Edição de Aluno
    function openEditModal(aluno: any) {
        selectedAluno = aluno;
        editForm = {
            porcentagemDispensa: aluno.porcentagemDispensa !== null && aluno.porcentagemDispensa !== undefined ? aluno.porcentagemDispensa.toString() : '',
            notaEstagio: aluno.notaEstagio !== null && aluno.notaEstagio !== undefined ? aluno.notaEstagio.toString() : '',
            dataEntregaRelatorio: aluno.dataEntregaRelatorio || '',
            dataInicioEstagio: aluno.dataInicioEstagio || '',
            dataFimEstagio: aluno.dataFimEstagio || '',
            anoInicioCurso: aluno.anoInicioCurso !== null && aluno.anoInicioCurso !== undefined ? aluno.anoInicioCurso.toString() : '',
            semestreInicioCurso: aluno.semestreInicioCurso || '',
            totalHorasEstagio: aluno.totalHorasEstagio !== null && aluno.totalHorasEstagio !== undefined ? aluno.totalHorasEstagio.toString() : '',
            situacao: aluno.situacao ? aluno.situacao.trim() : ''
        };
        isEditModalOpen = true;
    }

    async function saveAlunoInfo() {
        try {
            const res = await apiFetch(`/alunos/${selectedAluno.id}`, {
                method: 'PUT',
                body: JSON.stringify(editForm)
            });

            if (res.ok) {
                const updated = await res.json();
                
                // Atualiza a lista local preservando observações
                const index = alunosList.findIndex(a => a.id === selectedAluno.id);
                if (index !== -1) {
                    alunosList[index] = {
                        ...alunosList[index],
                        ...updated,
                        observacoes: selectedAluno.observacoes
                    };
                    alunosList = [...alunosList];
                }
                isEditModalOpen = false;
            } else {
                const data = await res.json();
                alert(data.error || 'Erro ao salvar informações do aluno');
            }
        } catch (err) {
            alert('Erro de conexão ao salvar informações');
        }
    }

    // Auxiliares de Formatação
    function formatarData(dataStr: string | null) {
        if (!dataStr) return '-';
        if (dataStr.includes('-')) {
            const parts = dataStr.split('-');
            if (parts.length === 3) {
                return `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
        }
        return dataStr;
    }

    function formatarDataHora(dataHoraStr: string | null) {
        if (!dataHoraStr) return '';
        try {
            const date = new Date(dataHoraStr);
            return date.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dataHoraStr;
        }
    }

    let filteredAlunos = $derived(
        alunosList.filter(a => {
            const matchesSearch = !searchQuery || 
                (a.estudante || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (a.matricula || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (a.cpf || '').toLowerCase().includes(searchQuery.toLowerCase());

            const matchesCourse = selectedCourse === 'all' || a.courseSigla === selectedCourse;
            const matchesStatus = selectedStatus === 'all' || (a.situacao ? a.situacao.trim() : '') === selectedStatus;

            return matchesSearch && matchesCourse && matchesStatus;
        })
    );

    onMount(() => {
        if ($currentUserStore && !['admin', 'sudo'].includes($currentUserStore.roles)) {
            goto('/');
            return;
        }
        loadAlunos();
        loadCourses();
        loadSituacoes();
    });
</script>

<svelte:head>
    <title>Alunos Pendentes com Estágio | GetMais</title>
</svelte:head>

<div class="p-6 md:p-10 bg-gray-50 min-h-screen">
    <div class="max-w-[1400px] mx-auto">
        
        <!-- Cabeçalho -->
        <div class="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <h1 class="text-2xl font-black text-gray-800 tracking-tight">Pendentes com Estágio</h1>
                <p class="text-sm text-gray-500 mt-1">Lista geral de alunos importados e controle de entrega de relatórios e notas de estágio</p>
            </div>

            <!-- Ações Rápidas -->
            <button 
                onclick={loadAlunos}
                class="flex items-center justify-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
            >
                🔄 Atualizar Lista
            </button>
        </div>

        <!-- Filtros e Busca -->
        <div class="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-6 flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div class="relative w-full lg:w-96">
                <input
                    type="text"
                    placeholder="Buscar por estudante, matrícula ou CPF..."
                    bind:value={searchQuery}
                    class="w-full rounded-xl border border-gray-200 py-2.5 pr-4 pl-10 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <svg xmlns="http://www.w3.org/2000/svg" class="absolute top-3.5 left-3.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>

            <div class="flex flex-wrap gap-3 w-full lg:w-auto">
                <div class="flex flex-col min-w-[220px] flex-1 lg:flex-initial">
                    <select
                        bind:value={selectedCourse}
                        class="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">Todos os Cursos</option>
                        {#each coursesList as course}
                            <option value={course.sigla}>{course.sigla} - {course.shortName || course.name}</option>
                        {/each}
                    </select>
                </div>

                <div class="flex flex-col min-w-[200px] flex-1 lg:flex-initial">
                    <select
                        bind:value={selectedStatus}
                        class="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">Todas as Situações</option>
                        {#each situacoesOptions as status}
                            <option value={status}>{status}</option>
                        {/each}
                    </select>
                </div>
            </div>
        </div>

        <!-- Tabela -->
        {#if loading && alunosList.length === 0}
            <div class="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div class="h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600 mb-4"></div>
                <p class="text-sm font-medium text-gray-500">Carregando dados dos alunos...</p>
            </div>
        {:else if errorMessage}
            <div class="rounded-2xl border border-red-100 bg-red-50 p-6 text-red-700 shadow-sm">
                <h3 class="font-bold text-lg">Erro ao carregar</h3>
                <p class="text-sm mt-1">{errorMessage}</p>
                <button onclick={loadAlunos} class="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm">Tentar Novamente</button>
            </div>
        {:else}
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse table-auto min-w-[1200px]">
                        <thead>
                            <tr class="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                <th class="py-4 px-5">Estudante / Matrícula</th>
                                <th class="py-4 px-4">CPF / E-mail</th>
                                <th class="py-4 px-4">Telefone</th>
                                <th class="py-4 px-4">Curso (Sigla)</th>
                                <th class="py-4 px-4 text-center">Situação do curso</th>
                                <th class="py-4 px-4 text-center">% Disp.</th>
                                <th class="py-4 px-4 text-center">Nota Estágio</th>
                                <th class="py-4 px-4 text-center">Entrega Relatório</th>
                                <th class="py-4 px-4 text-center">Período Estágio</th>
                                <th class="py-4 px-4 text-center">Ano / Semestre</th>
                                <th class="py-4 px-4 text-center">Obs</th>
                                <th class="py-4 px-5 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-50 text-sm text-gray-700">
                            {#each filteredAlunos as aluno}
                                <tr class="hover:bg-gray-50/50 transition-colors">
                                    <!-- Estudante / Matrícula -->
                                    <td class="py-4 px-5">
                                        <div class="font-bold text-gray-900 leading-snug">{aluno.estudante}</div>
                                        <div class="text-xs font-mono text-gray-400 mt-0.5">{aluno.matricula || '-'}</div>
                                    </td>
                                    <!-- CPF / Email -->
                                    <td class="py-4 px-4">
                                        <div class="font-medium text-gray-800">{aluno.cpf || '-'}</div>
                                        <div class="text-xs text-gray-400 truncate max-w-[180px]" title={aluno.email}>{aluno.email || '-'}</div>
                                    </td>
                                    <!-- Telefone -->
                                    <td class="py-4 px-4 text-xs font-medium text-gray-600">
                                        <div>{aluno.celularAluno || '-'}</div>
                                        {#if aluno.telefoneResidencial}
                                            <div class="text-[10px] text-gray-400 mt-0.5">Res: {aluno.telefoneResidencial}</div>
                                        {/if}
                                    </td>
                                    <!-- Curso (Sigla) -->
                                    <td class="py-4 px-4">
                                        <div class="font-bold text-blue-700">{aluno.courseSigla || '-'}</div>
                                    </td>
                                    <!-- Situação do curso -->
                                    <td class="py-4 px-4 text-center">
                                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                            {aluno.situacao ? aluno.situacao.trim() : '-'}
                                        </span>
                                    </td>
                                    <!-- % Dispensa -->
                                    <td class="py-4 px-4 text-center font-bold text-gray-800">
                                        {aluno.porcentagemDispensa !== null && aluno.porcentagemDispensa !== undefined ? `${aluno.porcentagemDispensa}%` : '-'}
                                    </td>
                                    <!-- Nota Estágio -->
                                    <td class="py-4 px-4 text-center">
                                        {#if aluno.notaEstagio !== null && aluno.notaEstagio !== undefined}
                                            <span class="font-bold px-2 py-0.5 rounded text-xs bg-green-50 text-green-700 border border-green-100">
                                                {aluno.notaEstagio}
                                            </span>
                                        {:else}
                                            <span class="text-gray-300">-</span>
                                        {/if}
                                    </td>
                                    <!-- Data de Entrega do Relatório -->
                                    <td class="py-4 px-4 text-center text-xs font-medium text-gray-600">
                                        {formatarData(aluno.dataEntregaRelatorio)}
                                    </td>
                                    <!-- Período de Estágio -->
                                    <td class="py-4 px-4 text-center text-xs text-gray-600">
                                        {#if aluno.dataInicioEstagio || aluno.dataFimEstagio}
                                            <div class="font-medium">{formatarData(aluno.dataInicioEstagio)}</div>
                                            <div class="text-[10px] text-gray-400">até {formatarData(aluno.dataFimEstagio)}</div>
                                        {:else}
                                            <span class="text-gray-300">-</span>
                                        {/if}
                                    </td>
                                    <!-- Ano / Semestre de Início -->
                                    <td class="py-4 px-4 text-center text-xs">
                                        {#if aluno.anoInicioCurso}
                                            <div class="font-bold text-gray-800">{aluno.anoInicioCurso}</div>
                                            <div class="text-[10px] text-gray-400">{aluno.semestreInicioCurso ? `${aluno.semestreInicioCurso}º Sem.` : '-'}</div>
                                        {:else}
                                            <span class="text-gray-300">-</span>
                                        {/if}
                                    </td>
                                    <!-- Observações (Clicável para abrir modal) -->
                                    <td class="py-4 px-4 text-center">
                                        <button 
                                            onclick={() => openObsModal(aluno)}
                                            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all active:scale-95
                                            {aluno.observacoes && aluno.observacoes.length > 0
                                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200' 
                                                : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 border border-gray-200'}"
                                        >
                                            💬 {aluno.observacoes ? aluno.observacoes.length : 0}
                                        </button>
                                    </td>
                                    <!-- Ações -->
                                    <td class="py-4 px-5 text-right">
                                        <button 
                                            onclick={() => openEditModal(aluno)}
                                            class="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 active:scale-95 transition-all"
                                            title="Editar Dados de Estágio"
                                        >
                                            ✏️ Editar
                                        </button>
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>

                {#if filteredAlunos.length === 0}
                    <div class="p-12 text-center text-gray-500">Nenhum aluno correspondente aos filtros foi encontrado.</div>
                {/if}
            </div>
        {/if}

    </div>
</div>

<!-- ============================================ -->
<!-- MODAL DE OBSERVAÇÕES                         -->
<!-- ============================================ -->
{#if isObsModalOpen && selectedAluno}
    <div 
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        transition:fade
    >
        <div class="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
            
            <!-- Header Modal -->
            <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                <div>
                    <h2 class="text-lg font-black text-gray-800">Histórico de Observações</h2>
                    <p class="text-xs text-gray-400 mt-0.5">{selectedAluno.estudante} | Matrícula: {selectedAluno.matricula}</p>
                </div>
                <button 
                    onclick={() => isObsModalOpen = false}
                    class="text-gray-400 hover:text-gray-600 text-2xl font-light focus:outline-none"
                >
                    &times;
                </button>
            </div>

            <!-- Corpo Modal (Lista de Notas) -->
            <div class="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
                {#if !selectedAluno.observacoes || selectedAluno.observacoes.length === 0}
                    <div class="text-center py-12 text-gray-400 italic text-sm">
                        Nenhuma observação anotada para este aluno ainda.
                    </div>
                {:else}
                    {#each selectedAluno.observacoes as obs}
                        <div class="p-4 rounded-xl border border-gray-100 bg-gray-50 relative group">
                            <!-- Botão de Excluir Nota -->
                            <button 
                                onclick={() => deleteObservation(obs.id)}
                                class="absolute top-3 right-3 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 text-xs"
                                title="Excluir anotação"
                            >
                                🗑️
                            </button>

                            <p class="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap pr-6">{obs.texto}</p>
                            
                            <div class="mt-3 flex items-center justify-between text-[11px] text-gray-400 font-semibold">
                                <span class="text-gray-500">🧑‍🏫 {obs.nomeProfessor}</span>
                                <span>📅 {formatarDataHora(obs.dataAnotacao)}</span>
                            </div>
                        </div>
                    {/each}
                {/if}
            </div>

            <!-- Footer Modal (Formulário de Nova Nota) -->
            {#if !isAddingObs}
                <div class="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-center">
                    <button 
                        onclick={() => isAddingObs = true}
                        class="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all active:scale-95"
                    >
                        ➕ Adicionar nova anotação
                    </button>
                </div>
            {:else}
                <div class="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                    <h3 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Adicionar Nova Observação</h3>
                    
                    <form onsubmit={(e) => { e.preventDefault(); addObservation(); }} class="space-y-3">
                        <textarea 
                            bind:value={newObsText} 
                            rows="3" 
                            placeholder="Escreva a anotação para o aluno..."
                            class="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            required
                        ></textarea>
                        
                        <div class="flex flex-col sm:flex-row gap-3 items-center justify-between">
                            <div class="text-xs font-semibold text-gray-500">
                                Assinatura: <span class="font-bold text-gray-800">{teacherName}</span>
                            </div>
                            
                            <div class="flex gap-2 w-full sm:w-auto">
                                <button 
                                    type="button"
                                    onclick={() => isAddingObs = false}
                                    class="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 font-bold text-xs transition-all"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                                >
                                    Gravar Observação
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            {/if}
            
        </div>
    </div>
{/if}

<!-- ============================================ -->
<!-- MODAL DE EDIÇÃO DE ESTÁGIO                   -->
<!-- ============================================ -->
{#if isEditModalOpen && selectedAluno}
    <div 
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        transition:fade
    >
        <div class="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            
            <!-- Header Modal -->
            <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                <div>
                    <h2 class="text-lg font-black text-gray-800">Editar Informações de Estágio</h2>
                    <p class="text-xs text-gray-400 mt-0.5">{selectedAluno.estudante} | Matrícula: {selectedAluno.matricula}</p>
                </div>
                <button 
                    onclick={() => isEditModalOpen = false}
                    class="text-gray-400 hover:text-gray-600 text-2xl font-light focus:outline-none"
                >
                    &times;
                </button>
            </div>

            <!-- Corpo Modal (Campos) -->
            <div class="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
                <div class="grid grid-cols-2 gap-4">
                    <!-- Situação do Curso -->
                    <div class="col-span-2">
                        <label for="sitCurso" class="block text-xs font-bold text-gray-500 uppercase mb-1">Situação do curso</label>
                        <select 
                            id="sitCurso"
                            bind:value={editForm.situacao} 
                            class="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        >
                            <option value="">Selecione...</option>
                            {#each situacoesOptions as status}
                                <option value={status}>{status}</option>
                            {/each}
                        </select>
                    </div>

                    <!-- % Dispensa -->
                    <div>
                        <label for="porcDisp" class="block text-xs font-bold text-gray-500 uppercase mb-1">% Dispensa</label>
                        <input 
                            id="porcDisp"
                            type="number" 
                            min="0" 
                            max="100"
                            bind:value={editForm.porcentagemDispensa} 
                            placeholder="Ex: 25"
                            class="w-full rounded-xl border border-gray-200 p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>
                    <!-- Nota Estágio -->
                    <div>
                        <label for="notaEst" class="block text-xs font-bold text-gray-500 uppercase mb-1">Nota do Estágio</label>
                        <input 
                            id="notaEst"
                            type="number" 
                            min="0" 
                            max="10" 
                            step="0.1"
                            bind:value={editForm.notaEstagio} 
                            placeholder="Ex: 9.5"
                            class="w-full rounded-xl border border-gray-200 p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>
                </div>

                <div>
                    <label for="entRel" class="block text-xs font-bold text-gray-500 uppercase mb-1">Data de entrega do relatório</label>
                    <input 
                        id="entRel"
                        type="date" 
                        bind:value={editForm.dataEntregaRelatorio} 
                        class="w-full rounded-xl border border-gray-200 p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <!-- Data Início -->
                    <div>
                        <label for="iniEst" class="block text-xs font-bold text-gray-500 uppercase mb-1">Data início Estágio</label>
                        <input 
                            id="iniEst"
                            type="date" 
                            bind:value={editForm.dataInicioEstagio} 
                            class="w-full rounded-xl border border-gray-200 p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>
                    <!-- Data Fim -->
                    <div>
                        <label for="fimEst" class="block text-xs font-bold text-gray-500 uppercase mb-1">Data fim Estágio</label>
                        <input 
                            id="fimEst"
                            type="date" 
                            bind:value={editForm.dataFimEstagio} 
                            class="w-full rounded-xl border border-gray-200 p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <!-- Ano Início Curso -->
                    <div>
                        <label for="anoIni" class="block text-xs font-bold text-gray-500 uppercase mb-1">Ano Início do curso</label>
                        <input 
                            id="anoIni"
                            type="number" 
                            bind:value={editForm.anoInicioCurso} 
                            placeholder="Ex: 2026"
                            class="w-full rounded-xl border border-gray-200 p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>
                    <!-- Semestre Início Curso -->
                    <div>
                        <label for="semIni" class="block text-xs font-bold text-gray-500 uppercase mb-1">Semestre início curso</label>
                        <select 
                            id="semIni"
                            bind:value={editForm.semestreInicioCurso} 
                            class="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        >
                            <option value="">Selecione...</option>
                            <option value="1">1º Semestre</option>
                            <option value="2">2º Semestre</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label for="totHor" class="block text-xs font-bold text-gray-500 uppercase mb-1">Total Horas Estágio</label>
                    <input 
                        id="totHor"
                        type="number" 
                        bind:value={editForm.totalHorasEstagio} 
                        placeholder="Ex: 300"
                        class="w-full rounded-xl border border-gray-200 p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                </div>
            </div>

            <!-- Footer Modal -->
            <div class="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                <button 
                    onclick={() => isEditModalOpen = false}
                    class="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-200"
                >
                    Cancelar
                </button>
                <button 
                    onclick={saveAlunoInfo}
                    class="rounded-xl bg-blue-600 px-6 py-2.5 font-bold text-sm text-white shadow-md transition-all hover:bg-blue-700 active:scale-95"
                >
                    Salvar Alterações
                </button>
            </div>
            
        </div>
    </div>
{/if}
