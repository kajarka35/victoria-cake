import { cms } from '$lib/cms';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    // Cargar contenido específico del Home
    const content = await cms.getSections(['home_hero', 'home_products']);

    return {
        hero: content.home_hero || {},
        products: content.home_products || {}
    };
};
