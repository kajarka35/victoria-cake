
import { supabase } from '$lib/supabaseClient';

export async function load() {
    // 1. Fetch Ingredientes
    const { data: ingredientes, error: errorIng } = await supabase
        .from('ingredientes')
        .select('*')
        .order('nombre');

    if (errorIng) {
        console.error("Error cargando ingredientes:", errorIng);
        return { ingredientes: [] };
    }

    // 2. Fetch Recetas (solo composición para calcular uso)
    // CORRECCIÓN: Usamos la tabla relacional 'recipe_composition' directamente
    const [
        { data: composicion, error: errorRec },
        { data: categorias, error: errorCat }
    ] = await Promise.all([
        supabase.from('recipe_composition').select('child_ingredient_id'),
        supabase.from('categorias_ingredientes').select('*').order('nombre')
    ]);

    if (errorRec) {
        console.error("Error cargando composición:", errorRec);
    }
    if (errorCat) {
        console.error("Error cargando categorías:", errorCat);
    }

    // Retornamos ingredientes sin conteo si falla recetas (aunque ahora manejamos errores mejor)
    // Pero si falla, seguimos.

    // 3. Calcular Uso (Count Usage)
    const usoMap = new Map<string, number>();

    if (composicion) {
        composicion.forEach(item => {
            // Contamos cada vez que un ingrediente aparece en una línea de composición
            if (item.child_ingredient_id) {
                usoMap.set(item.child_ingredient_id, (usoMap.get(item.child_ingredient_id) || 0) + 1);
            }
        });
    }

    // 4. Merge Count
    const ingredientesConUso = ingredientes.map(i => ({
        ...i,
        uso_count: usoMap.get(i.id) || 0
    }));

    return {
        ingredientes: ingredientesConUso,
        categorias: categorias || []
    };
}
