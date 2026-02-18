
import { supabase } from '$lib/supabaseClient';
import type { Receta, RecipeComposition, Ingrediente } from '$lib/kitchen';

export async function load({ params }) {
    const { id } = params;

    const [
        { data: allRecetas, error: errR },
        { data: allComposicion, error: errC },
        { data: allIngredientes, error: errI },
        { data: productos, error: errP }
    ] = await Promise.all([
        supabase.from('recetas').select('*'),
        supabase.from('recipe_composition').select('*'),
        supabase.from('ingredientes').select('*').order('nombre'),
        supabase.from('productos').select('id, nombre').order('nombre')
    ]);

    if (errR) throw errR;
    if (errC) throw errC;
    if (errI) throw errI;
    if (errP) throw errP;

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

    const recetaCompleta = mapRecetas.get(id);

    if (!recetaCompleta) {
        throw new Error('Receta no encontrada');
    }

    return {
        receta: recetaCompleta,
        todosIngredientes: allIngredientes || [],
        todasRecetas: allRecetas ? allRecetas.filter(r => r.id !== id) : [],
        productos: productos || []
    };
}
