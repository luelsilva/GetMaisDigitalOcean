<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { apiFetch, checkAuth } from '$lib/api';
    import { menuStore } from '$lib/stores/menuStore';
    import { fly, fade, slide } from 'svelte/transition';
    import { user } from '$lib/stores/auth';

    const { isLoading } = menuStore;

    // --- State para Menus de Gerenciamento ---
    let openMenuId = $state<string | null>(null);
    let openItemMenuId = $state<string | null>(null);

    // Modal State
    let showSectionModal = $state(false);
    let showItemModal = $state(false);
    let editingSection = $state<any>(null);
    let editingItem = $state<any>(null);

    // Form Data
    let sectionForm = $state({
        code: 0,
        caption: '',
        colorDark: '#000000',
        colorLight: '#ffffff',
        isActive: true
    });

    let itemForm = $state({
        sectionId: 0,
        model: '',
        caption: '',
        link: '',
        isActive: true
    });

    onMount(async () => {
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated) {
            goto('/auth/login');
            return;
        }

        // Inicializa o store (que cuida do cache e atualização)
        menuStore.init();

        // Fechar menus ao clicar fora
        const handleClickOutside = () => {
            openMenuId = null;
            openItemMenuId = null;
        };
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    });

    // --- Lógica de Gerenciamento ---

    function toggleMenu(e: MouseEvent, id: string) {
        e.stopPropagation();
        openMenuId = openMenuId === id ? null : id;
        openItemMenuId = null;
    }

    function toggleItemMenu(e: MouseEvent, id: string) {
        e.stopPropagation();
        openItemMenuId = openItemMenuId === id ? null : id;
        openMenuId = null;
    }

    function openEditSection(section: any) {
        editingSection = section;
        sectionForm = { 
            id: section.id,
            code: section.code, 
            caption: section.caption, 
            colorDark: section.colorDark, 
            colorLight: section.colorLight, 
            isActive: section.isActive 
        } as any;
        showSectionModal = true;
        openMenuId = null;
    }

    function openNewSectionModal() {
        editingSection = null;
        sectionForm = { code: 0, caption: '', colorDark: '#2196F3', colorLight: '#E3F2FD', isActive: true };
        showSectionModal = true;
    }

    function openNewItem(sectionCode: number) {
        editingItem = null;
        itemForm = { sectionId: sectionCode, model: '', caption: '', link: '', isActive: true };
        showItemModal = true;
        openMenuId = null;
    }

    function openEditItem(item: any) {
        editingItem = item;
        itemForm = { ...item };
        showItemModal = true;
        openItemMenuId = null;
    }

    async function saveSection() {
        const method = editingSection ? 'PUT' : 'POST';
        const url = editingSection 
            ? `/admin/menu/sections/${editingSection.id}`
            : '/admin/menu/sections';

        try {
            const res = await apiFetch(url, {
                method,
                body: JSON.stringify(sectionForm)
            });

            if (res.ok) {
                showSectionModal = false;
                menuStore.init(); // Recarrega o menu
            } else {
                const err = await res.json();
                alert(`Erro: ${err.error || 'Falha ao salvar'}`);
            }
        } catch (e) {
            alert('Erro de conexão');
        }
    }

    async function deleteSection(section: any) {
        if (!confirm(`Tem certeza que deseja excluir a seção "${section.caption}"?`)) return;

        try {
            const res = await apiFetch(`/admin/menu/sections/${section.id}`, { method: 'DELETE' });
            if (res.ok) {
                menuStore.init();
            } else {
                alert('Erro ao excluir');
            }
        } catch (e) {
            alert('Erro de conexão');
        }
    }

    async function saveItem() {
        const method = editingItem ? 'PUT' : 'POST';
        const url = editingItem 
            ? `/admin/menu/items/${editingItem.id}` 
            : '/admin/menu/items';

        try {
            const res = await apiFetch(url, {
                method,
                body: JSON.stringify(itemForm)
            });

            if (res.ok) {
                showItemModal = false;
                menuStore.init();
            } else {
                const err = await res.json();
                alert(`Erro: ${err.error || 'Falha ao salvar'}`);
            }
        } catch (e) {
            alert('Erro de conexão');
        }
    }

    async function deleteItem(item: any) {
        if (!confirm(`Excluir item "${item.caption}"?`)) return;

        try {
            const res = await apiFetch(`/admin/menu/items/${item.id}`, { method: 'DELETE' });
            if (res.ok) {
                menuStore.init();
            } else {
                alert('Erro ao excluir');
            }
        } catch (e) {
            alert('Erro de conexão');
        }
    }
</script>

<svelte:head>
    <title>Painel de Estágio | Cedup</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 p-6 md:p-10">
    {#if $isLoading && $menuStore.length === 0}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-[1200px] mx-auto">
            {#each Array(4) as _}
                <div class="bg-white rounded-3xl h-64 animate-pulse border border-gray-100 shadow-sm"></div>
            {/each}
        </div>
    {:else}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-[1200px] mx-auto">
            {#each $menuStore as section, i (section.code)}
                <div 
                    in:fly={{ y: 20, duration: 400, delay: i * 50 }}
                    class="flex flex-col rounded-3xl border border-gray-100 shadow-xl transition-all duration-300"
                    class:z-50={openMenuId === section.id || section.items?.some(item => openItemMenuId === item.id)}
                    style="background-color: {section.colorLight};"
                >
                    <!-- Header do Card -->
                    <div 
                        class="px-6 py-5 rounded-t-[calc(1.5rem-1px)] border-b border-white/20 flex items-center justify-between relative"
                        style="background-color: {section.colorDark};"
                    >
                        <h2 class="text-lg font-black text-white leading-tight">
                            {section.code} - {section.caption}
                        </h2>

                        {#if $user && ($user.roles === 'admin' || $user.roles === 'sudo') && section.code !== 100 && section.code !== 200}
                            <div class="relative">
                                <button 
                                    onclick={(e) => toggleMenu(e, section.id)}
                                    class="p-1 rounded-full hover:bg-black/10 text-white/80 transition-colors"
                                    aria-label="Menu de opções"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                    </svg>
                                </button>

                                {#if openMenuId === section.id}
                                    <div 
                                        transition:fade={{ duration: 100 }}
                                        class="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 py-1 overflow-hidden"
                                    >
                                        <button 
                                            onclick={() => openEditSection(section)}
                                            class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                        >
                                            ✏️ Editar Título
                                        </button>
                                        <button 
                                            onclick={() => openNewItem(section.code)}
                                            class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                        >
                                            ➕ Adicionar Item
                                        </button>
                                        <button 
                                            onclick={() => deleteSection(section)}
                                            disabled={section.items && section.items.length > 0}
                                            class="w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors"
                                            class:text-red-600={!(section.items && section.items.length > 0)}
                                            class:hover:bg-red-50={!(section.items && section.items.length > 0)}
                                            class:text-gray-300={section.items && section.items.length > 0}
                                            class:cursor-not-allowed={section.items && section.items.length > 0}
                                        >
                                            🗑️ Excluir
                                        </button>
                                    </div>
                                {/if}
                            </div>
                        {/if}
                    </div>

                    <!-- Lista de Itens -->
                    <div class="flex-1 p-4 space-y-2">
                        {#if section.items.length === 0}
                            <div class="py-10 text-center">
                                <p class="text-gray-400 text-sm font-medium italic">Nenhum item ativo</p>
                            </div>
                        {:else}
                            {#each section.items as item (item.model)}
                                <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
                                <div 
                                    in:fade={{ duration: 300 }}
                                    class="group p-3 rounded-xl transition-all duration-200 flex items-center justify-between relative"
                                    style="cursor: {item.link ? 'pointer' : 'default'}; color: {section.colorDark};"
                                    class:bg-white={item.link}
                                    class:shadow-sm={item.link}
                                    class:hover:shadow-md={item.link}
                                    onclick={() => item.link && window.open(item.link, '_blank')}
                                    onkeydown={(e) => item.link && (e.key === 'Enter' || e.key === ' ') && window.open(item.link, '_blank')}
                                    role={item.link ? "button" : "presentation"}
                                    tabindex={item.link ? 0 : -1}
                                >
                                    <span class="text-sm font-bold leading-tight flex-1">
                                        {item.model} - {item.caption}
                                    </span>
                                    
                                    <div class="flex items-center gap-2">
                                        {#if $user && ($user.roles === 'admin' || $user.roles === 'sudo') && section.code !== 100 && section.code !== 200}
                                            <div class="relative">
                                                <button 
                                                    onclick={(e) => toggleItemMenu(e, item.id)}
                                                    class="p-1 rounded-lg hover:bg-black/5 text-gray-400 hover:text-gray-600 transition-colors"
                                                    title="Opções do item"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                                    </svg>
                                                </button>

                                                {#if openItemMenuId === item.id}
                                                    <div 
                                                        transition:fade={{ duration: 100 }}
                                                        class="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-xl border border-gray-100 z-50 py-1 overflow-hidden"
                                                    >
                                                        <button 
                                                            onclick={(e) => { e.stopPropagation(); openEditItem(item); }}
                                                            class="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                        >
                                                            ✏️ Editar
                                                        </button>
                                                        <button 
                                                            onclick={(e) => { e.stopPropagation(); deleteItem(item); }}
                                                            class="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                        >
                                                            🗑️ Excluir
                                                        </button>
                                                    </div>
                                                {/if}
                                            </div>
                                        {/if}

                                        {#if item.link}
                                            <svg 
                                                xmlns="http://www.w3.org/2000/svg" 
                                                class="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" 
                                                fill="none" viewBox="0 0 24 24" 
                                                stroke="currentColor"
                                            >
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                                            </svg>
                                        {/if}
                                    </div>
                                </div>
                            {/each}
                        {/if}
                    </div>
                </div>
            {/each}

            {#if $user && ($user.roles === 'admin' || $user.roles === 'sudo')}
                <button 
                    onclick={openNewSectionModal}
                    class="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-white text-gray-400 hover:text-blue-500 transition-all duration-300 min-h-[250px] group shadow-sm hover:shadow-md"
                >
                    <div class="w-16 h-16 rounded-full bg-gray-50 group-hover:bg-blue-50 flex items-center justify-center mb-4 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                    <span class="text-xl font-black uppercase tracking-tight">Nova Seção</span>
                </button>
            {/if}
        </div>
    {/if}
</div>

<style>
    /* Estilização customizada para o seletor de cores */
    input[type="color"]::-webkit-color-swatch-wrapper {
        padding: 0;
    }
    input[type="color"]::-webkit-color-swatch {
        border: none;
        border-radius: 8px;
    }
    input[type="color"]::-moz-color-swatch {
        border: none;
        border-radius: 8px;
    }
</style>

<!-- Modal Section (Copiado de admin/menu) -->
{#if showSectionModal}
    <div class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" transition:fade>
        <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" transition:slide={{ duration: 200, axis: 'y' }}>
            <h2 class="text-xl font-bold text-gray-800 mb-4">{editingSection ? 'Editar Seção' : 'Nova Seção'}</h2>
            
            <form class="space-y-4" onsubmit={(e) => { e.preventDefault(); saveSection(); }}>
                <div>
                    <label for="sectionCode" class="block text-sm font-medium text-gray-700 mb-1">Código (ID numérico)</label>
                    <input id="sectionCode" type="number" bind:value={sectionForm.code} class="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" required>
                </div>
                
                <div>
                    <label for="sectionCaption" class="block text-sm font-medium text-gray-700 mb-1">Título da Seção</label>
                    <input id="sectionCaption" type="text" bind:value={sectionForm.caption} class="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" required>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="sectionColorDark" class="block text-sm font-medium text-gray-700 mb-1">Cor Escura</label>
                        <div class="flex items-center gap-2">
                             <input type="color" bind:value={sectionForm.colorDark} class="h-10 w-10 p-0 border border-gray-300 rounded-lg cursor-pointer overflow-hidden flex-shrink-0" style="appearance: none; -webkit-appearance: none; border: 1px solid #d1d5db;">
                             <input id="sectionColorDark" type="text" bind:value={sectionForm.colorDark} class="w-full min-w-0 rounded-lg border-gray-300 text-xs py-2 px-1 text-center" placeholder="#000000">
                        </div>
                    </div>
                    <div>
                        <label for="sectionColorLight" class="block text-sm font-medium text-gray-700 mb-1">Cor Clara (Fundo)</label>
                        <div class="flex items-center gap-2">
                             <input type="color" bind:value={sectionForm.colorLight} class="h-10 w-10 p-0 border border-gray-300 rounded-lg cursor-pointer overflow-hidden flex-shrink-0" style="appearance: none; -webkit-appearance: none; border: 1px solid #d1d5db;">
                             <input id="sectionColorLight" type="text" bind:value={sectionForm.colorLight} class="w-full min-w-0 rounded-lg border-gray-300 text-xs py-2 px-1 text-center" placeholder="#FFFFFF">
                        </div>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <input type="checkbox" id="secActive" bind:checked={sectionForm.isActive} class="rounded text-blue-600 focus:ring-blue-500">
                    <label for="secActive" class="text-sm text-gray-700 font-medium">Seção Ativa?</label>
                </div>

                <div class="flex justify-end gap-3 mt-6 pt-2">
                    <button type="button" onclick={() => showSectionModal = false} class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancelar</button>
                    <button type="submit" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm">Salvar</button>
                </div>
            </form>
        </div>
    </div>
{/if}

<!-- Modal Item (Copiado de admin/menu) -->
{#if showItemModal}
    <div class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" transition:fade>
        <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" transition:slide={{ duration: 200, axis: 'y' }}>
            <h2 class="text-xl font-bold text-gray-800 mb-4">{editingItem ? 'Editar Item' : 'Novo Item'}</h2>
            
            <form class="space-y-4" onsubmit={(e) => { e.preventDefault(); saveItem(); }}>
                <div>
                     <label for="itemParentSection" class="block text-sm font-medium text-gray-700 mb-1">Seção Pai (Código)</label>
                     <input id="itemParentSection" type="number" bind:value={itemForm.sectionId} class="w-full rounded-lg border-gray-300 bg-gray-100 text-gray-500 shadow-sm" readonly>
                </div>

                <div>
                    <label for="itemModel" class="block text-sm font-medium text-gray-700 mb-1">Modelo (Código Item)</label>
                    <input id="itemModel" type="text" bind:value={itemForm.model} class="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" required placeholder="Ex: 1101">
                </div>
                
                <div>
                    <label for="itemCaption" class="block text-sm font-medium text-gray-700 mb-1">Título do Item</label>
                    <input id="itemCaption" type="text" bind:value={itemForm.caption} class="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" required>
                </div>
                
                <div>
                    <label for="itemLink" class="block text-sm font-medium text-gray-700 mb-1">Link URL</label>
                    <input id="itemLink" type="text" bind:value={itemForm.link} class="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="https://... ou /...">
                </div>

                <div class="flex items-center gap-2">
                    <input type="checkbox" id="itemActive" bind:checked={itemForm.isActive} class="rounded text-blue-600 focus:ring-blue-500">
                    <label for="itemActive" class="text-sm text-gray-700 font-medium">Item Ativo?</label>
                </div>

                <div class="flex justify-end gap-3 mt-6 pt-2">
                    <button type="button" onclick={() => showItemModal = false} class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancelar</button>
                    <button type="submit" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm">Salvar</button>
                </div>
            </form>
        </div>
    </div>
{/if}

