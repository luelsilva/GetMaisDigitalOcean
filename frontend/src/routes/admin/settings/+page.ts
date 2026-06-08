import { apiFetch } from '$lib/api';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
    try {
        const [featuresRes, rulesRes] = await Promise.all([
            apiFetch('/config/features', {}, fetch),
            apiFetch('/config/occurrence-rules', {}, fetch)
        ]);
        
        if (!featuresRes.ok) {
            throw error(featuresRes.status, 'Não foi possível carregar as configurações');
        }

        const features = await featuresRes.json();
        const occurrenceRules = rulesRes.ok ? await rulesRes.json() : [];

        return { features, occurrenceRules };
    } catch (err: any) {
        console.error('[SETTINGS LOAD ERR]', err);
        throw error(500, 'Erro ao carregar página de configurações');
    }
};
