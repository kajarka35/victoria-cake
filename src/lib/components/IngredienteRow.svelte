<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { fade } from 'svelte/transition';
    import type { Ingrediente } from '$lib/kitchen';

    export let ingrediente: Ingrediente;
    export let esNuevo = false;

    const dispatch = createEventDispatcher();
    let editando = esNuevo;
    let datos = { ...ingrediente };

    function guardar() {
        if (!datos.nombre || datos.precio < 0) return;
        dispatch('guardar', datos);
        editando = false;
    }

    function cancelar() {
        if (esNuevo) {
            dispatch('cancelar');
        } else {
            datos = { ...ingrediente };
            editando = false;
        }
    }
</script>

<tr class="group border-b border-pink-100 dark:border-gray-700 hover:bg-pink-50/50 dark:hover:bg-gray-800/50 transition-colors">
    {#if editando}
        <td class="p-3">
            <input 
                bind:value={datos.nombre} 
                class="w-full rounded-lg border-pink-200 bg-white px-2 py-1 text-sm focus:border-pink-500 focus:ring-pink-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Nombre ingrediente"
                autoFocus
            />
        </td>
        <td class="p-3">
            <select 
                bind:value={datos.categoria}
                class="w-full rounded-lg border-pink-200 bg-white px-2 py-1 text-sm focus:border-pink-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
                <option value="general">General</option>
                <option value="harinas">Harinas</option>
                <option value="lacteos">Lácteos</option>
                <option value="grasas">Grasas</option>
                <option value="endulzantes">Endulzantes</option>
                <option value="esencias">Esencias</option>
                <option value="chocolates">Chocolates</option>
                <option value="frutas">Frutas</option>
                <option value="empaques">Empaques</option>
            </select>
        </td>
        <td class="p-3">
            <div class="flex items-center gap-2">
                <span class="text-gray-500">$</span>
                <input 
                    type="number" 
                    bind:value={datos.precio} 
                    class="w-full rounded-lg border-pink-200 bg-white px-2 py-1 text-sm focus:border-pink-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
            </div>
        </td>
        <td class="p-3">
            <div class="flex items-center gap-2">
                <input 
                    type="number" 
                    bind:value={datos.cantidad_por_precio} 
                    class="w-20 rounded-lg border-pink-200 bg-white px-2 py-1 text-sm focus:border-pink-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <select 
                    bind:value={datos.unidad}
                    class="rounded-lg border-pink-200 bg-white px-2 py-1 text-sm focus:border-pink-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                    <option value="unidad">unid</option>
                    <option value="kg">kg</option>
                    <option value="lt">lt</option>
                </select>
            </div>
        </td>
        <td class="p-3 text-right">
            <button on:click={guardar} class="text-green-600 hover:text-green-800 mr-2">💾</button>
            <button on:click={cancelar} class="text-red-500 hover:text-red-700">❌</button>
        </td>
    {:else}
        <td class="p-3 font-medium text-gray-900 dark:text-white">{ingrediente.nombre}</td>
        <td class="p-3">
            <span class="px-2 py-1 rounded-full text-xs bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300">
                {ingrediente.categoria}
            </span>
        </td>
        <td class="p-3 text-gray-700 dark:text-gray-300">
            ${ingrediente.precio.toLocaleString()}
        </td>
        <td class="p-3 text-gray-500 dark:text-gray-400 text-sm">
            por {ingrediente.cantidad_por_precio} {ingrediente.unidad}
        </td>
        <td class="p-3 text-right opacity-0 group-hover:opacity-100 transition-opacity">
            <button on:click={() => editando = true} class="text-blue-500 hover:text-blue-700 mr-2">✏️</button>
            <button on:click={() => dispatch('eliminar', ingrediente.id)} class="text-red-500 hover:text-red-700">🗑️</button>
        </td>
    {/if}
</tr>
