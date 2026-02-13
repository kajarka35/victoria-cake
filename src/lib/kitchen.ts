
export type RecipeType = 'PRODUCTO_FINAL' | 'COMPONENTE_BASE' | 'PREPARACION_INTERMEDIA';

export interface Ingrediente {
    id: string;
    nombre: string;
    unidad: string;
    precio: number;
    cantidad_por_precio: number;
    proveedor?: string;
    categoria: string;
}

export interface Receta {
    id?: string;
    created_at?: string;
    nombre: string;
    descripcion?: string;
    foto_url?: string;
    rendimiento_base_g?: number; // Peso total de la receta
    rendimiento_base_u?: number; // Unidades (opcional, para referencia)
    tiempo_preparacion_min?: number;
    tiempo_coccion_min?: number;
    temperatura_coccion_c?: number;
    instrucciones?: string;
    categoria?: string;
    tipo?: 'FINAL' | 'COMPONENTE' | 'BASE';

    // --- Campos Técnicos ---
    porciones_base?: number; // Número de porciones que rinde la receta base
    molde?: string; // Tamaño y forma del molde (ej: "14cm redondo")
    temperatura?: string; // Ej: "180°C"
    tiempo_horneado?: string; // Ej: "45 min"
    producto_id?: string; // ID del producto final en catálogo (opcional)
    notas?: string; // Notas adicionales del chef

    // --- Campos Financieros Amarena ---
    porcentaje_cif?: number; // Costos Indirectos de Fabricación (Default: 20%)
    porcentaje_utilidad?: number; // Margen de Ganancia (Default: 30%)
    costo_empaque?: number; // Costo fijo de empaque
    // --- Relaciones ---
    ingredientes?: RecetaIngredienteDetalle[];
    composicion?: RecipeComposition[];

    // Virtual
    costoTotal?: number;
    precioVentaSugerido?: number;
}

export const REGLA_PORCION_AMARENA_G = 65; // Regla de Oro: 65g = 1 porción

// --- Funciones Financieras (Metodología Amarena) ---

export function calcularCostoCIF(costoPrimo: number, porcentaje: number = 20): number {
    return costoPrimo * (porcentaje / 100);
}

export function calcularUtilidad(costoReal: number, porcentaje: number = 30): number {
    // Interpretación Amarena: "Utilidad = Costos reales ÷ Porcentaje"
    // Si el usuario ingresa 30 (%), asumimos que busca una rentabilidad basada en divisor.
    // PRECAUCIÓN: Esta fórmula genera márgenes altos (ej: 100 / 0.3 = 333 utilidad).
    // Si porcentaje es 0, utilidad es 0 para evitar Infinity.
    if (!porcentaje || porcentaje === 0) return 0;
    return costoReal / (porcentaje / 100);
}

export function calcularPrecioVenta(costoReal: number, utilidad: number, empaque: number = 0): number {
    return costoReal + utilidad + empaque;
}

/**
 * Calcula el peso total de la receta sumando sus ingredientes (recursivo).
 * Esto es CRÍTICO para la "Masa Total Necesaria" de Amarena.
 */
export function calcularPesoReceta(receta: Receta): number {
    if (!receta.composicion || receta.composicion.length === 0) {
        // Fallback si no hay composición detallada pero hay un rendimiento manual
        return receta.rendimiento_base_g || 0;
    }

    return receta.composicion.reduce((total, item) => {
        let pesoItem = 0;

        // Si es gramos o mililitros, asumimos 1:1 para simplificar (común en pastelería salvo aceites)
        // Si es unidad, necesitamos saber cuánto pesa la unidad. Por ahora, si es unidad y no tenemos peso, alertar o usar 0.
        // MEJORA: En el futuro, usar campo 'peso_unidad' del ingrediente.
        if (item.unidad === 'unidad') {
            // Hotfix: Si es huevo (aprox 50g), si no, 0. Esto es una limitación actual.
            // Lo ideal es que la receta tenga el peso en gramos explícito o factor de conversión.
            // Por ahora, asumimos que el usuario ingresa GRAMOS en la receta para mayor precisión, como lo dicta Amarena.
            pesoItem = 0;
        } else {
            pesoItem = item.cantidad || 0;
        }

        // Si es sub-receta, el peso es la cantidad que se usa de esa sub-receta (ya está en gramos en la composición)
        // No necesitamos recursividad profunda para el peso *usado*, solo sumar la cantidad listada.
        return total + pesoItem;
    }, 0);
}

/**
 * Calcula el número de porciones estándar Amarena (65g)
 */
export function calcularPorcionesEstandar(pesoTotalG: number): number {
    return Math.floor(pesoTotalG / REGLA_PORCION_AMARENA_G);
}

/**
 * Calcula el costo por gramo de la receta (Métrica Amarena)
 */
export function calcularCostoPorGramo(costoReal: number, pesoTotalG: number): number {
    if (!pesoTotalG || pesoTotalG === 0) return 0;
    return costoReal / pesoTotalG;
}

/**
 * Tabla de Referencia de Moldes (Escuela Amarena)
 * Propósito: Saber cuántos gramos de batido necesita cada tamaño.
 */
export const MOLDES_AMARENA_REF = [
    { cm: 8, ponque_g: 200, semiliquido_g: 75 },
    { cm: 10, ponque_g: 600, semiliquido_g: 220 },
    { cm: 12, ponque_g: 850, semiliquido_g: 310 },
    { cm: 14, ponque_g: 950, semiliquido_g: 350 },
    { cm: 16, ponque_g: 1000, semiliquido_g: 370 },
    { cm: 18, ponque_g: 1300, semiliquido_g: 500 },
    { cm: 19, ponque_g: 1350, semiliquido_g: 580 },
    { cm: 22, ponque_g: 1850, semiliquido_g: 690 },
    { cm: 24, ponque_g: 2200, semiliquido_g: 810 },
    { cm: 26, ponque_g: 2700, semiliquido_g: 1000 },
    { cm: 30, ponque_g: 3500, semiliquido_g: 1300 },
    { cm: 33, ponque_g: 3850, semiliquido_g: 1420 },
];

/**
 * Calcula el factor de escalado basado en la masa requerida por el molde objetivo.
 * Si no encuentra el molde en la tabla, usa la relación de áreas (cuadrado del radio).
 */
export function calcularFactorMolde(
    moldeOrigenCm: number,
    moldeDestinoCm: number,
    tipo: 'PONQUE' | 'SEMILIQUIDO' = 'PONQUE'
): number {
    const refOrigen = MOLDES_AMARENA_REF.find(m => m.cm === moldeOrigenCm);
    const refDestino = MOLDES_AMARENA_REF.find(m => m.cm === moldeDestinoCm);

    // Estrategia 1: Uso de Tabla Amarena (Más precisa para sus recetas)
    if (refOrigen && refDestino) {
        const pesoOrigen = tipo === 'PONQUE' ? refOrigen.ponque_g : refOrigen.semiliquido_g;
        const pesoDestino = tipo === 'PONQUE' ? refDestino.ponque_g : refDestino.semiliquido_g;
        return pesoDestino / pesoOrigen;
    }

    // Estrategia 2: Relación de Áreas (Geometría básica)
    // Area = pi * r^2. Factor = AreaDestino / AreaOrigen = (rDestino^2) / (rOrigen^2)
    const rOrigen = moldeOrigenCm / 2;
    const rDestino = moldeDestinoCm / 2;
    return (rDestino * rDestino) / (rOrigen * rOrigen);
}

// --- Fin Funciones Financieras ---

export interface RecipeComposition {
    id: string;
    parent_recipe_id: string;

    // Polymorphic
    child_ingredient_id?: string;
    child_recipe_id?: string;

    cantidad: number;
    unidad: string;
    notas?: string;

    // Expanded Data
    ingrediente?: Ingrediente;
    sub_receta?: Receta;
}

// Legacy Interface (Deprecating slowly)
export interface RecetaIngrediente {
    id: string;
    receta_id: string;
    ingrediente_id: string;
    cantidad: number;
    notas?: string;
    orden: number;
}

export interface RecetaIngredienteDetalle extends RecetaIngrediente {
    ingrediente: Ingrediente;
}

/**
 * Calcula el costo de un ingrediente específico (Materia Prima)
 */
export function calcularCostoIngrediente(
    cantidadNecesaria: number,
    precioPresentacion: number,
    cantidadPresentacion: number
): number {
    if (cantidadPresentacion === 0) return 0;
    return (cantidadNecesaria * precioPresentacion) / cantidadPresentacion;
}

/**
 * Calcula el costo TOTAL de una receta navegando recursivamente su árbol de composición.
 * Soporta V1 (lista plana) y V2 (grafo).
 */
export function calcularCostoReceta(receta: Receta): number {
    // 1. Fallback a V1 si no hay composición V2 pero sí ingredientes legacy
    if ((!receta.composicion || receta.composicion.length === 0) && receta.ingredientes) {
        return receta.ingredientes.reduce((total, item) => {
            return total + calcularCostoIngrediente(
                item.cantidad,
                item.ingrediente.precio,
                item.ingrediente.cantidad_por_precio
            );
        }, 0);
    }

    // 2. Cálculo V2 Recursivo
    if (!receta.composicion) return 0;

    return receta.composicion.reduce((total, item) => {
        let costoItem = 0;

        if (item.ingrediente) {
            // Es Materia Prima
            costoItem = calcularCostoIngrediente(
                item.cantidad,
                item.ingrediente.precio,
                item.ingrediente.cantidad_por_precio
            );
        } else if (item.sub_receta) {
            // Es Sub-Receta (Recursión)
            const costoTotalSub = calcularCostoReceta(item.sub_receta);
            const rendimientoSub = item.sub_receta.rendimiento_base_g || 1000; // Default 1kg if missing

            // Costo por gramo de la sub-receta
            const costoPorGramo = costoTotalSub / rendimientoSub;

            // Costo de la cantidad usada
            costoItem = item.cantidad * costoPorGramo;
        }

        return total + costoItem;
    }, 0);
}

/**
 * Escala una cantidad base a nuevas porciones
 */
export function escalarCantidad(
    cantidadBase: number,
    porcionesBase: number,
    porcionesDeseadas: number
): number {
    if (porcionesBase === 0) return 0;
    const factor = porcionesDeseadas / porcionesBase;
    return Math.round(cantidadBase * factor * 100) / 100;
}

/**
 * Formatea moneda colombiana
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

/**
 * MRP: Explosión de Materiales (Bill of Materials Flattening)
 * Navega recursivamente una receta para listar todas las materias primas necesarias.
 * 
 * @param receta La receta a explosionar
 * @param cantidadRequerida Cantidad de la receta padre (unidades o gramos)
 * @param mapRecetas Mapa global de recetas para buscar sub-recetas
 * @returns Map<IngredienteID, CantidadTotal>
 */
export function calcularExplosionMateriales(
    receta: Receta,
    cantidadRequerida: number = 1, // Por defecto 1 unidad de la receta
    mapRecetas: Map<string, Receta>
): Map<string, number> {
    const materiales = new Map<string, number>();

    if (!receta.composicion) return materiales;

    // Si es producto final, cantidadRequerida suele ser unidades (ej: 2 tortas)
    // Pero internamente todo se mueve por la composición.

    // CASO BASE: Si la receta no tiene composición (es un error o es base), no devuelve nada.

    receta.composicion.forEach(item => {
        // ¿Cuánto necesitamos de este item?
        // La composición dice: "Para 1 unidad de (Padre) necesito X de (Hijo)" vs "Para 950g de (Padre)..."
        // AQUÍ ESTÁ EL TRUCO:
        // Las recetas V2 definen 'rendimiento_base_g'.
        // Si 'cantidad' en composicion está en gramos/unidades y es estática para el 'rendimiento_base_g' del padre.

        // Asumamos Modelo Simple Amarena:
        // La Receta Base está definida para 'porciones_base' (ej: 8 pax) o un 'rendimiento_base_g'.
        // Vamos a usar el factor de escalado sobre 'porciones_base' que es lo que UI maneja, 
        // O simplificar asumiendo que 'cantidad' es lo que se necesita para construir LA receta tal cual está definida.

        let cantidadItemNecesaria = item.cantidad * cantidadRequerida;

        if (item.child_ingredient_id) {
            // Es Materia Prima: Acumular
            const current = materiales.get(item.child_ingredient_id) || 0;
            materiales.set(item.child_ingredient_id, current + cantidadItemNecesaria);
        }
        else if (item.child_recipe_id) {
            // Es Sub-Receta: Recursión
            const subReceta = mapRecetas.get(item.child_recipe_id);
            if (subReceta) {
                // ¿Cuánto de la sub-receta (en términos de SU unidad base) representa 'cantidadItemNecesaria'?
                // Si la sub-receta rinde 1000g, y necesitamos 200g.
                // Entonces necesitamos 0.2 "unidades de receta base".

                const rendimientoSub = subReceta.rendimiento_base_g || 1; // Evitar div/0
                const factorSub = cantidadItemNecesaria / rendimientoSub;

                const subMateriales = calcularExplosionMateriales(subReceta, factorSub, mapRecetas);

                // Fusionar mapas
                subMateriales.forEach((qty, ingId) => {
                    const current = materiales.get(ingId) || 0;
                    materiales.set(ingId, current + qty);
                });
            }
        }
    });

    return materiales;
}
