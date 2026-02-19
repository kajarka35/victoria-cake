
import { supabase } from '$lib/supabaseClient';

export async function load() {
    // 1. Fetch Ingredientes
    const { data: ingredientes, error: errorIng } = await supabase
        .from('ingredientes')
        .select('*')
        .order('nombre');

    if (errorIng) {
        console.error("Error cargando ingredientes:", errorIng);
        return { ingredientes: [], categorias: [], proveedores: [], historialPrecios: [], tendencias: {} };
    }

    // 2. Fetch en paralelo
    const [
        { data: composicion, error: errorRec },
        { data: categorias, error: errorCat },
        { data: proveedores, error: errorProv },
        { data: historialPrecios, error: errorHist },
        { data: junctionData, error: errorJunction },
        { data: recetas, error: errorRecetas } // Nueva query
    ] = await Promise.all([
        supabase.from('recipe_composition').select('parent_recipe_id, child_ingredient_id'), // Traer padre también
        supabase.from('categorias_ingredientes').select('*').order('nombre'),
        supabase.from('proveedores').select('id, nombre, activo').eq('activo', true).order('nombre'),
        supabase.from('precio_historial')
            .select('ingrediente_id, precio_anterior, precio_nuevo, variacion_pct, created_at')
            .order('created_at', { ascending: false })
            .limit(500),
        supabase.from('ingrediente_proveedores')
            .select('*, proveedor:proveedores(id, nombre, activo)')
            .order('es_principal', { ascending: false }),
        supabase.from('recetas').select('id, nombre').order('nombre') // Cargar catálogo recetas
    ]);

    if (errorRec) console.error("Error cargando composición:", errorRec);
    if (errorRecetas) console.error("Error cargando recetas:", errorRecetas);

    // 3. Calcular Uso y Mapeo Ingrediente -> Recetas
    const usoMap = new Map<string, number>();
    const ingredienteRecetasMap = new Map<string, string[]>(); // ID Ingrediente -> [ID Receta 1, ID Receta 2...]

    if (composicion) {
        composicion.forEach(item => {
            if (item.child_ingredient_id) {
                // Contar uso
                usoMap.set(item.child_ingredient_id, (usoMap.get(item.child_ingredient_id) || 0) + 1);

                // Mapear receta
                if (item.parent_recipe_id) {
                    const current = ingredienteRecetasMap.get(item.child_ingredient_id) || [];
                    if (!current.includes(item.parent_recipe_id)) {
                        current.push(item.parent_recipe_id);
                        ingredienteRecetasMap.set(item.child_ingredient_id, current);
                    }
                }
            }
        });
    }

    // ... (Logica de ultimo cambio y proveedores igual)

    // 4. Calcular último cambio de precio por ingrediente (para badge tendencia)
    interface UltimoCambio {
        variacion_pct: number;
        precio_anterior: number;
        precio_nuevo: number;
        created_at: string;
    }
    const ultimoCambioMap = new Map<string, UltimoCambio>();
    if (historialPrecios) {
        for (const h of historialPrecios) {
            if (!ultimoCambioMap.has(h.ingrediente_id)) {
                ultimoCambioMap.set(h.ingrediente_id, {
                    variacion_pct: h.variacion_pct || 0,
                    precio_anterior: h.precio_anterior,
                    precio_nuevo: h.precio_nuevo,
                    created_at: h.created_at
                });
            }
        }
    }

    // 5. Agrupar junction data por ingrediente_id
    const proveedoresPorIngrediente = new Map<string, typeof junctionData>();
    if (junctionData) {
        for (const jp of junctionData) {
            // @ts-ignore
            const arr = proveedoresPorIngrediente.get(jp.ingrediente_id) || [];
            // @ts-ignore
            arr.push(jp);
            // @ts-ignore
            proveedoresPorIngrediente.set(jp.ingrediente_id, arr);
        }
    }

    // 6. Merge Count + último cambio + proveedores_precios + recetas_ids
    const ingredientesConUso = ingredientes.map(i => ({
        ...i,
        uso_count: usoMap.get(i.id) || 0,
        ultimo_cambio: ultimoCambioMap.get(i.id) || null,
        proveedores_precios: proveedoresPorIngrediente.get(i.id) || [],
        recetas_ids: ingredienteRecetasMap.get(i.id) || [] // Nuevo campo
    }));

    // Serializar ultimoCambioMap para el modal de historial
    const tendencias: Record<string, UltimoCambio> = {};
    ultimoCambioMap.forEach((val, key) => { tendencias[key] = val; });

    return {
        ingredientes: ingredientesConUso,
        categorias: categorias || [],
        proveedores: proveedores || [],
        recetas: recetas || [], // Retornar recetas
        historialPrecios: historialPrecios || [],
        tendencias
    };
}

