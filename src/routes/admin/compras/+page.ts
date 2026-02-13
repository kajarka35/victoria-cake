
import { supabase } from '$lib/supabaseClient';
import type { Receta, RecipeComposition, Ingrediente } from '$lib/kitchen';

export async function load() {
    // Para compras necesitamos "Explosionar" recetas, lo que requiere el grafo completo.
    // Usamos la misma estrategia de carga masiva que en el detalle de recetas.

    const [
        { data: allRecetas, error: errR },
        { data: allComposicion, error: errC },
        { data: allIngredientes, error: errI }
    ] = await Promise.all([
        supabase.from('recetas').select('*').order('nombre'),
        supabase.from('recipe_composition').select('*'),
        supabase.from('ingredientes').select('*')
    ]);

    if (errR) console.error(errR);
    if (errC) console.error(errC);
    if (errI) console.error(errI);

    // Armar el grafo en cliente
    const mapIngredientes = new Map<string, Ingrediente>();
    if (allIngredientes) {
        allIngredientes.forEach(i => mapIngredientes.set(i.id, i));
    }

    const mapRecetas = new Map<string, Receta>();
    if (allRecetas) {
        allRecetas.forEach(r => {
            mapRecetas.set(r.id, { ...r, composicion: [] });
        });
    }

    if (allComposicion) {
        allComposicion.forEach((comp: any) => {
            const padre = mapRecetas.get(comp.parent_recipe_id);
            if (padre && padre.composicion) {
                const item: RecipeComposition = {
                    ...comp,
                    ingrediente: comp.child_ingredient_id ? mapIngredientes.get(comp.child_ingredient_id) : undefined,
                    sub_receta: comp.child_recipe_id ? mapRecetas.get(comp.child_recipe_id) : undefined
                };
                padre.composicion.push(item);
            }
        });
    }

    // Convertir mapa a array para la UI
    const recetasCompletas = Array.from(mapRecetas.values());

    return {
        recetas: recetasCompletas,
        mapRecetas: mapRecetas, // Pasamos el mapa para facilitar búsquedas recursivas
        ingredientes: allIngredientes || []
    };
}
