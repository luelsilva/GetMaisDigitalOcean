<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import LoginForm from '$lib/components/auth/LoginForm.svelte';

	let initialEmail = $state('');

	onMount(() => {
		const returnTo = $page.url.searchParams.get('returnTo');
		if (returnTo) {
			localStorage.setItem('returnTo', returnTo);
		}

		const emailParam = $page.url.searchParams.get('email');
		if (emailParam) {
			initialEmail = emailParam;
		}
	});
</script>

<div class="flex min-h-[80vh] w-full flex-1 items-center justify-center bg-gray-50 px-4 py-12">
	<LoginForm {initialEmail} />
</div>
