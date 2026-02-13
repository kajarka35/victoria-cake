
-- SEMILLA DE DATOS: TORTA DE PISTACHO (MODELO MRP V2)
-- Ejecutar en SQL Editor de Supabase

DO $$
DECLARE
    -- IDs de Ingredientes
    id_harina UUID;
    id_azucar UUID;
    id_mantequilla UUID;
    id_margarina UUID;
    id_huevos UUID;
    id_pistacho UUID;
    id_amaretto UUID;
    id_polvo UUID;
    id_agua UUID;
    id_choco UUID;
    id_crema UUID;

    -- IDs de Recetas
    id_receta_torta UUID;
    id_receta_almibar UUID;
    id_receta_cobertura UUID;
BEGIN
    -- 0. LIMPIEZA PREVIA (Idempotencia)
    -- Eliminar recetas previas con estos nombres exactos para evitar duplicados
    -- (La DB debería tener ON DELETE CASCADE en recipe_composition, si no, se limpiarían manualmente)
    DELETE FROM recipe_composition 
    WHERE parent_recipe_id IN (SELECT id FROM recetas WHERE nombre IN ('Almíbar de Pistacho (Base)', 'Cobertura Crema de Pistacho', 'Torta de Pistacho (Completa 14cm)'));
    
    DELETE FROM recetas 
    WHERE nombre IN ('Almíbar de Pistacho (Base)', 'Cobertura Crema de Pistacho', 'Torta de Pistacho (Completa 14cm)');

    -- 1. Insertar Ingredientes y capturar IDs (Upsert simuado)
    INSERT INTO ingredientes (nombre, unidad, precio, cantidad_por_precio, categoria) VALUES
        ('Harina Trigo Pastelera', 'g', 4500, 1000, 'harinas'),
        ('Azúcar Granulada', 'g', 5200, 1000, 'endulzantes'),
        ('Mantequilla Alpina', 'g', 28000, 1000, 'grasas'),
        ('Margarina Repostera', 'g', 12000, 1000, 'grasas'),
        ('Huevos AA', 'unidad', 18000, 30, 'general'),
        ('Pasta de Pistacho Pregel', 'g', 180000, 1000, 'esencias'),
        ('Licor Amaretto', 'ml', 85000, 750, 'esencias'),
        ('Polvo de Hornear', 'g', 3000, 200, 'general'),
        ('Agua', 'ml', 0, 1000, 'general'),
        ('Chocolate Cobertura Blanco', 'g', 45000, 1000, 'chocolates'),
        ('Crema de Leche', 'g', 18000, 1000, 'lacteos')
    ON CONFLICT (nombre) DO UPDATE SET precio = EXCLUDED.precio;

    SELECT id INTO id_harina FROM ingredientes WHERE nombre = 'Harina Trigo Pastelera';
    SELECT id INTO id_azucar FROM ingredientes WHERE nombre = 'Azúcar Granulada';
    SELECT id INTO id_mantequilla FROM ingredientes WHERE nombre = 'Mantequilla Alpina';
    SELECT id INTO id_margarina FROM ingredientes WHERE nombre = 'Margarina Repostera';
    SELECT id INTO id_huevos FROM ingredientes WHERE nombre = 'Huevos AA';
    SELECT id INTO id_pistacho FROM ingredientes WHERE nombre = 'Pasta de Pistacho Pregel';
    SELECT id INTO id_amaretto FROM ingredientes WHERE nombre = 'Licor Amaretto';
    SELECT id INTO id_polvo FROM ingredientes WHERE nombre = 'Polvo de Hornear';
    SELECT id INTO id_agua FROM ingredientes WHERE nombre = 'Agua';
    SELECT id INTO id_choco FROM ingredientes WHERE nombre = 'Chocolate Cobertura Blanco';
    SELECT id INTO id_crema FROM ingredientes WHERE nombre = 'Crema de Leche';

    -- 2. Insertar Recetas
    -- Almíbar
    INSERT INTO recetas (nombre, categoria, tipo, porciones_base, rendimiento_base_g, instrucciones)
    VALUES ('Almíbar de Pistacho (Base)', 'rellenos', 'PREPARACION_INTERMEDIA', 1, 207, 'Hervir agua y azúcar. Al tibiar agregar licor.')
    RETURNING id INTO id_receta_almibar;

    -- Cobertura
    INSERT INTO recetas (nombre, categoria, tipo, porciones_base, rendimiento_base_g, instrucciones)
    VALUES ('Cobertura Crema de Pistacho', 'coberturas', 'PREPARACION_INTERMEDIA', 1, 275, 'Fundir chocolate y crema. Mezclar con pasta. Reposar.')
    RETURNING id INTO id_receta_cobertura;

    -- Torta
    INSERT INTO recetas (nombre, categoria, tipo, porciones_base, rendimiento_base_g, molde, temperatura, tiempo_horneado, instrucciones)
    VALUES ('Torta de Pistacho (Completa 14cm)', 'tortas', 'PRODUCTO_FINAL', 8, 857, '14cm', 170, '45 min', 
'1. Mise en Place (Tazones):
   - T1: Harina + Polvo (Tamizados).
   - T2 (Cremado): Azúcar + Mantequilla + Margarina + Pasta de Pistacho.
   - T3: Huevos.
   - T4: Licor Amaretto.
2. Cremado: Batir T2 (2 min V1 -> 4 min V4 -> Limpiar -> 4 min V4).
3. Huevos: Agregar T3 en hilo (4 min V6). Evitar cortado.
4. Secos: Incorporar T1 a mano (Miserable). Agregar T4 al final.
5. Hornear 170°C x 45 min.
6. Humedecer con Almíbar tibio.
7. Decorar con Cobertura y pistachos.')
    RETURNING id INTO id_receta_torta;

    -- 3. Insertar Composición (Grafo)
    
    -- Almíbar Composition
    INSERT INTO recipe_composition (parent_recipe_id, child_ingredient_id, cantidad, unidad) VALUES
        (id_receta_almibar, id_agua, 150, 'ml'),
        (id_receta_almibar, id_azucar, 50, 'g'),
        (id_receta_almibar, id_amaretto, 7, 'ml');

    -- Cobertura Composition
    INSERT INTO recipe_composition (parent_recipe_id, child_ingredient_id, cantidad, unidad) VALUES
        (id_receta_cobertura, id_choco, 200, 'g'),
        (id_receta_cobertura, id_crema, 70, 'g'),
        (id_receta_cobertura, id_pistacho, 5, 'g');

    -- Torta Composition (Mix of Ingredients + Sub-Recipe)
    INSERT INTO recipe_composition (parent_recipe_id, child_ingredient_id, cantidad, unidad) VALUES
        (id_receta_torta, id_harina, 110, 'g'),
        (id_receta_torta, id_azucar, 100, 'g'),
        (id_receta_torta, id_mantequilla, 50, 'g'),
        (id_receta_torta, id_margarina, 50, 'g'),
        (id_receta_torta, id_huevos, 2, 'unidad'), 
        (id_receta_torta, id_pistacho, 6, 'g'),
        (id_receta_torta, id_amaretto, 7, 'ml'),
        (id_receta_torta, id_polvo, 1, 'g');
        
    -- Torta Composition (Sub-Recipe Links)
    -- 1. Almíbar: Usamos el rendimiento total (207g) para que el costo sume el lote completo.
    -- (Costo unitario ~$5/g * 207g = ~$1.053)
    INSERT INTO recipe_composition (parent_recipe_id, child_recipe_id, cantidad, unidad) VALUES
        (id_receta_torta, id_receta_almibar, 207, 'g');

    -- 2. Cobertura: Usamos el rendimiento total (275g)
    -- (Costo unitario ~$41/g * 275g = ~$11.160)
    INSERT INTO recipe_composition (parent_recipe_id, child_recipe_id, cantidad, unidad) VALUES
        (id_receta_torta, id_receta_cobertura, 275, 'g');
        
    RAISE NOTICE 'Datos de prueba insertados exitosamente (Corregido Lotes -> Gramos).';

END $$;
