import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const load: PageServerLoad = async ({ cookies }) => {
    console.log("-----------------------------------------");
    console.log("🚀 MIGRACIÓN V3 (Auth User): Iniciando...");

    // 1. Obtener token de sesión del usuario logueado
    const accessToken = cookies.get('sb-access-token');

    if (!accessToken) {
        console.error("❌ No hay sesión (Token no encontrado).");
        return {
            success: false,
            error: "No estás logueado. Por favor inicia sesión en /login y vuelve aquí."
        };
    }

    // 2. Crear cliente autenticado (actúa como el usuario Admin)
    const supabaseAuth = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        }
    });

    const blocks = [
        {
            section: 'global_contact',
            key: 'page_title',
            value: 'Contáctanos',
            type: 'text',
            label: 'Título de la Página'
        },
        {
            section: 'global_contact',
            key: 'page_subtitle',
            value: 'Estamos aquí para ayudarte. Puedes contactarnos a través de cualquiera de los siguientes canales:',
            type: 'long_text',
            label: 'Descripción / Subtítulo'
        },
        {
            section: 'global_contact',
            key: 'btn_home',
            value: '⬅️ Volver al inicio',
            type: 'text',
            label: 'Texto Botón Inicio'
        },
        {
            section: 'global_contact',
            key: 'btn_catalog',
            value: '🎂 Ver Catálogo',
            type: 'text',
            label: 'Texto Botón Catálogo'
        }
    ];

    // 3. Insertar/Actualizar
    const { error: insertError } = await supabaseAuth
        .from('content_blocks')
        .upsert(blocks, { onConflict: 'section,key' });

    if (insertError) {
        console.error("❌ Error migración:", insertError);
        return { success: false, error: insertError.message };
    }

    // 4. Verificar qué hay en la base de datos ahora
    const { data: currentBlocks, error: fetchError } = await supabaseAuth
        .from('content_blocks')
        .select('*')
        .eq('section', 'global_contact');

    if (fetchError) {
        console.error("❌ Error verificando:", fetchError);
        return { success: false, error: fetchError.message };
    }

    console.log("✅ Migración exitosa. Bloques encontrados:", currentBlocks?.length);

    // Filtrar solo las claves que nos interesan para confirmar
    const interestingKeys = ['page_title', 'page_subtitle', 'btn_home', 'btn_catalog'];
    const foundKeys = currentBlocks?.map(b => b.key).filter(k => interestingKeys.includes(k));

    return {
        success: true,
        message: "Migración V3 Completada con Autenticación de Usuario",
        found_keys: foundKeys,
        total_blocks: currentBlocks?.length
    };
};
