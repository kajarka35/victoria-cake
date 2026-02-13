<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    export let min = 1;
    export let max = 100;
    export let value = 8;
    export let label = "Porciones";

    const dispatch = createEventDispatcher();

    function handleChange(e: Event) {
        const target = e.target as HTMLInputElement;
        value = parseInt(target.value);
        dispatch('change', value);
    }
</script>

<div class="flex flex-col gap-2 p-4 bg-white/50 rounded-2xl backdrop-blur-sm border border-pink-100 dark:bg-gray-800/50 dark:border-gray-700">
    <div class="flex justify-between items-center mb-1">
        <label for="slider" class="text-sm font-medium text-gray-700 dark:text-gray-300">
            Escalar Receta
        </label>
        <div class="flex items-center gap-2">
            <span class="text-2xl font-bold text-pink-600 dark:text-pink-400">{value}</span>
            <span class="text-sm text-gray-500">{label}</span>
        </div>
    </div>
    
    <input 
        id="slider"
        type="range" 
        {min} 
        {max} 
        bind:value 
        on:input={handleChange}
        class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-pink-500 hover:accent-pink-600"
    />
    
    <div class="flex justify-between text-xs text-gray-400 px-1">
        <span>{min}</span>
        <span>{max}</span>
    </div>
</div>
