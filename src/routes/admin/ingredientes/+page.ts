
import { supabase } from '$lib/supabaseClient';

export async function load() {
    const { data: ingredientes, error } = await supabase
        .from('ingredientes')
        .select('*')
        .order('nombre');

    if (error) {
        console.error("Error cargando ingredientes:", error);
        return { ingredientes: [] };
    }

    return { ingredientes };
}
