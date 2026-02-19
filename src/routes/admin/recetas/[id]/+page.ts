
import { supabase } from '$lib/supabaseClient';
import type { Receta, RecipeComposition, Ingrediente } from '$lib/kitchen';

export async function load({ params }) {
    const { id } = params;

    try {
        // Estrategia V2: Cargar TODO el grafo para poder calcular costos recursivos correctamente.
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

        if (errR) throw new Error(`Error Recetas: ${errR.message}`);
        if (errC) throw new Error(`Error Composicion: ${errC.message}`);
        if (errI) throw new Error(`Error Ingredientes: ${errI.message}`);
        if (errP) throw new Error(`Error Productos: ${errP.message}`);

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

        // 2. Indexar Composición por Padre para acceso rápido
        const composicionPorPadre = new Map<string, RecipeComposition[]>();
        if (allComposicion) {
            allComposicion.forEach((comp: any) => {
                const list = composicionPorPadre.get(comp.parent_recipe_id) || [];
                list.push(comp);
                composicionPorPadre.set(comp.parent_recipe_id, list);
            });
        }

        // 3. Función Recursiva Segura (Tree Builder)
        // Construye el árbol SOLO para la receta solicitada, rompiendo ciclos.
        const buildTree = (currentId: string, visited: Set<string>): Receta | undefined => {
            const base = mapRecetas.get(currentId);
            if (!base) return undefined;

            // Detección de Ciclos: Si ya visitamos este ID en la rama actual, detenemos la recursión.
            // Retornamos la receta base sin composición para evitar loop infinito en JSON.stringify o cálculos.
            if (visited.has(currentId)) {
                console.warn(`Ciclo detectado en receta: ${base.nombre} (${currentId})`);
                return { ...base, composicion: [] };
            }

            const newVisited = new Set(visited);
            newVisited.add(currentId);

            // Clonamos para no mutar el mapa global y aislar esta instancia del árbol
            const node: Receta = { ...base, composicion: [] };

            const hijos = composicionPorPadre.get(currentId) || [];

            node.composicion = hijos.map(comp => {
                const item: RecipeComposition = {
                    ...comp,
                    ingrediente: comp.child_ingredient_id ? mapIngredientes.get(comp.child_ingredient_id) : undefined,
                    sub_receta: undefined
                };

                if (comp.child_recipe_id) {
                    item.sub_receta = buildTree(comp.child_recipe_id, newVisited);
                }

                return item;
            });

            return node;
        };

        // 4. Obtener la receta solicitada (Árbol Seguro)
        const recetaCompleta = buildTree(id, new Set());

        if (!recetaCompleta) {
            // console.error('Receta no encontrada tras buildTree para id:', id);
            throw new Error(`Receta no encontrada (ID: ${id})`);
        }

        return {
            receta: recetaCompleta,
            todosIngredientes: allIngredientes || [],
            todasRecetas: allRecetas ? allRecetas.filter(r => r.id !== id) : [], // Evitar auto-referencia directa
            productos: productos || []
        };

    } catch (error: any) {
        console.error('CRITICAL ERROR in recetas/[id]/+page.ts load:', error);

        // Retornar objeto dummy con el error para visualizarlo en UI
        return {
            receta: {
                id: 'ERROR_LOAD',
                nombre: `ERROR DE CARGA: ${error.message || error}`,
                composicion: [],
                ingredientes: []
            } as unknown as Receta,
            todosIngredientes: [],
            todasRecetas: [],
            productos: [],
            errorLoad: error.message || String(error)
        };
    }
}
