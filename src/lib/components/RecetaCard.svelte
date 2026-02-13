<script lang="ts">
    import type { Receta } from '$lib/kitchen';
    import { goto } from '$app/navigation';

    export let receta: Receta;
    export let costoTotal: number = 0;
</script>

<article 
    class="relative flex flex-col overflow-hidden rounded-3xl bg-white/70 shadow-lg backdrop-blur-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-gray-800/60 group cursor-pointer"
    on:click={() => goto(`/admin/recetas/${receta.id}`)}
    on:keypress={() => goto(`/admin/recetas/${receta.id}`)}
    role="button"
    tabindex="0"
>
    <!-- Header Color por Categoría -->
    <div class="h-2 w-full bg-gradient-to-r from-pink-400 to-purple-500"></div>

    <div class="flex flex-1 flex-col p-5">
        <div class="flex justify-between items-start mb-2">
            <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                {receta.categoria}
            </span>
            <span class="text-xs text-gray-500 dark:text-gray-400">
                {receta.porciones_base} porciones ({receta.molde})
            </span>
        </div>

        <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-1 group-hover:text-pink-600 transition-colors">
            {receta.nombre}
        </h3>

        {#if receta.producto_id}
            <span class="text-xs text-green-600 flex items-center gap-1 mb-4">
                🔗 Vinculado a catálogo
            </span>
        {:else}
            <span class="text-xs text-gray-400 mb-4 block">
                 No vinculado
            </span>
        {/if}

        <div class="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
            <p class="text-xs text-gray-500 uppercase tracking-wide">Costo Producción</p>
            <p class="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600">
                ${costoTotal.toLocaleString()}
            </p>
            <p class="text-xs text-gray-400 mt-1">
                ${Math.round(costoTotal / receta.porciones_base).toLocaleString()} / porción
            </p>
        </div>
    </div>
</article>
