import { apiFetch } from '$lib/api';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
    try {
        const res = await apiFetch('/config/features', {}, fetch);
        
        if (!res.ok) {
            throw error(res.status, 'Não foi possível carregar as configurações');
        }

        const features = await res.json();
        return { features };
    } catch (err: any) {
        console.error('[SETTINGS LOAD ERR]', err);
        throw error(500, 'Erro ao carregar página de configurações');
    }
};
