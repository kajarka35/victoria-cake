import { supabase } from '$lib/supabaseClient';

export async function load() {
    const { data: historial, error } = await supabase
        .from('produccion_historial')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) throw error;

    return {
        historial: historial || []
    };
}
