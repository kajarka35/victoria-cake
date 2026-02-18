<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';

	let config = {
		default_porcentaje_cif: 20,
		default_porcentaje_utilidad: 30,
		default_costo_empaque: 0,
		gastos_fijos_mensuales: 0
	};

	let loading = true;
	let saving = false;

	onMount(async () => {
		loading = true;
		const { data, error } = await supabase
			.from('configuracion_global')
			.select('*')
			.eq('id', 1)
			.single();

		if (data) {
			config = data;
		} else if (error && error.code !== 'PGRST116') {
			// PGRST116 is "Row not found"
			alert('Error cargando configuración: ' + error.message);
		}
		loading = false;
	});

	async function guardarConfig() {
		saving = true;
		// Upsert logic (insert if not exists, update if exists)
		const { error } = await supabase
			.from('configuracion_global')
			.upsert({ ...config, id: 1 }) // Force Singleton ID 1
			.select();

		if (error) {
			alert('Error guardando: ' + error.message);
		} else {
			alert('✅ Configuración Global Actualizada');
		}
		saving = false;
	}
</script>

<svelte:head>
	<title>Configuración Global | Victoria Cake</title>
</svelte:head>

<div class="mx-auto max-w-4xl pb-20">
	<!-- Header -->
	<div class="mb-8 rounded-3xl bg-gradient-to-r from-gray-800 to-gray-900 p-8 text-white shadow-xl">
		<h1 class="text-4xl font-extrabold tracking-tight">⚙️ Configuración Global</h1>
		<p class="mt-2 text-gray-400">
			Define los valores por defecto para tu negocio. Estos se aplicarán a las nuevas recetas.
		</p>
	</div>

	{#if loading}
		<div class="flex h-60 items-center justify-center">
			<div
				class="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-pink-600"
			></div>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
			<!-- Panel Financiero -->
			<section
				class="rounded-3xl border border-gray-100 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800"
			>
				<h2 class="mb-6 flex items-center gap-2 text-2xl font-bold text-gray-800 dark:text-white">
					💰 Valores Financieros Base
				</h2>

				<div class="space-y-6">
					<div>
						<label class="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-300">
							% CIF (Costos Indirectos)
						</label>
						<div
							class="flex items-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus-within:ring-2 focus-within:ring-pink-500 dark:border-gray-600 dark:bg-gray-700"
						>
							<span class="mr-2 text-xl">🏭</span>
							<input
								type="number"
								bind:value={config.default_porcentaje_cif}
								class="w-full bg-transparent text-lg font-bold outline-none dark:text-white"
								placeholder="Ej: 20"
							/>
							<span class="font-bold text-gray-500">%</span>
						</div>
						<p class="mt-1 text-xs text-gray-500">
							Gas, Luz, Agua, Arriendo (estimado por receta).
						</p>
					</div>

					<div>
						<label class="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-300">
							% Utilidad Deseada
						</label>
						<div
							class="flex items-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus-within:ring-2 focus-within:ring-pink-500 dark:border-gray-600 dark:bg-gray-700"
						>
							<span class="mr-2 text-xl">📈</span>
							<input
								type="number"
								bind:value={config.default_porcentaje_utilidad}
								class="w-full bg-transparent text-lg font-bold outline-none dark:text-white"
								placeholder="Ej: 30"
							/>
							<span class="font-bold text-gray-500">%</span>
						</div>
						<p class="mt-1 text-xs text-gray-500">Margen de ganancia sobre el Costo Real.</p>
					</div>

					<div>
						<label class="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-300">
							Costo Empaque Promedio
						</label>
						<div
							class="flex items-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus-within:ring-2 focus-within:ring-pink-500 dark:border-gray-600 dark:bg-gray-700"
						>
							<span class="mr-2 text-xl">📦</span>
							<span class="mr-1 font-bold text-gray-500">$</span>
							<input
								type="number"
								bind:value={config.default_costo_empaque}
								class="w-full bg-transparent text-lg font-bold outline-none dark:text-white"
								placeholder="Ej: 500"
							/>
						</div>
						<p class="mt-1 text-xs text-gray-500">
							Valor por defecto si no se especifica en la receta.
						</p>
					</div>
				</div>
			</section>

			<!-- Panel de Control (Futuro) + Guardar -->
			<div class="flex flex-col gap-8">
				<section
					class="pointer-events-none rounded-3xl border border-gray-100 bg-white p-8 opacity-60 shadow-lg grayscale dark:border-gray-700 dark:bg-gray-800"
				>
					<div class="mb-4 flex items-center justify-between">
						<h2 class="text-xl font-bold text-gray-800 dark:text-white">
							📊 Metas Mensuales (Pronto)
						</h2>
						<span class="rounded-full bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-700"
							>PRO</span
						>
					</div>
					<div>
						<label class="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-300"
							>Gastos Fijos Totales</label
						>
						<div
							class="flex items-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-600 dark:bg-gray-700"
						>
							<span class="mr-2 text-xl">🏢</span>
							<input
								type="number"
								disabled
								value={config.gastos_fijos_mensuales}
								class="w-full bg-transparent font-bold outline-none"
							/>
						</div>
					</div>
				</section>

				<button
					on:click={guardarConfig}
					disabled={saving}
					class="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 p-4 text-center text-lg font-bold text-white shadow-xl transition-all hover:scale-[1.02] hover:shadow-2xl disabled:opacity-70"
				>
					<span class="relative z-10 flex items-center justify-center gap-2">
						{#if saving}
							⏳ Guadando...
						{:else}
							💾 Guardar Configuración Maestro
						{/if}
					</span>
				</button>
			</div>
		</div>
	{/if}
</div>
