<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { user } from '$lib/stores/auth';
	import { apiFetch, checkAuth } from '$lib/api';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { fade, fly } from 'svelte/transition';
	import Modal from '$lib/components/Modal.svelte';

	interface Internship {
		id: string;
		userId: string;
		studentRegistration: number;
		studentName: string;
		courseSigla: string;
		companyName: string;
		startDate: string;
		endDate: string;
		printDate: string | null;
		jsonData: any;
		createdAt: string;
		updatedAt: string;
		status:
			| 'DRAFT'
			| 'DRAFT_BY_TEACHER'
			| 'WAITING_APPROVAL'
			| 'REVISION_REQUESTED'
			| 'APPROVED'
			| 'STARTED'
			| 'FINISHED'
			| 'ARCHIVED';
		hasOccurrences?: boolean;
	}

	interface Teacher {
		id: string;
		name: string;
		email: string;
		registration: string;
	}

	let internships = $state<Internship[]>([]);
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let totalRecords = $state(0);
	let isDeleting = $state(false);
	let isDeletingId = $state<string | null>(null);
	let isCopying = $state(false);
	let isCopyingId = $state<string | null>(null);
	let teachers = $state<Teacher[]>([]);
	let selectedTeacher = $state($page.url.searchParams.get('teacher') || '');
	let selectedStatuses = $state<string[]>($page.url.searchParams.get('status')?.split(',').filter(Boolean) || []);

	const statusLabels: Record<string, string> = {
		DRAFT: 'Editando',
		DRAFT_BY_TEACHER: 'Rascunho Professor',
		WAITING_APPROVAL: 'Aguardando Aprovação',
		REVISION_REQUESTED: 'Revisão Solicitada',
		APPROVED: 'Aprovado',
		STARTED: 'Estagiando',
		FINISHED: 'Finalizado',
		ARCHIVED: 'Arquivado'
	};

	function toggleStatus(status: string) {
		if (selectedStatuses.includes(status)) {
			selectedStatuses = selectedStatuses.filter((s) => s !== status);
		} else {
			selectedStatuses = [...selectedStatuses, status];
		}
		triggerSearch();
	}

	function clearStatuses() {
		selectedStatuses = [];
		triggerSearch();
	}

	// Filtros e Paginação (Server-side)
	let searchTerm = $state($page.url.searchParams.get('search') || '');
	let searchName = $state($page.url.searchParams.get('studentName') || '');
	let pageSize = $state(Number($page.url.searchParams.get('limit')) || 25);
	let currentPage = $state(Number($page.url.searchParams.get('page')) || 1);

	async function fetchInternships() {
		if (isLoading && internships.length > 0) return;

		isLoading = true;
		try {
			const query = new URLSearchParams({
				page: String(currentPage),
				limit: String(pageSize.toString()),
				search: searchTerm,
				studentName: searchName,
				teacher: selectedTeacher,
				status: selectedStatuses.join(',')
			});

			const response = await apiFetch(`/internships?${query.toString()}`);
			if (response.ok) {
				const result = await response.json();

				if (result.data && Array.isArray(result.data)) {
					internships = result.data;
					totalRecords = result.total;
				} else {
					internships = result;
					totalRecords = result.length;
				}

				// totalRecords = result.total;
			} else {
				error = 'Erro ao carregar estágios do servidor.';
			}
		} catch {
			error = 'Houve um problema de conexão com o servidor.';
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		let unsubscribe: () => void;

		checkAuth().then(async (isAuthenticated) => {
			if (!isAuthenticated) {
				goto('/auth/login');
				return;
			}

			// Proteção por Role: Apenas teacher, admin e sudo podem ver estagiários
			unsubscribe = user.subscribe((u) => {
				if (u && u.roles) {
					if (!['teacher', 'admin', 'sudo'].includes(u.roles)) {
						goto('/'); // Redireciona usuários não autorizados para a home
					}
				}
			});

			await Promise.all([fetchTeachers()]);
		});

		return () => {
			if (unsubscribe) unsubscribe();
		};
	});

	async function fetchTeachers() {
		try {
			const res = await apiFetch('/teachers');
			if (res.ok) {
				teachers = await res.json();
			}
		} catch {
			console.error('Erro ao carregar professores');
		}
	}

	$effect(() => {
		const url = $page.url;
		const currentUser = $user;

		untrack(() => {
			searchTerm = url.searchParams.get('search') || '';
			searchName = url.searchParams.get('studentName') || '';
			selectedTeacher = url.searchParams.get('teacher') || '';
			
			const statusParam = url.searchParams.get('status');
			selectedStatuses = statusParam ? statusParam.split(',').filter(Boolean) : [];
			
			pageSize = Number(url.searchParams.get('limit')) || 25;
			currentPage = Number(url.searchParams.get('page')) || 1;

			const hasFilters = url.searchParams.has('search') ||
				url.searchParams.has('studentName') ||
				url.searchParams.has('teacher') ||
				url.searchParams.has('status') ||
				url.searchParams.has('page') ||
				url.searchParams.has('limit');

			if (hasFilters) {
				if (currentUser) {
					fetchInternships();
				}
			} else {
				internships = [];
				totalRecords = 0;
			}
		});
	});

	function updateURL() {
		const query = new URLSearchParams();
		query.set('page', String(currentPage));
		query.set('limit', String(pageSize));
		if (searchTerm) query.set('search', searchTerm);
		if (searchName) query.set('studentName', searchName);
		if (selectedTeacher) query.set('teacher', selectedTeacher);
		if (selectedStatuses.length > 0) query.set('status', selectedStatuses.join(','));

		const queryString = query.toString();
		const newURL = `?${queryString}`;

		goto(newURL, { keepFocus: true, replaceState: true });
	}

	function handleSearch(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			triggerSearch();
		}
	}

	function triggerSearch() {
		currentPage = 1;
		updateURL();
	}

	function handlePageSizeChange() {
		currentPage = 1;
		updateURL();
	}

	function formatDate(dateStr: string) {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('pt-BR');
	}

	let totalPages = $derived(Math.ceil(totalRecords / pageSize));

	function changePage(page: number) {
		if (page >= 1 && page <= totalPages) {
			currentPage = page;
			updateURL();
		}
	}

	async function handleDelete(id: string) {
		if (!confirm('Tem certeza que deseja excluir este contrato de estágio?')) return;

		isDeleting = true;
		isDeletingId = id;
		try {
			const response = await apiFetch(`/internships/${id}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				// Remove da lista local e atualiza contador
				internships = internships.filter((item) => item.id !== id);
				totalRecords--;

				// Se a página ficou vazia e não é a primeira, volta uma
				if (internships.length === 0 && currentPage > 1) {
					currentPage--;
					updateURL();
				}
			} else {
				alert('Erro ao excluir o estágio.');
			}
		} catch (e) {
			alert('Erro de conexão ao tentar excluir.');
		} finally {
			isDeleting = false;
			isDeletingId = null;
		}
	}

	async function handleCopy(id: string) {
		if (!confirm('Deseja criar uma cópia deste TCE? O nome do aluno será prefixado com "Cópia de ".')) return;

		isCopying = true;
		isCopyingId = id;
		try {
			const response = await apiFetch(`/internships/${id}/copy`, { method: 'POST' });
			if (response.ok) {
				const newItem = await response.json();
				internships = [newItem, ...internships];
				totalRecords++;
				alert(`Cópia criada com sucesso! Nome: ${newItem.studentName}`);
			} else {
				const err = await response.json();
				alert(err.error || 'Erro ao criar cópia do estágio.');
			}
		} catch {
			alert('Erro de conexão ao tentar criar a cópia.');
		} finally {
			isCopying = false;
			isCopyingId = null;
		}
	}

	let showOccurrencesModal = $state(false);
	let selectedInternship = $state<Internship | null>(null);
	let occurrences = $state<any[]>([]);
	let isOccurrencesLoading = $state(false);
	let occurrencesError = $state<string | null>(null);

	async function fetchOccurrences(internshipId: string) {
		isOccurrencesLoading = true;
		occurrencesError = null;
		try {
			const res = await apiFetch(`/internships/${internshipId}/occurrences`);
			if (res.ok) {
				occurrences = await res.json();
			} else {
				occurrencesError = 'Erro ao carregar ocorrências.';
			}
		} catch {
			occurrencesError = 'Problema de conexão ao buscar ocorrências.';
		} finally {
			isOccurrencesLoading = false;
		}
	}

	function openOccurrencesModal(item: Internship) {
		selectedInternship = item;
		showOccurrencesModal = true;
		fetchOccurrences(item.id);
	}

	async function toggleOccurrenceResolution(occurrenceId: string, currentResolved: boolean) {
		if (!selectedInternship) return;
		try {
			const res = await apiFetch(`/internships/${selectedInternship.id}/occurrences/${occurrenceId}/resolve`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ resolved: !currentResolved })
			});

			if (res.ok) {
				const data = await res.json();
				// Atualizar ocorrência na lista local
				occurrences = occurrences.map(occ => {
					if (occ.id === occurrenceId) {
						return {
							...occ,
							resolvedAt: data.occurrence.resolvedAt,
							resolvedByName: data.occurrence.resolvedAt ? ($user?.fullName || 'Você') : null,
							resolvedByRole: data.occurrence.resolvedAt ? ($user?.roles || 'teacher') : null
						};
					}
					return occ;
				});

				// Atualizar item na listagem principal
				internships = internships.map(item => {
					if (item.id === selectedInternship!.id) {
						return { ...item, hasOccurrences: data.hasOccurrences };
					}
					return item;
				});
			} else {
				const err = await res.json();
				alert(err.error || 'Erro ao alterar resolução da ocorrência.');
			}
		} catch {
			alert('Erro ao tentar se conectar ao servidor.');
		}
	}
</script>

<svelte:head>
	<title>Cedup - Lista de Estagiários</title>
</svelte:head>

<div class="min-h-screen bg-slate-50 p-4 md:p-8">
	<div class="mx-auto max-w-7xl space-y-6">
		<!-- Header Section -->
		<header class="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
			<div class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
				<div>
					<h1 class="text-2xl font-black tracking-tight text-slate-800">
						CEDUP - Lista de Estagiários
					</h1>
					<p class="text-sm font-medium text-slate-500">
						Gerenciamento e consulta de contratos de estágio
					</p>
				</div>
			</div>

			<!-- Linha 1 de Filtros (Buscas Textuais) -->
			<div class="flex flex-col gap-3 md:flex-row">
				<div class="relative flex-1">
					<input
						type="text"
						placeholder="Busca geral (matrícula, empresa...)"
						class="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-4 pl-10 text-sm transition-all outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
						bind:value={searchTerm}
						onkeydown={handleSearch}
					/>
					<svg
						class="absolute top-2.5 left-3 h-4 w-4 text-slate-400"
						xmlns="http://www.w3.org/2000/svg"
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

				<div class="relative flex-1">
					<input
						type="text"
						placeholder="Buscar especificamente por NOME..."
						class="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-4 pl-10 text-sm transition-all outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
						bind:value={searchName}
						onkeydown={handleSearch}
					/>
					<svg
						class="absolute top-2.5 left-3 h-4 w-4 text-slate-400"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
						/>
					</svg>
				</div>
			</div>

			<!-- Linha 2 de Filtros (Categorias e Ações) -->
			<div class="flex flex-wrap items-center gap-3">
				<select
					bind:value={selectedTeacher}
					onchange={triggerSearch}
					class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 md:w-64"
				>
					<option value="">Professor (Todos)</option>
					{#each teachers as t (t.id)}
						<option value={t.name}>{t.name}</option>
					{/each}
				</select>

				<div class="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-1">
					<button
						onclick={clearStatuses}
						class="rounded-lg px-3 py-1.5 text-xs font-black transition-all {selectedStatuses.length ===
						0
							? 'bg-white text-indigo-600 shadow-sm'
							: 'text-slate-500 hover:bg-white/50'}"
					>
						Todos
					</button>
					{#each Object.entries(statusLabels) as [value, label]}
						<button
							onclick={() => toggleStatus(value)}
							class="rounded-lg px-3 py-1.5 text-xs font-black transition-all {selectedStatuses.includes(
								value
							)
								? 'bg-indigo-600 text-white shadow-md'
								: 'text-slate-500 hover:bg-white hover:text-indigo-600'}"
						>
							{label}
						</button>
					{/each}
				</div>

				<div class="flex-grow"></div>

				<div class="flex items-center gap-3">
					<span class="whitespace-nowrap text-xs font-black tracking-tight text-slate-400"
						>Itens por Página:</span
					>
					<select
						bind:value={pageSize}
						onchange={handlePageSizeChange}
						class="cursor-pointer rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-10 text-sm font-bold text-slate-700 outline-none transition-all hover:border-indigo-300 focus:ring-2 focus:ring-indigo-500"
					>
						<option value={10}>10</option>
						<option value={25}>25</option>
						<option value={50}>50</option>
						<option value={100}>100</option>
					</select>
				</div>

				<div class="h-8 w-px bg-slate-200"></div>

				<button
					onclick={triggerSearch}
					class="flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-2 text-sm font-black text-white transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
					disabled={isLoading}
				>
					{#if isLoading}
						<div
							class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
						></div>
					{:else}
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2.5"
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
							/>
						</svg>
					{/if}
					Pesquisar
				</button>
			</div>
		</header>

		<!-- Main Content -->
		<main
			class="relative min-h-[400px] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl"
		>
			{#if isLoading && internships.length === 0}
				<div class="flex flex-col items-center justify-center space-y-4 p-20">
					<div
						class="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"
					></div>
					<p class="animate-pulse font-bold text-slate-500">Carregando dados do servidor...</p>
				</div>
			{:else if error}
				<div class="space-y-4 p-20 text-center">
					<div class="text-5xl text-red-500">⚠️</div>
					<p class="font-semibold text-slate-700">{error}</p>
					<button
						class="rounded-lg bg-indigo-600 px-6 py-2 text-white transition hover:bg-indigo-700"
						onclick={() => window.location.reload()}>Tentar novamente</button
					>
				</div>
			{:else}
				<!-- Overlay de loading para trocas de página -->
				{#if isLoading}
					<div
						class="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-[1px]"
						transition:fade={{ duration: 200 }}
					>
						<div
							class="h-8 w-8 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent"
						></div>
					</div>
				{/if}

				<div class="overflow-x-auto">
					<table class="w-full border-collapse text-left">
						<thead>
							<tr class="border-b border-slate-100 bg-slate-50">
								<th class="px-3 py-4 text-xs font-black tracking-wider text-slate-500 uppercase"
									>Matrícula</th
								>
								<th class="px-3 py-4 text-xs font-black tracking-wider text-slate-500 uppercase"
									>Nome Aluno</th
								>
								<th class="px-3 py-4 text-xs font-black tracking-wider text-slate-500 uppercase"
									>Curso</th
								>
								<th class="px-3 py-4 text-xs font-black tracking-wider text-slate-500 uppercase"
									>Empresa</th
								>
								<th class="px-3 py-4 text-xs font-black tracking-wider text-slate-500 uppercase"
									>Início</th
								>
								<th class="px-3 py-4 text-xs font-black tracking-wider text-slate-500 uppercase"
									>Final</th
								>
								<th class="px-3 py-4 text-xs font-black tracking-wider text-slate-500 uppercase"
									>Criado em</th
								>
								<th class="px-3 py-4 text-xs font-black tracking-wider text-slate-500 uppercase"
									>Modificado em</th
								>
								<th class="px-3 py-4 text-xs font-black tracking-wider text-slate-500 uppercase"
									>Status</th
								>

								<th
									class="px-3 py-4 text-center text-xs font-black tracking-wider text-slate-500 uppercase"
									>Ações</th
								>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-50">
							{#each internships as item, i (item.id)}
								<tr
									in:fly={{ x: -10, duration: 300, delay: i * 20 }}
									class="group transition-colors hover:bg-indigo-50/30"
								>
									<td class="px-3 py-4 font-mono text-sm text-slate-600"
										>{item.studentRegistration || '-'}</td
									>
									<td class="px-3 py-4">
										<div class="flex items-center gap-2">
											<div class="text-sm font-bold text-slate-800">{item.studentName}</div>
											{#if item.hasOccurrences && $user && ['teacher', 'admin', 'sudo'].includes($user.roles || '')}
												<button
													type="button"
													onclick={(e) => {
														e.stopPropagation();
														openOccurrencesModal(item);
													}}
													class="inline-flex items-center justify-center rounded-full bg-amber-50 hover:bg-amber-100 p-1 text-amber-500 hover:text-amber-600 transition-colors shadow-sm cursor-pointer"
													title="Ver Pendências/Ocorrências do Estágio"
												>
													<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
													</svg>
												</button>
											{/if}
											{#if $user && $user.roles === 'company' && item.userId !== $user.id}
												<span
													class="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-black tracking-wider text-indigo-500 uppercase"
												>
													Recebido
												</span>
											{/if}
										</div>
									</td>
									<td class="px-3 py-4">
										<span
											class="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-black text-indigo-700 transition-colors group-hover:bg-indigo-200"
										>
											{item.courseSigla}
										</span>
									</td>
									<td class="px-3 py-4 text-sm font-medium text-slate-700">{item.companyName}</td>
									<td class="px-3 py-4 text-sm whitespace-nowrap text-slate-500"
										>{formatDate(item.startDate)}</td
									>
									<td class="px-3 py-4 text-sm whitespace-nowrap text-slate-500"
										>{formatDate(item.endDate)}</td
									>
									<td class="px-3 py-4 text-sm whitespace-nowrap text-slate-400"
										>{new Date(item.createdAt).toLocaleString('pt-BR', {
											day: '2-digit',
											month: '2-digit',
											year: 'numeric',
											hour: '2-digit',
											minute: '2-digit'
										})}</td
									>
									<td class="px-3 py-4 text-sm whitespace-nowrap text-slate-400"
										>{new Date(item.updatedAt).toLocaleString('pt-BR', {
											day: '2-digit',
											month: '2-digit',
											year: 'numeric',
											hour: '2-digit',
											minute: '2-digit'
										})}</td
									>
 
									<td class="px-3 py-4">
										{#if item.status === 'DRAFT'}
											<span
												class="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-black tracking-tight text-slate-600 uppercase"
											>
												Editando
											</span>
										{:else if item.status === 'DRAFT_BY_TEACHER'}
											<span
												class="inline-flex items-center rounded-full border border-purple-200 bg-purple-100 px-2.5 py-0.5 text-[10px] font-black tracking-tight text-purple-700 uppercase"
											>
												Rascunho Professor
											</span>
										{:else if item.status === 'WAITING_APPROVAL'}
											<span
												class="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-2.5 py-0.5 text-[10px] font-black tracking-tight text-amber-700 uppercase"
											>
												Aguardando Aprovação
											</span>
										{:else if item.status === 'REVISION_REQUESTED'}
											<span
												class="inline-flex items-center rounded-full border border-rose-200 bg-rose-100 px-2.5 py-0.5 text-[10px] font-black tracking-tight text-rose-700 uppercase"
											>
												Revisão Solicitada
											</span>
										{:else if item.status === 'APPROVED'}
											<span
												class="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black tracking-tight text-emerald-700 uppercase"
											>
												Aprovado
											</span>
										{:else if item.status === 'STARTED'}
											<span
												class="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-100 px-2.5 py-0.5 text-[10px] font-black tracking-tight text-indigo-700 uppercase"
											>
												Estagiando
											</span>
										{:else if item.status === 'FINISHED'}
											<span
												class="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black tracking-tight text-emerald-700 uppercase"
											>
												Finalizado
											</span>
										{:else if item.status === 'ARCHIVED'}
											<span
												class="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-black tracking-tight text-slate-500 uppercase"
											>
												Arquivado
											</span>
										{:else}
											<span
												class="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-black tracking-tight text-slate-600 uppercase"
											>
												{item.status}
											</span>
										{/if}
									</td>
 
									<td class="px-3 py-4 text-center">
										<div class="flex items-center justify-center gap-2">
											<a
												href="/gotce/v2?id={item.id}"
												target="_blank"
												class="group/btn rounded-lg p-2 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600"
												title="Editar"
												onclick={(e) => e.stopPropagation()}
											>
												<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
													/>
												</svg>
											</a>

											{#if $user && ['teacher', 'admin', 'sudo'].includes($user.roles || '')}
												<button
													class="rounded-lg p-2 text-indigo-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-30"
													title="Criar Cópia do TCE"
													disabled={isCopying && isCopyingId === item.id}
													onclick={(e) => {
														e.stopPropagation();
														handleCopy(item.id);
													}}
												>
													{#if isCopying && isCopyingId === item.id}
														<div
															class="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"
														></div>
													{:else}
														<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
															/>
														</svg>
													{/if}
												</button>
											{/if}

											<button
												class="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 disabled:opacity-30"
												title="Excluir"
												disabled={isDeleting && isDeletingId === item.id}
												onclick={(e) => {
													e.stopPropagation();
													handleDelete(item.id);
												}}
											>
												{#if isDeleting && isDeletingId === item.id}
													<div
														class="h-5 w-5 animate-spin rounded-full border-2 border-red-500 border-t-transparent"
													></div>
												{:else}
													<svg
														class="h-5 w-5"
														fill="none"
														viewBox="0 0 24 24"
														stroke="currentColor"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
														/>
													</svg>
												{/if}
											</button>
										</div>
									</td>
								</tr>
							{/each}

							{#if internships.length === 0}
								<tr>
									<td colspan="9" class="px-3 py-20 text-center">
										<div class="flex flex-col items-center space-y-2">
											<svg
												class="h-12 w-12 text-slate-200"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="1.5"
													d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
												/>
											</svg>
											<p class="font-medium text-slate-400 italic">Nenhum estagiário encontrado.</p>
										</div>
									</td>
								</tr>
							{/if}
						</tbody>
					</table>
				</div>

				<!-- Footer / Pagination -->
				<footer
					class="flex flex-col items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/50 px-6 py-4 md:flex-row"
				>
					<div class="text-xs font-bold text-slate-500">
						Mostrando {internships.length} de {totalRecords} registros encontrados
					</div>

					{#if totalPages > 1}
						<div class="flex items-center gap-2">
							<button
								class="rounded-lg border border-transparent p-2 font-bold transition-all hover:border-slate-200 hover:bg-white hover:shadow-sm disabled:opacity-30"
								disabled={currentPage === 1}
								onclick={() => changePage(currentPage - 1)}
							>
								<svg class="inline h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
									><path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M15 19l-7-7 7-7"
									/></svg
								>
								Anterior
							</button>

							<div class="flex items-center gap-1">
								<span
									class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 shadow-sm"
								>
									Página {currentPage} de {totalPages}
								</span>
							</div>

							<button
								class="rounded-lg border border-transparent p-2 font-bold transition-all hover:border-slate-200 hover:bg-white hover:shadow-sm disabled:opacity-30"
								disabled={currentPage === totalPages}
								onclick={() => changePage(currentPage + 1)}
							>
								Próxima
								<svg class="inline h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
									><path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 5l7 7-7 7"
									/></svg
								>
							</button>
						</div>
					{/if}
				</footer>
			{/if}
		</main>
	</div>
</div>

<Modal bind:show={showOccurrencesModal} onCancel={() => showOccurrencesModal = false}>
	{#snippet children()}
		<div class="p-6">
			<!-- Header -->
			<div class="mb-4 border-b border-slate-100 pb-3">
				<h3 class="text-lg font-black text-slate-800 tracking-tight">
					Ocorrências de Atenção
				</h3>
				{#if selectedInternship}
					<p class="text-xs font-bold text-indigo-600 mt-0.5 uppercase">
						{selectedInternship.studentName}
					</p>
				{/if}
			</div>

			<!-- Loader / Errors -->
			{#if isOccurrencesLoading}
				<div class="flex flex-col items-center justify-center py-8 space-y-2">
					<div class="h-8 w-8 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent"></div>
					<p class="text-xs font-bold text-slate-500 animate-pulse">Carregando ocorrências...</p>
				</div>
			{:else if occurrencesError}
				<div class="p-4 bg-rose-50 rounded-2xl text-center text-sm font-semibold text-rose-600">
					{occurrencesError}
				</div>
			{:else if occurrences.length === 0}
				<div class="text-center py-8">
					<span class="text-4xl">🎉</span>
					<p class="text-sm font-bold text-slate-500 mt-2">Nenhuma ocorrência encontrada.</p>
				</div>
			{:else}
				<!-- Occurrence List -->
				<div class="space-y-4 max-h-[300px] overflow-y-auto pr-1">
					{#each occurrences as occ}
						<div class="rounded-2xl border border-slate-100 p-4 transition-all duration-200 {occ.resolvedAt ? 'bg-slate-50 border-slate-200' : 'bg-amber-50/40 border-amber-100'}">
							<div class="flex items-start justify-between gap-3">
								<div class="flex-1 space-y-1">
									<p class="text-sm font-bold text-slate-800 leading-snug">
										{occ.description}
									</p>
									<div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
										<span>Detectado em: {new Date(occ.createdAt).toLocaleDateString('pt-BR')}</span>
										{#if occ.resolvedAt}
											<span class="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 font-black text-emerald-600 uppercase text-[9px]">
												<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
												</svg>
												Resolvido
											</span>
										{/if}
									</div>

									{#if occ.resolvedAt}
										<p class="text-xs font-semibold text-emerald-600 bg-emerald-50/50 p-2 rounded-xl mt-2 border border-emerald-100/50">
											Resolvido em {new Date(occ.resolvedAt).toLocaleString('pt-BR')}
											{#if occ.resolvedByName}
												por {occ.resolvedByName} ({occ.resolvedByRole === 'teacher' ? 'Professor' : occ.resolvedByRole})
											{:else}
												automaticamente pelo sistema
											{/if}
										</p>
									{/if}
								</div>


							</div>
						</div>
					{/each}
				</div>
			{/if}

			<!-- Footer -->
			<div class="mt-6 flex justify-end">
				<button
					type="button"
					onclick={() => showOccurrencesModal = false}
					class="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-black text-slate-500 hover:bg-slate-50 transition active:scale-95"
				>
					Fechar Janela
				</button>
			</div>
		</div>
	{/snippet}
</Modal>

<style>
	/* Estilos Premium */
	:global(body) {
		font-family:
			'Inter',
			system-ui,
			-apple-system,
			sans-serif;
	}

	table tr {
		transition: transform 0.2s;
	}

	table tr:hover {
		transform: scale(1.002);
	}
</style>
