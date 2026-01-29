-- Create content_blocks table
CREATE TABLE IF NOT EXISTS public.content_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    label TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(section, key)
);

-- Enable RLS
ALTER TABLE public.content_blocks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public Read Access" ON public.content_blocks
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "Admin Write Access" ON public.content_blocks
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'admin'
        )
    );

-- Seed Data (Initial Content)
INSERT INTO public.content_blocks (section, key, value, type, label) VALUES
-- Global Contact
('global_contact', 'whatsapp', '+57 312 658 9467', 'text', 'WhatsApp'),
('global_contact', 'whatsapp_link', 'https://api.whatsapp.com/send?phone=573126589467', 'link', 'Enlace WhatsApp'),
('global_contact', 'phone', '(57) 312 658 9467', 'text', 'Teléfono Visible'),
('global_contact', 'instagram', '@victoriacake.vc', 'text', 'Usuario Instagram'),
('global_contact', 'instagram_link', 'https://instagram.com/victoriacake.vc', 'link', 'Enlace Instagram'),

-- Home Hero
('home_hero', 'title_part1', 'Endulza tu vida con', 'text', 'Título (Parte 1)'),
('home_hero', 'title_highlight', 'Victoria Cake', 'text', 'Título (Destacado)'),
('home_hero', 'subtitle', 'Pasteles artesanales con diseño, sabor y magia. Celebra tus momentos con dulzura y estilo.', 'text', 'Subtítulo'),
('home_hero', 'cta_primary', 'Ver Catálogo', 'text', 'Botón Principal'),
('home_hero', 'cta_secondary', 'Contáctanos', 'text', 'Botón Secundario'),
('home_hero', 'hero_image_remote', 'https://igjfvofxervwifumejxh.supabase.co/storage/v1/object/public/imagenes-productos/productos/imagen.webp', 'image', 'Imagen Hero'),

-- Home Products
('home_products', 'title', 'Nuestros Productos', 'text', 'Título Sección Productos'),
('home_products', 'subtitle', 'Descubre el arte pastelero: diseño, sabor y dedicación en cada creación.', 'text', 'Subtítulo Sección Productos')
ON CONFLICT (section, key) DO UPDATE SET value = EXCLUDED.value;
