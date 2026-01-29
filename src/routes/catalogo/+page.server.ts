
import { cms } from '$lib/cms';
import { supabase } from '$lib/supabaseClient';

export const load = async () => {
    // 1. Cargar textos del CMS (Sección de Productos)
    const cmsContent = await cms.getSection('home_products');

    // 2. Cargar lista de productos
    const { data: productos, error } = await supabase
        .from('productos')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.error('Error cargando productos:', error);
    }

    return {
        cms: cmsContent, // { home_products_title: '...', home_products_subtitle: '...' }
        productos: productos ?? []
    };
};
