<script lang="ts">
	let { data } = $props();
	const logs = data.logs || [];

	function getStatusBadge(status: string) {
		const badges: Record<string, string> = {
			sent: 'bg-blue-100 text-blue-800',
			delivered: 'bg-emerald-100 text-emerald-800',
			opened: 'bg-purple-100 text-purple-800',
			clicked: 'bg-indigo-100 text-indigo-800',
			bounced: 'bg-red-100 text-red-800',
			complained: 'bg-amber-100 text-amber-800',
			failed: 'bg-red-200 text-red-900'
		};
		return badges[status] || 'bg-gray-100 text-gray-800';
	}

	function formatDate(dateString: string) {
		if (!dateString) return '-';
		return new Date(dateString).toLocaleString('pt-BR');
	}
</script>

<svelte:head>
	<title>Logs de E-mail | Admin</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8">
	<div class="mb-8">
		<h1 class="text-3xl font-black text-slate-800">Logs de E-mail</h1>
		<p class="mt-2 text-slate-600">
			Acompanhe o status dos e-mails enviados pelo sistema em tempo real.
		</p>
	</div>

	<div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm text-slate-600">
				<thead class="bg-slate-50 text-xs font-bold uppercase text-slate-700">
					<tr>
						<th class="px-6 py-4">Status</th>
						<th class="px-6 py-4">Destinatário</th>
						<th class="px-6 py-4">Assunto / Tipo</th>
						<th class="px-6 py-4">Aluno Relacionado</th>
						<th class="px-6 py-4">Enviado por</th>
						<th class="px-6 py-4">Data de Envio</th>
						<th class="px-6 py-4">Última Atualização</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100">
					{#each logs as log}
						<tr class="transition-colors hover:bg-slate-50">
							<td class="px-6 py-4">
								<span class="inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide {getStatusBadge(log.status)}">
									{log.status === 'sent' ? 'Enviado' : 
									 log.status === 'delivered' ? 'Entregue' :
									 log.status === 'opened' ? 'Aberto' :
									 log.status === 'clicked' ? 'Clicado' :
									 log.status === 'bounced' ? 'Devolvido' :
									 log.status === 'complained' ? 'Spam' : log.status}
								</span>
							</td>
							<td class="px-6 py-4 font-medium text-slate-800">
								{log.toEmail}
							</td>
							<td class="px-6 py-4">
								<p class="font-medium text-slate-700">{log.subject}</p>
								<p class="text-xs text-slate-500 uppercase tracking-wide">{log.type}</p>
							</td>
							<td class="px-6 py-4">
								{#if log.internshipId}
									<a href="/gotce/v2?id={log.internshipId}" target="_blank" class="text-indigo-600 hover:text-indigo-800 hover:underline">
										{log.studentName || 'Ver Estágio'}
									</a>
								{:else}
									<span class="text-slate-400">-</span>
								{/if}
							</td>
							<td class="px-6 py-4">
								{log.senderName || '-'}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-xs">
								{formatDate(log.createdAt)}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-xs">
								{formatDate(log.lastEventAt)}
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="7" class="px-6 py-12 text-center text-slate-500">
								<div class="flex flex-col items-center justify-center">
									<span class="mb-2 text-4xl">📭</span>
									<p>Nenhum e-mail enviado ainda.</p>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
