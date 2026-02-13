-- SMART KITCHEN MIGRATION --

-- 1. Tabla de Insumos/Ingredientes
CREATE TABLE IF NOT EXISTS public.ingredientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  unidad TEXT NOT NULL DEFAULT 'g',  -- g, ml, unidad, kg
  precio NUMERIC(10,2) NOT NULL DEFAULT 0,
  cantidad_por_precio NUMERIC(10,2) NOT NULL DEFAULT 1000, -- ej: 1000g = $X
  proveedor TEXT,
  categoria TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Recetas
CREATE TABLE IF NOT EXISTS public.recetas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  categoria TEXT DEFAULT 'tortas',
  porciones_base INTEGER NOT NULL DEFAULT 8,
  molde TEXT DEFAULT '14cm',
  temperatura INTEGER,
  tiempo_horneado TEXT,
  instrucciones TEXT,
  notas TEXT,
  producto_id BIGINT REFERENCES public.productos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla Pivot: Ingredientes por Receta
CREATE TABLE IF NOT EXISTS public.receta_ingredientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receta_id UUID NOT NULL REFERENCES public.recetas(id) ON DELETE CASCADE,
  ingrediente_id UUID NOT NULL REFERENCES public.ingredientes(id) ON DELETE RESTRICT,
  cantidad NUMERIC(10,2) NOT NULL,
  notas TEXT,
  orden INTEGER DEFAULT 0,
  UNIQUE(receta_id, ingrediente_id)
);

-- 4. Habilitar RLS
ALTER TABLE public.ingredientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receta_ingredientes ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de Seguridad (Igual que content_blocks)
-- Lectura pública (para poder ver recetas o ingredientes si fuera necesario en futuro)
CREATE POLICY "Public Read Access Ingredientes" ON public.ingredientes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public Read Access Recetas" ON public.recetas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public Read Access RecetaIngredientes" ON public.receta_ingredientes FOR SELECT TO anon, authenticated USING (true);

-- Escritura solo Admin
CREATE POLICY "Admin Write Access Ingredientes" ON public.ingredientes FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
);
CREATE POLICY "Admin Write Access Recetas" ON public.recetas FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
);
CREATE POLICY "Admin Write Access RecetaIngredientes" ON public.receta_ingredientes FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
);
