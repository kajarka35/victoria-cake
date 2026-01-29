import { supabase } from '$lib/supabaseClient';

export interface ContentBlock {
    section: string;
    key: string;
    value: string;
    type: string;
}

export const cms = {
    /**
     * Obtiene todos los bloques de contenido de una sección específica.
     * Retorna un objeto mapeado { key: value } para fácil acceso.
     */
    async getSection(section: string) {
        const { data, error } = await supabase
            .from('content_blocks')
            .select('key, value, type')
            .eq('section', section);

        if (error) {
            console.error(`Error fetching CMS section ${section}:`, error);
            return {};
        }

        // Convertir array a objeto: { title: 'Texto...', subtitle: 'Texto...' }
        return data.reduce((acc, item) => {
            acc[item.key] = item.value;
            return acc;
        }, {} as Record<string, string>);
    },

    /**
     * Obtiene múltiples secciones a la vez.
     * Retorna { section1: { key: value }, section2: { key: value } }
     */
    async getSections(sections: string[]) {
        const { data, error } = await supabase
            .from('content_blocks')
            .select('section, key, value')
            .in('section', sections);

        if (error) {
            console.error('Error fetching CMS sections:', error);
            return {};
        }

        const result: Record<string, Record<string, string>> = {};

        data.forEach(item => {
            if (!result[item.section]) {
                result[item.section] = {};
            }
            result[item.section][item.key] = item.value;
        });

        return result;
    }
};
