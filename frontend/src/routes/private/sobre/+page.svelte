<script lang="ts">
    import { onMount } from 'svelte';
    import { user } from '$lib/stores/auth';
    import { checkAuth, apiFetch } from '$lib/api';
    import { goto } from '$app/navigation';
    import { fade, slide } from 'svelte/transition';

    let isLoading = $state(true);
    let isSubmitting = $state(false);
    let successMessage = $state('');
    let errorMessage = $state('');

    let formData = $state({
        name: '',
        email: '',
        subject: '',
        message: ''
    });

    onMount(async () => {
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated) {
            goto('/auth/login');
            return;
        }
        isLoading = false;
        
        // Pre-fill user data if available
        if ($user) {
            formData.name = $user.name || '';
            formData.email = $user.email || '';
        }
    });

    async function handleSubmit(e: Event) {
        e.preventDefault();
        isSubmitting = true;
        successMessage = '';
        errorMessage = '';

        try {
            const response = await apiFetch('/emails/contact', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                successMessage = 'Sua mensagem foi enviada com sucesso! Entraremos em contato em breve.';
                formData.subject = '';
                formData.message = '';
            } else {
                errorMessage = data.error || 'Erro ao enviar a mensagem. Tente novamente mais tarde.';
            }
        } catch (err) {
            errorMessage = 'Ocorreu um erro de conexão. Verifique sua internet.';
        } finally {
            isSubmitting = false;
        }
    }
</script>

<svelte:head>
    <title>Sobre o Sistema | CEDUP</title>
</svelte:head>

<div class="container mx-auto px-6 py-12 max-w-5xl" in:fade>
    {#if isLoading}
        <div class="flex items-center justify-center h-64">
            <div class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    {:else}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <!-- Informational Section -->
            <div class="space-y-8">
                <div class="space-y-4">
                    <h1 class="text-4xl font-black text-blue-900 tracking-tight">Sobre o GetMais</h1>
                    <p class="text-lg text-gray-600 leading-relaxed font-medium">
                        O sistema <strong>GetMais</strong> foi desenvolvido para modernizar e agilizar os processos administrativos do 
                        <strong>CEDUP Joinville</strong>. Nossa missão é facilitar a interação entre alunos, professores e empresas.
                    </p>
                </div>

                <div class="grid grid-cols-1 gap-6">
                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
                        <div class="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 class="font-bold text-gray-900">Gestão de Estágios</h3>
                            <p class="text-sm text-gray-500">Acompanhamento completo desde a abertura da vaga até a finalização do TCE.</p>
                        </div>
                    </div>

                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
                        <div class="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <div>
                            <h3 class="font-bold text-gray-900">Segurança de Dados</h3>
                            <p class="text-sm text-gray-500">Seus dados e documentos protegidos com as melhores tecnologias de criptografia.</p>
                        </div>
                    </div>
                </div>

                <div class="pt-8 border-t border-gray-100">
                    <p class="text-sm text-gray-400 font-medium italic">
                        Desenvolvido por LCO Systems em parceria com o CEDUP Joinville.
                    </p>
                </div>
            </div>

            <!-- Contact Form Section -->
            <div class="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                <div class="bg-blue-600 px-8 py-6 text-white">
                    <h2 class="text-2xl font-bold">Entre em Contato</h2>
                    <p class="text-blue-100 text-sm mt-1">Dúvidas, sugestões ou suporte técnico? Mande uma mensagem.</p>
                </div>

                <form on:submit={handleSubmit} class="p-8 space-y-5">
                    {#if successMessage}
                        <div transition:slide class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm font-bold">
                            {successMessage}
                        </div>
                    {/if}

                    {#if errorMessage}
                        <div transition:slide class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-bold">
                            {errorMessage}
                        </div>
                    {/if}

                    <div class="space-y-2">
                        <label for="name" class="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Nome Completo</label>
                        <input 
                            type="text" 
                            id="name"
                            bind:value={formData.name}
                            required
                            class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium"
                            placeholder="Seu nome"
                        />
                    </div>

                    <div class="space-y-2">
                        <label for="email" class="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">E-mail de Contato</label>
                        <input 
                            type="email" 
                            id="email"
                            bind:value={formData.email}
                            required
                            class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium"
                            placeholder="seu@email.com"
                        />
                    </div>

                    <div class="space-y-2">
                        <label for="subject" class="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Assunto</label>
                        <input 
                            type="text" 
                            id="subject"
                            bind:value={formData.subject}
                            required
                            class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium"
                            placeholder="Ex: Dúvida sobre o estágio"
                        />
                    </div>

                    <div class="space-y-2">
                        <label for="message" class="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Mensagem</label>
                        <textarea 
                            id="message"
                            bind:value={formData.message}
                            required
                            rows="4"
                            class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium resize-none"
                            placeholder="Descreva sua dúvida ou sugestão..."
                        ></textarea>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 mt-4"
                    >
                        {#if isSubmitting}
                            <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Enviando...
                        {:else}
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                            Enviar Mensagem
                        {/if}
                    </button>
                </form>
            </div>
        </div>
    {/if}
</div>
