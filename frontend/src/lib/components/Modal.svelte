<script lang="ts">
	import { fade, scale } from 'svelte/transition';


	interface Props {
		show?: boolean;
		title?: string;
		message?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		type?: 'info' | 'warning' | 'error' | 'success';
		onConfirm?: () => void;
		onCancel?: () => void;
		children?: import('svelte').Snippet;
	}

	let {
		show = $bindable(false),
		title,
		message,
		confirmLabel = 'Confirmar',
		cancelLabel = 'Cancelar',
		type = 'info',
		onConfirm = () => {},
		onCancel = () => {
			show = false;
		},
		children
	}: Props = $props();

	// Bloquear o scroll do body quando o modal está aberto
	$effect(() => {
		if (show) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = 'auto';
		}
	});

	// Fechar ao apertar ESC
	function handleKeydown(event: KeyboardEvent) {
		if (show && event.key === 'Escape') {
			onCancel();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if show}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-100 flex items-center justify-center p-4"
		transition:fade={{ duration: 200 }}
	>
		<!-- Backdrop -->
		<div
			class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
			onclick={onCancel}
		></div>

		<!-- Modal Card -->
		<div
			class="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-100"
			transition:scale={{ duration: 250, start: 0.95 }}
		>
			<!-- Botão fechar (X) -->
			<button
				type="button"
				class="absolute top-5 right-5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
				onclick={onCancel}
				aria-label="Fechar"
			>
				<span class="text-xl">×</span>
			</button>

			{#if children}
				{@render children()}
			{:else}
				<!-- Header / Icon -->
				<div class="px-6 pt-8 pb-4 text-center">
					<div class="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
						{#if type === 'warning'}
							<span class="text-3xl">⚠️</span>
						{:else if type === 'success'}
							<span class="text-3xl">✅</span>
						{:else if type === 'error'}
							<span class="text-3xl">❌</span>
						{:else}
							<span class="text-3xl">📝</span>
						{/if}
					</div>
					<h3 class="text-xl font-black text-slate-800 uppercase tracking-tight">
						{title}
					</h3>
				</div>

				<!-- Body -->
				<div class="px-8 py-2 text-center text-slate-500">
					<p class="leading-relaxed font-medium">
						{message}
					</p>
				</div>

				<!-- Footer / Actions -->
				<div class="mt-8 flex flex-col gap-2 p-6 sm:flex-row">
					<button
						type="button"
						onclick={onCancel}
						class="flex-1 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-500 transition hover:bg-slate-50 active:scale-95"
					>
						{cancelLabel}
					</button>
					<button
						type="button"
						onclick={onConfirm}
						class="flex-[1.5] rounded-2xl px-5 py-3 text-sm font-black text-white shadow-lg transition active:scale-95 {type === 'warning' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-900 hover:bg-black'}"
					>
						{confirmLabel}
					</button>
				</div>
			{/if}
		</div>

	</div>
{/if}
