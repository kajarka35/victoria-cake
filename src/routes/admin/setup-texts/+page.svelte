<script lang="ts">
    export let data;
</script>

<div class="min-h-screen flex items-center justify-center bg-green-50 p-6">
    <div class="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border-2 border-green-100">
        <div class="text-6xl mb-4">✅</div>
        <h1 class="text-3xl font-bold text-green-700 mb-2">¡Migración Exitosa!</h1>
        <p class="text-green-600 mb-6">La base de datos se ha actualizado correctamente.</p>
        
        {#if data.success}
            <div class="bg-gray-50 rounded-lg p-4 text-left text-sm font-mono text-gray-600 mb-6 border border-gray-200">
                <p class="font-bold mb-2 text-gray-800">Campos Confirmados:</p>
                <ul class="list-disc pl-5 space-y-1">
                    {#each data.found_keys || [] as key}
                        <li class="text-green-600 font-semibold">{key}</li>
                    {/each}
                </ul>
            </div>
        {:else}
            <div class="bg-red-50 rounded-lg p-4 text-red-600 mb-6">
                Error: {data.error}
            </div>
        {/if}

        <a 
            href="/admin/cms" 
            class="inline-block w-full rounded-xl bg-green-600 px-6 py-4 font-bold text-white shadow-lg transition-transform hover:scale-105 hover:bg-green-700"
        >
            Ir al Gestor de Contenidos →
        </a>
    </div>
</div>
