
import { supabase } from '$lib/supabaseClient';
import type { Receta, RecipeComposition, Ingrediente } from '$lib/kitchen';

export async function load() {
    // Para compras necesitamos "Explosionar" recetas, lo que requiere el grafo completo.
    // Usamos la misma estrategia de carga masiva que en el detalle de recetas.

    const [
        { data: allRecetas, error: errR },
        { data: allComposicion, error: errC },
        { data: allIngredientes, error: errI },
        { data: allHistorial, error: errH },
        { data: provData, error: errP }
    ] = await Promise.all([
        supabase.from('recetas').select('*').order('nombre'),
        supabase.from('recipe_composition').select('*'),
        supabase.from('ingredientes').select('*'),
        supabase.from('produccion_historial').select('receta_id, receta_nombre').order('created_at', { ascending: false }).limit(50),
        // Cargar relación con proveedores principales para agrupar compras
        supabase.from('ingrediente_proveedores')
            .select('ingrediente_id, proveedor:proveedores(id, nombre)')
            .eq('es_principal', true)

    ]);

    if (errR) console.error("Error recetas:", errR);
    if (errC) console.error("Error composicion:", errC);
    if (errI) console.error("Error ingredientes:", errI);
    if (errH) console.error("Error historial:", errH);

    // Mapear proveedores principales
    const proveedorMap = new Map<string, any>();
    // @ts-ignore
    const proveedoresData = provData;
    if (proveedoresData) {
        proveedoresData.forEach((p: any) => {
            if (p.proveedor) {
                proveedorMap.set(p.ingrediente_id, p.proveedor);
            }
        });
    }

    // Armar el grafo en cliente
    const mapIngredientes = new Map<string, Ingrediente & { proveedor_principal?: any }>();
    if (allIngredientes) {
        allIngredientes.forEach(i => {
            // Inyectamos el proveedor real de la junction table
            const prov = proveedorMap.get(i.id);
            mapIngredientes.set(i.id, {
                ...i,
                proveedor_principal: prov,
                // Fallback visual para compatibilidad mientras se migra todo
                proveedor: prov ? prov.nombre : (i.proveedor || 'Sin Asignar')
            });
        });
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

    // Calcular top 3 recetas
    const conteo = new Map<string, number>();
    if (allHistorial) {
        allHistorial.forEach((h: any) => {
            conteo.set(h.receta_id, (conteo.get(h.receta_id) || 0) + 1);
        });
    }
    const topRecetasIds = [...conteo.entries()]
        .sort((a, b) => b[1] - a[1]) // Descendente
        .slice(0, 3)
        .map(([id]) => id);

    const topRecetas = topRecetasIds
        .map(id => mapRecetas.get(id))
        .filter(r => r !== undefined) as Receta[];

    // Convertir mapa a array para la UI
    const recetasCompletas = Array.from(mapRecetas.values());

    return {
        recetas: recetasCompletas,
        mapRecetas: mapRecetas, // Pasamos el mapa para facilitar búsquedas recursivas
        ingredientes: allIngredientes || [],
        topRecetas
    };
}
