-- SEMILLA: TORTA TIPO PONQUÉ INTERMEDIO (CORRECCIÓN AMARENA ESTRICTA)
-- Autor: Victoria Cake IA
-- Cambios: Porciones 8 -> 14, Instrucciones Textuales

DO $$
DECLARE
    id_torta UUID;
    id_crema_ensayo UUID;
    id_harina UUID; id_azucar UUID; id_margarina UUID; id_sal UUID;
    id_huevos UUID; id_crema_leche UUID; id_leche_polvo UUID;
    id_polvo_horneo UUID; id_esencia UUID;
BEGIN
    -- 1. Recuperar IDs de Ingredientes (Ya insertados previamente)
    SELECT id INTO id_harina FROM ingredientes WHERE nombre = 'Harina Trigo Pastelera';
    SELECT id INTO id_azucar FROM ingredientes WHERE nombre = 'Azúcar Granulada';
    SELECT id INTO id_margarina FROM ingredientes WHERE nombre = 'Margarina Repostera';
    SELECT id INTO id_sal FROM ingredientes WHERE nombre = 'Sal';
    SELECT id INTO id_huevos FROM ingredientes WHERE nombre = 'Huevos AA';
    SELECT id INTO id_crema_leche FROM ingredientes WHERE nombre = 'Crema de Leche';
    SELECT id INTO id_leche_polvo FROM ingredientes WHERE nombre = 'Leche en Polvo';
    SELECT id INTO id_polvo_horneo FROM ingredientes WHERE nombre = 'Polvo de Hornear';
    SELECT id INTO id_esencia FROM ingredientes WHERE nombre = 'Esencia de Vainilla';

    -- 2. Limpiar Receta Anterior para Recrearla Limpia
    DELETE FROM recipe_composition WHERE parent_recipe_id IN (SELECT id FROM recetas WHERE nombre = 'Torta Tipo Ponqué Intermedio (14cm)');
    DELETE FROM recetas WHERE nombre = 'Torta Tipo Ponqué Intermedio (14cm)';

    -- 3. Crear Receta con Datos ESTRICTOS Amarena
    -- Porciones: 940g totales / 65g regla = ~14.4 -> 14 Porciones
    INSERT INTO recetas (nombre, categoria, tipo, porciones_base, rendimiento_base_g, molde, temperatura, tiempo_horneado, instrucciones)
    VALUES ('Torta Tipo Ponqué Intermedio (14cm)', 'tortas', 'PRODUCTO_FINAL', 14, 940, '14cm', 150, '80 min',
'# Diagrama de Tazones

**Organización de Tazones**
*   **Tazón 1 (Secos):** Harina + Leche en polvo + Polvo de hornear + Sal. (Mezclar y tamizar).
*   **Tazón 2 (Cremado):** Azúcar + Margarina + Esencia.
*   **Tazón 3:** Huevos.
*   **Tazón 4:** Crema de leche.

**Proceso**
1.  **Mise en place:** Pesamos y alistamos.
2.  **Ingredientes secos:** En Tazón 1 mezclar harina, leche polvo, polvo horneo y sal. Tamizar.
3.  **Etapa cremada:** Tazón 2 (Batidora). Cremar 2 min Velocidad 1. Luego 4 min Velocidad 4. Apagar, limpiar paredes. Batir de nuevo 4 min Velocidad 4.
4.  **Huevos:** Subir a Velocidad 6. Agregar huevos (Tazón 3) pausadamente sin dejar de batir.
5.  **Incorporación secos:** Cambiar a PALA. Adicionar secos poco a poco en Velocidad 1.
6.  **Batido final:** Al terminar secos, colocar crema de leche (Tazón 4).
7.  **Dosificado:** 1 molde de 14 cm.
8.  **Horneado:** 150°C por 80 min aprox.

💡 **Sugerencias:** Relleno Buttercream Merengue Suizo, Cubierta Fondant, Ganache Chocolate.')
    RETURNING id INTO id_torta;

    -- 4. Insertar Composición (Gramos Exactos Imagen)
    INSERT INTO recipe_composition (parent_recipe_id, child_ingredient_id, cantidad, unidad) VALUES
        (id_torta, id_harina, 230, 'g'),     -- 100%
        (id_torta, id_azucar, 207, 'g'),     -- 90%
        (id_torta, id_margarina, 215, 'g'),  -- 93.4%
        (id_torta, id_sal, 0.1, 'g'),        -- 0.04%
        (id_torta, id_huevos, 4.6, 'unidad'),-- 230g / 50g = 4.6u (Aprox 100%)
        (id_torta, id_crema_leche, 40, 'g'), -- 17.3%
        (id_torta, id_leche_polvo, 15, 'g'), -- 6.5%
        (id_torta, id_polvo_horneo, 1.5, 'g'),-- 0.6%
        (id_torta, id_esencia, 1, 'ml');     -- 0.4%

    RAISE NOTICE '¡Receta Corregida! Ahora refleja estrictamente 14 porciones Amarena.';

END $$;
