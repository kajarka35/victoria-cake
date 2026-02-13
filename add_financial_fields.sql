-- Agregar columnas financieras a la tabla recetas
ALTER TABLE public.recetas 
ADD COLUMN IF NOT EXISTS porcentaje_cif numeric DEFAULT 20,
ADD COLUMN IF NOT EXISTS porcentaje_utilidad numeric DEFAULT 30,
ADD COLUMN IF NOT EXISTS costo_empaque numeric DEFAULT 0;

-- Comentario para documentación
COMMENT ON COLUMN public.recetas.porcentaje_cif IS 'Porcentaje de Costos Indirectos de Fabricación (Gas, Luz, Agua)';
COMMENT ON COLUMN public.recetas.porcentaje_utilidad IS 'Porcentaje de ganancia deseada sobre el costo real';
COMMENT ON COLUMN public.recetas.costo_empaque IS 'Costo fijo de empaques (Cajas, bases, cintas)';
