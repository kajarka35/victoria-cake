import { cms } from '$lib/cms';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
    // Cargar datos globales para Header, Footer, etc.
    const globalContent = await cms.getSection('global_contact');

    // Cargar SEO Global (título base, descripción por defecto)
    const seoContent = await cms.getSection('global_seo');

    return {
        cms: {
            contact: globalContent,
            seo: seoContent
        }
    };
};
