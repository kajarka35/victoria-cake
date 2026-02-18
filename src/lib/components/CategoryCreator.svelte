<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fade, scale } from 'svelte/transition';

	export let mostrar = false;
	export let nombreInicial = '';

	const dispatch = createEventDispatcher();

	let nombre = nombreInicial;
	let color = 'gray';
	let icono = '📦';

	// Reset when opening
	$: if (mostrar) {
		nombre = nombreInicial;
		color = 'gray';
		icono = '📦';
	}

	const colores = [
		{ id: 'gray', class: 'bg-gray-500' },
		{ id: 'blue', class: 'bg-blue-500' },
		{ id: 'green', class: 'bg-green-500' },
		{ id: 'yellow', class: 'bg-yellow-500' },
		{ id: 'orange', class: 'bg-orange-500' },
		{ id: 'red', class: 'bg-red-500' },
		{ id: 'pink', class: 'bg-pink-500' },
		{ id: 'purple', class: 'bg-purple-500' },
		{ id: 'indigo', class: 'bg-indigo-500' },
		{ id: 'cyan', class: 'bg-cyan-500' },
		{ id: 'amber', class: 'bg-amber-600' },
		{ id: 'brown', class: 'bg-amber-800' },
		{ id: 'slate', class: 'bg-slate-600' }
	];

	const sugerenciasIconos = [
		'📦',
		'🌾',
		'🥛',
		'🧈',
		'🍬',
		'🧪',
		'🍫',
		'🍓',
		'🛍️',
		'🧂',
		'🥚',
		'🥫',
		'🥜',
		'🥕',
		'🧀'
	];

	function guardar() {
		if (!nombre) return;
		dispatch('guardar', { nombre, color, icono });
		nombre = '';
	}

	function cerrar() {
		dispatch('cancelar');
	}
</script>

{#if mostrar}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
		transition:fade
		on:click|self={cerrar}
	>
		<div
			class="w-[95%] max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl md:w-full dark:bg-gray-800"
			transition:scale={{ start: 0.9 }}
		>
			<div class="bg-gradient-to-r from-pink-500 to-purple-600 p-6 text-white">
				<h2 class="text-2xl font-bold">✨ Nueva Categoría</h2>
				<p class="text-pink-100">Personaliza cómo se verán tus ingredientes.</p>
			</div>

			<div class="space-y-6 p-6">
				<!-- Nombre -->
				<div class="space-y-2">
					<label class="text-sm font-bold text-gray-600 dark:text-gray-300">Nombre</label>
					<input
						type="text"
						bind:value={nombre}
						placeholder="Ej. Salsas, Decoración..."
						class="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-2 font-bold focus:border-pink-500 focus:ring-4 focus:ring-pink-500/20 focus:outline-none dark:border-gray-600 dark:bg-gray-700"
						autoFocus
					/>
				</div>

				<!-- Icono -->
				<div class="space-y-2">
					<label class="text-sm font-bold text-gray-600 dark:text-gray-300">Icono (Emoji)</label>
					<div class="flex gap-2">
						<input
							type="text"
							bind:value={icono}
							class="w-16 rounded-xl border-2 border-gray-200 bg-gray-50 px-2 py-2 text-center text-2xl focus:border-pink-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700"
						/>
						<div class="flex flex-wrap gap-2">
							{#each sugerenciasIconos as icon}
								<button
									class="rounded-lg bg-gray-100 p-2 text-xl hover:bg-pink-100 dark:bg-gray-700 dark:text-white dark:hover:bg-pink-900/30"
									on:click={() => (icono = icon)}
								>
									{icon}
								</button>
							{/each}
						</div>
					</div>
				</div>

				<!-- Color -->
				<div class="space-y-2">
					<label class="text-sm font-bold text-gray-600 dark:text-gray-300">Color del Badge</label>
					<div class="flex flex-wrap gap-3">
						{#each colores as c}
							<button
								on:click={() => (color = c.id)}
								class="h-8 w-8 rounded-full shadow-sm ring-2 transition hover:scale-110 {c.class} {color ===
								c.id
									? 'ring-gray-900 ring-offset-2 dark:ring-white'
									: 'ring-transparent'}"
							/>
						{/each}
					</div>
					<!-- Preview -->
					<div
						class="mt-2 flex items-center justify-center rounded-xl bg-gray-50 p-4 dark:bg-gray-700/50"
					>
						<span class="mr-2 text-sm text-gray-500">Vista previa:</span>
						<span
							class="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset bg-{color}-100 text-{color}-700 ring-{color}-500/20 dark:bg-{color}-900/40 dark:text-{color}-300"
						>
							{icono}
							{nombre || 'Nombre'}
						</span>
						<!-- Note: Dynamic classes might not purge correctly in Tailwind without safelist, 
                              but let's rely on safelist or matching known patterns from IngredienteRow logic if possible.
                              Replicating simple style for preview. -->
					</div>
				</div>

				<div class="flex justify-end gap-3 pt-4">
					<button
						on:click={cerrar}
						class="rounded-xl px-4 py-2 font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
					>
						Cancelar
					</button>
					<button
						on:click={guardar}
						class="rounded-xl bg-pink-500 px-6 py-2 font-bold text-white shadow-lg transition hover:scale-105 hover:bg-pink-600 hover:shadow-pink-500/30"
					>
						Crear Categoría
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
