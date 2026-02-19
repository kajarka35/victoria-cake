
export type RecipeType = 'PRODUCTO_FINAL' | 'COMPONENTE_BASE' | 'PREPARACION_INTERMEDIA';

export interface Ingrediente {
    id: string;
    nombre: string;
    unidad: string;
    precio: number;
    cantidad_por_precio: number;
    proveedor?: string;
    proveedor_id?: string;      // FK → proveedores.id (Pro V3)
    categoria: string;

    // --- Smart Metrics (Feb 2026) ---
    peso_referencia_g?: number;     // Peso de 1 unidad (ej: 50g x huevo)
    volumen_referencia_ml?: number; // Volumen de 1 unidad o densidad
    factor_merma?: number;         // 0.0 a 1.0 (aprovechamiento)
}

export interface CategoriaIngrediente {
    id: string;
    nombre: string;
    color: string;
    icono: string;
}

/** Junction N:N — Un ingrediente puede tener múltiples proveedores */
export interface IngredienteProveedor {
    id: string;
    ingrediente_id: string;
    proveedor_id: string;
    precio: number;
    cantidad_por_precio: number;
    unidad: string;
    es_principal: boolean;
    notas?: string;
    activo: boolean;
    created_at?: string;
    updated_at?: string;
    // Expanded via join
    proveedor?: { id: string; nombre: string; activo: boolean };
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
    instrucciones_tipo?: 'pasos' | 'markdown';
    categoria?: string;
    tipo?: 'FINAL' | 'COMPONENTE' | 'BASE';

    // --- Campos Técnicos ---
    porciones_base?: number; // Número de porciones que rinde la receta base
    molde?: string; // Tamaño y forma del molde (ej: "14cm redondo")
    temperatura?: string; // Ej: "180°C"
    tiempo_horneado?: string; // Ej: "45 min"
    producto_id?: string; // ID del producto final en catálogo (opcional)
    notas?: string; // Notas adicionales del chef

    // --- Campos de Flujos Dinámicos (Feb 2026) ---
    peso_lote_g?: number;       // Flujo Mezcla/Lote (Ganaches, Salsas)
    unidades_producidas?: number; // Flujo Unitario (Cupcakes, Galletas)
    tamano_venta?: string;      // Flujo Producto Final (Tamaño comercial)

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
    // AJUSTE (Feb 2026): Cambio a Fórmula de Margen Bruto (Gross Margin)
    // El usuario define qué % del precio final quiere que sea ganancia.
    // Fórmula: Precio = Costo / (1 - %)
    // Utilidad = Precio - Costo
    // Derivada: Utilidad = Costo * ( % / (100 - %) )

    if (!porcentaje || porcentaje === 0) return 0;
    if (porcentaje >= 100) return costoReal * 9; // Evitar división por cero (900% markup fallback)

    return costoReal * (porcentaje / (100 - porcentaje));
}

export function calcularPrecioVenta(costoReal: number, utilidad: number, empaque: number = 0): number {
    return costoReal + utilidad + empaque;
}

/**
 * Motor de Conversión Inteligente (Smart Metrics)
 * Convierte cualquier cantidad y unidad a Gramos netos aprovechables.
 */
export function convertirAGramos(cantidad: number, unidad: string, ingrediente?: Ingrediente): number {
    if (!ingrediente) return cantidad; // Fallback 1:1

    const pesoRef = ingrediente.peso_referencia_g || 0;
    const factorMerma = ingrediente.factor_merma || 1;

    let gramosBrutos = 0;

    switch (unidad.toLowerCase()) {
        case 'g':
        case 'gr':
        case 'gramos':
            gramosBrutos = cantidad;
            break;
        case 'kg':
        case 'kilogramos':
            gramosBrutos = cantidad * 1000;
            break;
        case 'ml':
        case 'mililitros':
        case 'cc':
            // Asumimos 1:1 por defecto para líquidos
            gramosBrutos = cantidad;
            break;
        case 'unidad':
        case 'und':
        case 'u':
            if (pesoRef > 0) {
                gramosBrutos = cantidad * pesoRef;
            } else {
                if (ingrediente.nombre.toLowerCase().includes('huevo')) {
                    gramosBrutos = cantidad * 50;
                } else {
                    gramosBrutos = 0;
                }
            }
            break;
        case 'lb':
        case 'libra':
            gramosBrutos = cantidad * 500;
            break;
        default:
            gramosBrutos = cantidad;
    }

    return gramosBrutos * factorMerma;
}

/**
 * Calcula el peso total de la receta sumando sus ingredientes (recursivo).
 * Esto es CRÍTICO para la "Masa Total Necesaria" de Amarena.
 */
export function calcularPesoReceta(receta: Receta): number {
    if (!receta.composicion || receta.composicion.length === 0) {
        return receta.rendimiento_base_g || 0;
    }

    return receta.composicion.reduce((total, item) => {
        const pesoItem = convertirAGramos(item.cantidad, item.unidad, item.ingrediente);
        return total + pesoItem;
    }, 0);
}

/**
 * Calcula SOLO el peso de la "Masa" (Batido/Ponqué) excluyendo Rellenos y Coberturas.
 * Se usa para la regla de Porciones Amarena (65g de Masa).
 */
export function calcularPesoMasaAmarena(receta: Receta): number {
    if (!receta.composicion || receta.composicion.length === 0) {
        return receta.rendimiento_base_g || 0;
    }

    return receta.composicion.reduce((total, item) => {
        let pesoItem = 0;

        // 1. Ingredientes (Materia Prima): SIEMPRE SUMAN
        if (item.ingrediente || item.child_ingredient_id) {
            pesoItem = convertirAGramos(item.cantidad, item.unidad, item.ingrediente);
        }
        // 2. Sub-Recetas: FILTRAR
        else if (item.sub_receta || item.child_recipe_id) {
            const cat = (item.sub_receta?.categoria || "").toLowerCase();
            if (['rellenos', 'coberturas', 'decoracion', 'salsas', 'ganache'].some(c => cat.includes(c))) {
                return total;
            }
            pesoItem = item.cantidad || 0;
        }

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
 * Calcula el Costo Unitario (para Flujo Unitario - Cupcakes/Galletas)
 */
export function calcularCostoUnitario(costoReal: number, unidades: number): number {
    if (!unidades || unidades === 0) return 0;
    return costoReal / unidades;
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
    unidadNecesaria: string,
    ingrediente: Ingrediente
): number {
    const { precio, cantidad_por_precio, unidad: unidadCompra, factor_merma = 1 } = ingrediente;

    if (cantidad_por_precio === 0) return 0;

    const gramosNecesarios = convertirAGramos(cantidadNecesaria, unidadNecesaria, ingrediente);
    const gramosEnCompra = convertirAGramos(cantidad_por_precio, unidadCompra, ingrediente);

    if (gramosEnCompra === 0) return 0;

    const costoPorGramoBruto = precio / gramosEnCompra;
    const gramosA_Pagar = gramosNecesarios / (factor_merma || 1);

    return gramosA_Pagar * costoPorGramoBruto;
}

/**
 * Calcula el costo TOTAL de una receta navegando recursivamente su árbol de composición.
 * Soporta V1 (lista plana) y V2 (grafo).
 */
export function calcularCostoReceta(receta: Receta, visited: Set<string> = new Set()): number {
    if (!receta) return 0;

    // Cycle Detection
    if (receta.id && visited.has(receta.id)) {
        console.warn('Ciclo detectado en cálculo de costos:', receta.nombre);
        return 0; // Romper ciclo
    }
    const newVisited = new Set(visited);
    if (receta.id) newVisited.add(receta.id);

    if ((!receta.composicion || receta.composicion.length === 0) && receta.ingredientes) {
        return receta.ingredientes.reduce((total, item) => {
            return total + calcularCostoIngrediente(
                item.cantidad,
                'g', // Legacy assumption
                item.ingrediente
            );
        }, 0);
    }

    if (!receta.composicion) return 0;

    return receta.composicion.reduce((total, item) => {
        let costoItem = 0;

        if (item.ingrediente) {
            costoItem = calcularCostoIngrediente(
                item.cantidad,
                item.unidad,
                item.ingrediente
            );
        } else if (item.sub_receta) {
            const costoTotalSub = calcularCostoReceta(item.sub_receta, newVisited);

            // FIX: Usar peso simulado real en lugar de confiar en el dato estático de la DB
            // Esto corrige errores donde rendimiento_base_g quedó desactualizado tras editar ingredientes
            const pesoRealSub = calcularPesoReceta(item.sub_receta);
            const rendimientoSub = pesoRealSub > 0 ? pesoRealSub : (item.sub_receta.rendimiento_base_g || 1);

            const costoPorGramo = costoTotalSub / rendimientoSub;
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

import { marked } from 'marked';

/**
 * Parsea el string Markdown de instrucciones guardado por el Wizard 
 * y lo convierte en un array de objetos para renderizado premium.
 * Ahora es inteligente: divide por secciones (headers) o bloques de texto.
 */
export function parseInstruccionesMD(md: string): { text: string; isTip: boolean }[] {
    if (!md) return [];

    // Dividimos por secciones basadas en encabezados (#) o dobles saltos de línea
    // El lookahead (?=\n#) permite separar por encabezados sin borrarlos
    const regexSeparador = /\n\n+|(?=\n#{1,3}\s)/;

    return md
        .split(regexSeparador)
        .map((part) => part.trim())
        .filter((part) => part.length > 0)
        .map((part) => {
            // Limpiar numeración redundante al inicio si existe (ej: "1. 1. Paso")
            // Esto evita que el renderizado de la card choque con el Markdown
            let cleanLine = part.replace(/^\d+\.\s*/, '');

            const isTip = cleanLine.includes('> **Tip:**');
            if (isTip) {
                cleanLine = cleanLine.replace('> **Tip:**', '').trim();
            }

            return { text: cleanLine, isTip };
        });
}

/**
 * Renderiza Markdown de forma segura y consistente usando 'marked'.
 */
export function renderMarkdown(content: string): string {
    if (!content) return '';
    // Configuramos marked para que sea simple y limpio (Gfm enabled by default)
    return marked.parse(content, { gfm: true, breaks: true }) as string;
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
