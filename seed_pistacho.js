
import { createClient } from "@supabase/supabase-js";

// Credenciales (Tomadas del archivo original - Asegurarse que sean válidas)
const SUPABASE_URL = "https://igjfvofxervwifumejxh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnamZ2b2Z4ZXJ2d2lmdW1lanhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NjA4NTcsImV4cCI6MjA4NTAzNjg1N30.ZnwrqulLYO5p9V-n-zlGfLA6-zZ6yAcxDstPrTjlAbU";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const INGREDIENTES = [
    { nombre: "Harina Trigo Pastelera", unidad: "g", precio: 4500, cantidad_por_precio: 1000, categoria: "harinas" },
    { nombre: "Azúcar Granulada", unidad: "g", precio: 5200, cantidad_por_precio: 1000, categoria: "endulzantes" },
    { nombre: "Mantequilla Alpina", unidad: "g", precio: 28000, cantidad_por_precio: 1000, categoria: "grasas" },
    { nombre: "Margarina Repostera", unidad: "g", precio: 12000, cantidad_por_precio: 1000, categoria: "grasas" },
    { nombre: "Huevos AA", unidad: "unidad", precio: 18000, cantidad_por_precio: 30, categoria: "general" },
    { nombre: "Pasta de Pistacho Pregel", unidad: "g", precio: 180000, cantidad_por_precio: 1000, categoria: "esencias" },
    { nombre: "Licor Amaretto", unidad: "ml", precio: 85000, cantidad_por_precio: 750, categoria: "esencias" },
    { nombre: "Polvo de Hornear", unidad: "g", precio: 3000, cantidad_por_precio: 200, categoria: "general" },
    { nombre: "Agua", unidad: "ml", precio: 0, cantidad_por_precio: 1000, categoria: "general" },
    { nombre: "Chocolate Cobertura Blanco", unidad: "g", precio: 45000, cantidad_por_precio: 1000, categoria: "chocolates" },
    { nombre: "Crema de Leche", unidad: "g", precio: 18000, cantidad_por_precio: 1000, categoria: "lacteos" }
];

// Estructura V2: Recetas con composición mixta
const RECETAS = [
    {
        key: "almibar",
        data: {
            nombre: "Almíbar de Pistacho (Base)",
            categoria: "rellenos",
            tipo: "PREPARACION_INTERMEDIA",
            porciones_base: 1, // Es un lote
            rendimiento_base_g: 207, // 150+50+7
            instrucciones: "Hervir agua y azúcar. Al tibiar agregar licor."
        },
        composicion: [
            { tipo: "ingrediente", nombre: "Agua", cantidad: 150 },
            { tipo: "ingrediente", nombre: "Azúcar Granulada", cantidad: 50 },
            { tipo: "ingrediente", nombre: "Licor Amaretto", cantidad: 7 }
        ]
    },
    {
        key: "cobertura",
        data: {
            nombre: "Cobertura Crema de Pistacho",
            categoria: "coberturas",
            tipo: "PREPARACION_INTERMEDIA",
            porciones_base: 1,
            rendimiento_base_g: 275, // 200+70+5
            instrucciones: "Fundir chocolate y crema. Mezclar con pasta. Reposar."
        },
        composicion: [
            { tipo: "ingrediente", nombre: "Chocolate Cobertura Blanco", cantidad: 200 },
            { tipo: "ingrediente", nombre: "Crema de Leche", cantidad: 70 },
            { tipo: "ingrediente", nombre: "Pasta de Pistacho Pregel", cantidad: 5 }
        ]
    },
    {
        key: "torta",
        data: {
            nombre: "Torta de Pistacho (Completa 14cm)",
            categoria: "tortas",
            tipo: "PRODUCTO_FINAL",
            porciones_base: 8,
            rendimiento_base_g: 650, // Aprox masa + almibar
            molde: "14cm",
            temperatura: 170,
            tiempo_horneado: "45 min",
            instrucciones: "Cremar grasas/azúcar. Huevos. Secos. Hornear. Humedecer con Almíbar."
        },
        composicion: [
            // Ingredientes de la Masa
            { tipo: "ingrediente", nombre: "Harina Trigo Pastelera", cantidad: 110 },
            { tipo: "ingrediente", nombre: "Azúcar Granulada", cantidad: 100 },
            { tipo: "ingrediente", nombre: "Mantequilla Alpina", cantidad: 50 },
            { tipo: "ingrediente", nombre: "Margarina Repostera", cantidad: 50 },
            { tipo: "ingrediente", nombre: "Huevos AA", cantidad: 2, unidad: "unidad" }, // Ojo conversion
            { tipo: "ingrediente", nombre: "Pasta de Pistacho Pregel", cantidad: 6 },
            { tipo: "ingrediente", nombre: "Licor Amaretto", cantidad: 7 },
            { tipo: "ingrediente", nombre: "Polvo de Hornear", cantidad: 1 },

            // Sub-Receta: Almíbar (Recursividad V2)
            { tipo: "receta", key: "almibar", cantidad: 1, unidad: "lote" } // Usamos todo el lote de almíbar
        ]
    }
];

async function seed() {
    console.log("🌱 Iniciando siembra V2 (Grafo MRP)...");

    // 1. Ingredientes
    const mapIngredientes = {};
    for (const ing of INGREDIENTES) {
        const { data, error } = await supabase
            .from("ingredientes")
            .select("id")
            .eq("nombre", ing.nombre)
            .maybeSingle();

        let id = data?.id;

        if (!id) {
            const { data: nuevo, error: errNew } = await supabase.from("ingredientes").insert([ing]).select().single();
            if (errNew) console.error(`Error creando ${ing.nombre}`, errNew);
            else {
                id = nuevo.id;
                console.log(`✅ Ingrediente: ${ing.nombre}`);
            }
        }
        if (id) mapIngredientes[ing.nombre] = id;
    }

    // 2. Recetas (Crear Cabeceras primero para tener IDs)
    const mapRecetas = {};

    // Orden importante: Dependencias primero (Almíbar, Cobertura) -> Luego Dependientes (Torta)
    // Aunque en V2 el ID existe, para insertar composición necesitamos el ID del hijo.

    for (const r of RECETAS) { // Asumimos orden correcto en array
        const { data, error } = await supabase
            .from("recetas")
            .insert([r.data]) // Insertamos siempre nueva para evitar conflictos de ID en demo
            .select()
            .single();

        if (error) {
            console.error(`Error receta ${r.key}:`, error.message);
            continue;
        }

        console.log(`✅ Receta Cabecera: ${r.data.nombre}`);
        mapRecetas[r.key] = data.id;
    }

    // 3. Composición (Vértices del Grafo)
    for (const r of RECETAS) {
        const padreId = mapRecetas[r.key];
        if (!padreId) continue;

        const items = [];
        for (const comp of r.composicion) {
            if (comp.tipo === "ingrediente") {
                const ingId = mapIngredientes[comp.nombre];
                if (ingId) {
                    items.push({
                        parent_recipe_id: padreId,
                        child_ingredient_id: ingId,
                        cantidad: comp.cantidad,
                        unidad: comp.unidad || "g"
                    });
                }
            } else if (comp.tipo === "receta") {
                const subId = mapRecetas[comp.key];
                if (subId) {
                    items.push({
                        parent_recipe_id: padreId,
                        child_recipe_id: subId,
                        cantidad: comp.cantidad, // ej: 1 (unidad de sub-receta)
                        unidad: comp.unidad || "unidad"
                    });
                }
            }
        }

        if (items.length > 0) {
            const { error } = await supabase.from("recipe_composition").insert(items);
            if (error) console.error(`Error composición ${r.key}:`, error.message);
            else console.log(`🔗 Vinculados ${items.length} items a ${r.data.nombre}`);
        }
    }

    console.log("✨ ¡Siembra V2 Completa!");
}

seed();
