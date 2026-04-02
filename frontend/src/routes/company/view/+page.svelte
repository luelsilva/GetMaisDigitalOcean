<script lang="ts">
	import { onMount } from 'svelte';
	import { user } from '$lib/stores/auth';
	import { apiFetch, checkAuth } from '$lib/api';
	import { goto } from '$app/navigation';
	import { fade, fly } from 'svelte/transition';

	interface Internship {
		id: string;
		studentRegistration: number;
		studentName: string;
		courseSigla: string;
		companyName: string;
		startDate: string;
		endDate: string;
		jsonData: any;
		createdAt: string;
		userId: string;
		status: string;
	}

	let internships: Internship[] = [];
	let isLoading = true;
	let error: string | null = null;
	let searchTerm = '';

	async function fetchSharedInternships() {
		isLoading = true;
		try {
			// A API já filtra por registros do dono OU compartilhados com o e-mail.
			// Como o usuário comum/company não tem a role 'teacher', ele só verá o que lhe pertence.
			const response = await apiFetch(`/internships?search=${searchTerm}`);
			if (response.ok) {
				const result = await response.json();
				// Se a API retornar o formato paginado { data, total }
				if (result.data) {
					internships = result.data;
				} else {
					internships = result;
				}
			} else {
				error = 'Erro ao carregar seus estágios.';
			}
		} catch (e) {
			error = 'Erro de conexão com o servidor.';
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		checkAuth().then((isAuthenticated) => {
			if (!isAuthenticated) {
				goto('/company/login');
				return;
			}
			fetchSharedInternships();
		});
	});

	// Redirecionar se o usuário deslogar enquanto estiver nesta página
	$: if ($user === null && !isLoading) {
		goto('/company/login');
	}

	function formatDate(dateStr: string) {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('pt-BR');
	}

	function handleSearch() {
		fetchSharedInternships();
	}
</script>

<svelte:head>
	<title>Área da Empresa - Meus Estágios</title>
</svelte:head>

<div class="min-h-screen bg-slate-50 p-4 md:p-8">
	<div class="mx-auto max-w-6xl space-y-6">
		<!-- Header de Boas Vindas -->
		<header class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
			<div>
				<h1 class="text-3xl font-black tracking-tight text-slate-800">
					Olá, {$user?.name?.split(' ')[0] || 'Empresa'}!
				</h1>
				<p class="font-medium text-slate-500">Estágios vinculados à sua conta</p>
			</div>

			<div class="flex items-center gap-3">
				<div class="relative">
					<input
						type="text"
						placeholder="Buscar estagiário..."
						class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pl-10 text-sm outline-none focus:ring-2 focus:ring-blue-500 md:w-64"
						bind:value={searchTerm}
						oninput={handleSearch}
					/>
					<svg
						class="absolute top-3 left-3 h-4 w-4 text-slate-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/>
					</svg>
				</div>
				<a
					href="/gotce"
					class="rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
				>
					Novo TCE
				</a>
			</div>
		</header>

		{#if isLoading && internships.length === 0}
			<div
				class="flex h-64 flex-col items-center justify-center space-y-4 rounded-3xl bg-white shadow-sm"
			>
				<div
					class="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
				></div>
				<p class="font-bold text-slate-400">Buscando contratos...</p>
			</div>
		{:else if error}
			<div class="rounded-3xl bg-red-50 p-12 text-center text-red-600">
				<p class="font-bold">{error}</p>
				<button class="mt-4 underline" onclick={fetchSharedInternships}>Tentar novamente</button>
			</div>
		{:else if internships.length === 0}
			<div
				class="flex flex-col items-center justify-center space-y-6 rounded-3xl border border-dashed border-slate-200 bg-white p-16 shadow-sm"
			>
				<div class="rounded-full bg-slate-50 p-6">
					<svg
						class="h-12 w-12 text-slate-300"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1.5"
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
				</div>
				<div class="text-center">
					<p class="text-xl font-bold text-slate-700">Nenhum contrato encontrado</p>
					<p class="text-slate-500">Você ainda não possui estágios vinculados ao seu e-mail.</p>
				</div>
				<a href="/gotce" class="font-bold text-blue-600 hover:underline">
					Começar primeiro contrato →
				</a>
			</div>
		{:else}
			<div class="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl">
				<div class="overflow-x-auto">
					<table class="w-full border-collapse text-left">
						<thead>
							<tr class="border-b border-slate-100 bg-slate-50">
								<th class="px-6 py-4 text-xs font-black tracking-wider text-slate-500 uppercase">Matrícula</th>
								<th class="px-6 py-4 text-xs font-black tracking-wider text-slate-500 uppercase">Nome Aluno</th>
								<th class="px-6 py-4 text-xs font-black tracking-wider text-slate-500 uppercase">Curso</th>
								<th class="px-6 py-4 text-xs font-black tracking-wider text-slate-500 uppercase">Início</th>
								<th class="px-6 py-4 text-xs font-black tracking-wider text-slate-500 uppercase">Final</th>
								<th class="px-6 py-4 text-xs font-black tracking-wider text-slate-500 uppercase">Status</th>
								<th class="px-6 py-4 text-center text-xs font-black tracking-wider text-slate-500 uppercase">Ações</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-50">
							{#each internships as item, i (item.id)}
								<tr
									in:fly={{ x: -10, duration: 300, delay: i * 20 }}
									class="group transition-colors hover:bg-indigo-50/30"
								>
									<td class="px-6 py-4 font-mono text-sm text-slate-600">{item.studentRegistration || '-'}</td>
									<td class="px-6 py-4">
										<div class="flex items-center gap-2">
											<div class="text-sm font-bold text-slate-800">{item.studentName}</div>
										</div>
									</td>
									<td class="px-6 py-4">
										<span class="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-black text-indigo-700 transition-colors group-hover:bg-indigo-200">
											{item.courseSigla}
										</span>
									</td>
									<td class="px-6 py-4 text-sm whitespace-nowrap text-slate-500">{formatDate(item.startDate)}</td>
									<td class="px-6 py-4 text-sm whitespace-nowrap text-slate-500">{formatDate(item.endDate)}</td>
									<td class="px-6 py-4">
										{#if item.status === 'DRAFT'}
											<span class="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-black tracking-tight text-slate-600 uppercase">
												Editando
											</span>
										{:else if item.status === 'WAITING_APPROVAL'}
											<span class="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-2.5 py-0.5 text-[10px] font-black tracking-tight text-amber-700 uppercase">
												Aguardando
											</span>
										{:else if item.status === 'REVISION_REQUESTED'}
											<span class="inline-flex items-center rounded-full border border-rose-200 bg-rose-100 px-2.5 py-0.5 text-[10px] font-black tracking-tight text-rose-700 uppercase">
												Em Revisão
											</span>
										{:else if item.status === 'APPROVED'}
											<span class="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black tracking-tight text-emerald-700 uppercase">
												Aprovado
											</span>
										{:else if item.status === 'STARTED'}
											<span class="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-100 px-2.5 py-0.5 text-[10px] font-black tracking-tight text-indigo-700 uppercase">
												Estagiando
											</span>
										{:else}
											<span class="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-black tracking-tight text-slate-600 uppercase">
												{item.status || 'DRAFT'}
											</span>
										{/if}
									</td>
									<td class="px-6 py-4 text-center">
										<div class="flex items-center justify-center gap-2">
											<a
												href="/gotce?id={item.id}"
												class="group/btn rounded-lg p-2 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
												title="Acessar TCE"
											>
												<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
												</svg>
											</a>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	:global(body) {
		background-color: #f8fafc;
	}

	table tr {
		transition: transform 0.2s;
	}

	table tr:hover {
		transform: scale(1.002);
	}
</style>
