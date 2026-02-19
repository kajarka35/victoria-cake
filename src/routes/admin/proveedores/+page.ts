import { supabase } from '$lib/supabaseClient';

export async function load() {
    const [
        { data: proveedores, error: errorProv },
        { data: ingredientes, error: errorIng },
        { data: historial, error: errorHist }
    ] = await Promise.all([
        supabase.from('proveedores').select('*').order('nombre'),
        supabase.from('ingredientes').select('id, nombre, precio, cantidad_por_precio, proveedor_id, categoria'),
        supabase.from('precio_historial')
            .select('proveedor_id, variacion_pct, created_at')
            .order('created_at', { ascending: false })
            .limit(200)
    ]);

    if (errorProv) console.error('Error cargando proveedores:', errorProv);
    if (errorIng) console.error('Error cargando ingredientes:', errorIng);
    if (errorHist) console.error('Error cargando historial:', errorHist);

    // Calcular scorecard por proveedor
    interface ScoreCard {
        numIngredientes: number;
        gastoEstimado: number;
        tendencia: number;
    }
    const scoreMap = new Map<string, ScoreCard>();

    if (proveedores) {
        for (const prov of proveedores) {
            const ings = (ingredientes || []).filter(i => i.proveedor_id === prov.id);
            const gastoEstimado = ings.reduce((sum, i) => sum + (i.precio || 0), 0);

            // Tendencia promedio de cambios recientes (últimos 5)
            const cambios = (historial || [])
                .filter(h => h.proveedor_id === prov.id)
                .slice(0, 5);
            const tendencia = cambios.length > 0
                ? cambios.reduce((sum, h) => sum + (h.variacion_pct || 0), 0) / cambios.length
                : 0;

            scoreMap.set(prov.id, {
                numIngredientes: ings.length,
                gastoEstimado,
                tendencia: Math.round(tendencia * 10) / 10
            });
        }
    }

    // Serializar el Map a un objeto para pasar al componente
    const scores: Record<string, ScoreCard> = {};
    scoreMap.forEach((val, key) => { scores[key] = val; });

    return {
        proveedores: proveedores || [],
        scores
    };
}
