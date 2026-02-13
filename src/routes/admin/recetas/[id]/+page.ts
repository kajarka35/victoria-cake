
import { supabase } from '$lib/supabaseClient';
import type { Receta, RecipeComposition, Ingrediente } from '$lib/kitchen';

export async function load({ params }) {
    const { id } = params;

    // Estrategia V2: Cargar TODO el grafo para poder calcular costos recursivos correctamente.
    // Dado que son < 1000 registros, es más eficiente traer todo y armar el árbol en cliente
    // que hacer N llamadas a base de datos.

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

    // 1. Indexar datos para búsqueda rápida
    const mapIngredientes = new Map<string, Ingrediente>();
    if (allIngredientes) {
        allIngredientes.forEach(i => mapIngredientes.set(i.id, i));
    }

    // Inicializar recetas con composición vacía
    const mapRecetas = new Map<string, Receta>();
    if (allRecetas) {
        allRecetas.forEach(r => {
            mapRecetas.set(r.id, { ...r, composicion: [] });
        });
    }

    // 2. Armar el árbol (Asignar hijos a padres)
    if (allComposicion) {
        allComposicion.forEach((comp: any) => {
            const padre = mapRecetas.get(comp.parent_recipe_id);
            if (padre && padre.composicion) {
                // Enriquecer el objeto de composición
                const item: RecipeComposition = {
                    ...comp,
                    ingrediente: comp.child_ingredient_id ? mapIngredientes.get(comp.child_ingredient_id) : undefined,
                    // ASIGNACIÓN POR REFERENCIA: Esto es la clave de la recursividad.
                    // Al asignar el objeto del mapa, si ese objeto se llena después con sus propios hijos,
                    // aquí ya tendremos acceso a ellos.
                    sub_receta: comp.child_recipe_id ? mapRecetas.get(comp.child_recipe_id) : undefined
                };
                padre.composicion.push(item);
            }
        });
    }

    // 3. Obtener la receta solicitada (ya enriquecida con su árbol completo)
    const recetaCompleta = mapRecetas.get(id);

    if (!recetaCompleta) {
        throw new Error('Receta no encontrada');
    }

    return {
        receta: recetaCompleta,
        // Pasamos listas para selectores
        todosIngredientes: allIngredientes || [],
        todasRecetas: allRecetas ? allRecetas.filter(r => r.id !== id) : [], // Evitar auto-referencia directa
        productos: productos || []
    };
}
