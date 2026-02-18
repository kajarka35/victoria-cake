<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { supabase } from '$lib/supabaseClient';
	import type { CategoriaIngrediente } from '$lib/kitchen';

	export let mostrar = false;
	export let categorias: CategoriaIngrediente[] = [];

	const dispatch = createEventDispatcher();

	let editandoId: string | null = null;
	let editNombre = '';
	let editIcono = '';
	let editColor = '';

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

	function iniciarEdicion(cat: CategoriaIngrediente) {
		editandoId = cat.id;
		editNombre = cat.nombre;
		editIcono = cat.icono;
		editColor = cat.color;
	}

	function cancelarEdicion() {
		editandoId = null;
		editNombre = '';
	}

	async function guardarEdicion() {
		if (!editandoId || !editNombre) return;

		const catOriginal = categorias.find((c) => c.id === editandoId);
		if (!catOriginal) return;

		// 1. Actualizar tabla categorias
		const { error: errCat } = await supabase
			.from('categorias_ingredientes')
			.update({ nombre: editNombre, icon: editIcono, color: editColor, icono: editIcono }) // icono duplicated for safety
			.eq('id', editandoId);

		if (errCat) {
			alert('Error actualizando categoría: ' + errCat.message);
			return;
		}

		// 2. Si cambió el nombre, actualizar ingredientes (Propagación manual xq no hay FK hard)
		if (catOriginal.nombre !== editNombre) {
			const { error: errIng } = await supabase
				.from('ingredientes')
				.update({ categoria: editNombre })
				.eq('categoria', catOriginal.nombre);

			if (errIng) {
				alert('Advertencia: Categoría renombrada pero falló actualizar algunos ingredientes.');
			}
		}

		dispatch('actualizar'); // Recargar datos en padre
		cancelarEdicion();
	}

	async function eliminarCategoria(cat: CategoriaIngrediente) {
		// 1. Check uso
		const { count, error: errCount } = await supabase
			.from('ingredientes')
			.select('*', { count: 'exact', head: true })
			.eq('categoria', cat.nombre);

		if (errCount) {
			alert('Error verificando uso: ' + errCount.message);
			return;
		}

		if (count && count > 0) {
			alert(
				`No puedes eliminar "${cat.nombre}" porque hay ${count} ingredientes usándola. Mueve esos ingredientes a otra categoría primero.`
			);
			return;
		}

		if (!confirm(`¿Eliminar categoría "${cat.nombre}"?`)) return;

		const { error } = await supabase.from('categorias_ingredientes').delete().eq('id', cat.id);

		if (error) {
			alert('Error eliminando: ' + error.message);
		} else {
			dispatch('actualizar');
		}
	}

	function cerrar() {
		dispatch('cerrar');
		cancelarEdicion();
	}
</script>

{#if mostrar}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
		transition:fade
		on:click|self={cerrar}
	>
		<div
			class="flex max-h-[90vh] w-[95%] max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl md:w-full dark:bg-gray-800"
			transition:scale={{ start: 0.95 }}
		>
			<div class="flex items-center justify-between bg-gray-100 p-6 dark:bg-gray-700">
				<div>
					<h2 class="text-2xl font-bold text-gray-800 dark:text-white">
						🗂️ Administrar Categorías
					</h2>
					<p class="text-sm text-gray-500 dark:text-gray-300">
						Edita colores, iconos o renombra tus categorías.
					</p>
				</div>
				<button on:click={cerrar} class="text-2xl text-gray-400 hover:text-gray-600">×</button>
			</div>

			<div class="flex-1 overflow-y-auto p-6">
				<div class="space-y-3">
					{#each categorias as cat (cat.id)}
						{#if editandoId === cat.id}
							<!-- Edit Mode -->
							<div
								class="flex flex-col gap-4 rounded-xl border-2 border-pink-500 bg-pink-50 p-4 dark:border-pink-400 dark:bg-pink-900/20"
							>
								<div class="flex gap-2">
									<input
										type="text"
										bind:value={editIcono}
										class="w-12 rounded-lg border p-2 text-center text-xl"
									/>
									<input
										type="text"
										bind:value={editNombre}
										class="flex-1 rounded-lg border p-2 font-bold"
										placeholder="Nombre categoría"
									/>
								</div>
								<div class="flex flex-wrap gap-2">
									{#each colores as c}
										<button
											on:click={() => (editColor = c.id)}
											class="h-6 w-6 rounded-full ring-2 {c.class} {editColor === c.id
												? 'ring-gray-900 ring-offset-2'
												: 'opacity-50 ring-transparent'}"
										/>
									{/each}
								</div>
								<div class="flex justify-end gap-2">
									<button
										on:click={cancelarEdicion}
										class="rounded px-3 py-1 text-gray-500 hover:bg-gray-200">Cancelar</button
									>
									<button
										on:click={guardarEdicion}
										class="rounded bg-pink-500 px-3 py-1 text-white hover:bg-pink-600"
										>Guardar Cambios</button
									>
								</div>
							</div>
						{:else}
							<!-- View Mode -->
							<div
								class="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
							>
								<div class="flex items-center gap-3">
									<span class="text-2xl">{cat.icono}</span>
									<div>
										<span class="font-bold text-gray-800 dark:text-gray-200">{cat.nombre}</span>
										<div class="flex items-center gap-1">
											<div
												class="h-2 w-2 rounded-full bg-{cat.color === 'gray'
													? 'gray-500'
													: cat.color + '-500'}"
											></div>
											<span class="text-xs text-gray-400 capitalize">{cat.color}</span>
										</div>
									</div>
								</div>
								<div class="flex gap-2">
									<button
										on:click={() => iniciarEdicion(cat)}
										class="rounded-lg bg-blue-50 p-2 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300"
									>
										✏️
									</button>
									<button
										on:click={() => eliminarCategoria(cat)}
										class="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300"
									>
										🗑️
									</button>
								</div>
							</div>
						{/if}
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}
