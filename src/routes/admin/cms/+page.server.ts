import { supabase } from '$lib/supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    // Verificar sesión (aunque el layout admin ya lo hace, doble check)
    // Asumimos que layout admin maneja auth, pero aquí traemos los datos.

    const { data: blocks, error } = await supabase
        .from('content_blocks')
        .select('*')
        .order('section', { ascending: true })
        .order('id', { ascending: true });

    if (error) {
        console.error('Error loading CMS blocks:', error);
        return { blocks: [] };
    }

    interface CmsBlock {
        id: string;
        section: string;
        key: string;
        value: string;
        type: string;
        label?: string;
    }

    // Agrupar por sección para la UI
    const grouped = blocks.reduce((acc, item) => {
        if (!acc[item.section]) acc[item.section] = [];
        acc[item.section].push(item);
        return acc;
    }, {} as Record<string, CmsBlock[]>);

    return { grouped };
};

export const actions: Actions = {
    update: async ({ request, cookies }) => {
        const formData = await request.formData();
        const updates = [];

        // Recuperar token de sesión para pasar RLS
        const accessToken = cookies.get('sb-access-token');

        if (!accessToken) {
            return fail(401, { message: 'No autenticado' });
        }

        // Cliente autenticado on-the-fly
        const supabaseAuth = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
            global: {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        });

        for (const [key, value] of formData.entries()) {
            if (key.startsWith('block_')) {
                const id = key.replace('block_', '');
                updates.push({
                    id,
                    value: value.toString(),
                    updated_at: new Date().toISOString()
                });
            }
        }

        console.log('Recibiendo update CMS con Auth:', updates.length, 'items');

        const promises = updates.map(item =>
            supabaseAuth
                .from('content_blocks')
                .update({
                    value: item.value,
                    updated_at: item.updated_at
                })
                .eq('id', item.id)
        );

        const results = await Promise.all(promises);

        const firstError = results.find(r => r.error)?.error;

        if (firstError) {
            console.error('Error CMS update:', firstError);
            return fail(500, { message: 'Error actualizando CMS', error: firstError });
        }

        return { success: true };
    },

    create: async ({ request, cookies }) => {
        const formData = await request.formData();
        const section = formData.get('section')?.toString();
        const label = formData.get('label')?.toString();
        const type = formData.get('type')?.toString() || 'text';

        // Generar key a partir del label (ej: "Mi Nuevo Campo" -> "mi_nuevo_campo")
        let key = formData.get('key')?.toString();
        if (!key && label) {
            key = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        }

        if (!section || !key || !label) {
            return fail(400, { message: 'Faltan datos requeridos (Sección, Etiqueta)' });
        }

        const accessToken = cookies.get('sb-access-token');
        if (!accessToken) return fail(401, { message: 'No autenticado' });

        const supabaseAuth = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: `Bearer ${accessToken}` } }
        });

        const { error } = await supabaseAuth.from('content_blocks').insert({
            section,
            key,
            label,
            type,
            value: '' // Valor inicial vacío
        });

        if (error) {
            return fail(500, { message: 'Error creando campo', error });
        }

        return { success: true };
    },

    delete: async ({ request, cookies }) => {
        const formData = await request.formData();
        const id = formData.get('id')?.toString();

        if (!id) return fail(400, { message: 'Falta ID' });

        const accessToken = cookies.get('sb-access-token');
        if (!accessToken) return fail(401, { message: 'No autenticado' });

        const supabaseAuth = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: `Bearer ${accessToken}` } }
        });

        const { error } = await supabaseAuth.from('content_blocks').delete().eq('id', id);

        if (error) {
            return fail(500, { message: 'Error eliminando campo', error });
        }

        return { success: true };
    }
};
