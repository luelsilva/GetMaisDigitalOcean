import { apiFetch } from '$lib/api';
import { error } from '@sveltejs/kit';

export async function load({ fetch }) {
	try {
		const res = await apiFetch('/emails/logs', { fetch });
		if (!res.ok) {
			throw new Error('Falha ao buscar logs de e-mails');
		}
		const logs = await res.json();
		return { logs };
	} catch (err) {
		console.error(err);
		throw error(500, 'Erro ao carregar logs de e-mails');
	}
}
