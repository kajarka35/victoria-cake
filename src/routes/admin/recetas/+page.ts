
import { supabase } from '$lib/supabaseClient';
import { calcularCostoReceta, type Receta, type RecetaIngredienteDetalle } from '$lib/kitchen';

export async function load() {
    // Traer recetas con sus ingredientes y detalle de insumo
    const { data: recetas, error } = await supabase
        .from('recetas')
        .select(`
            *,
            ingredientes:receta_ingredientes (
                *,
                ingrediente:ingredientes (*)
            ),
            composicion:recipe_composition!parent_recipe_id (
                *,
                ingrediente:ingredientes!child_ingredient_id (*),
                sub_receta:recetas!child_recipe_id (
                    *,
                    composicion:recipe_composition!parent_recipe_id (
                        *,
                        ingrediente:ingredientes!child_ingredient_id (*)
                    )
                )
            )
        `)
        .order('nombre');

    const { data: ingredientes, error: errorIng } = await supabase
        .from('ingredientes')
        .select('*')
        .order('nombre');

    if (error) {
        console.error("Error cargando recetas:", error);
        return { recetas: [], todosIngredientes: [], todasRecetas: [] };
    }

    // Calcular costo pre-renderizado para mostrar en cards
    const recetasConCosto = recetas.map(r => ({
        ...r,
        costoTotal: calcularCostoReceta(r as unknown as Receta)
    }));

    return {
        recetas: recetasConCosto,
        todosIngredientes: ingredientes || [],
        todasRecetas: recetasConCosto
    };
}
