<script lang="ts">
	import { supabase } from '$lib/supabaseClient.js';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';

	export let data;
	const productos = data.productos;

	let eliminarId: number | null = null;
	let showConfirm = false;

	let show = false;

	const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

	function confirmarEliminacion(id: number) {
		eliminarId = id;
		showConfirm = true;
		// Forzar scroll al centro del viewport
		setTimeout(() => {
			const modal = document.getElementById('modal-confirm');
			modal?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}, 50);
	}
	async function eliminarProducto() {
		if (eliminarId !== null) {
			try {
				// 1. Obtener el producto para saber el path de la imagen
				const { data: producto, error: fetchError } = await supabase
					.from('productos')
					.select('imagen_path')
					.eq('id', eliminarId)
					.single();

				if (fetchError) throw fetchError;

				// 2. Eliminar la imagen del storage (si tiene imagen_path)
				if (producto?.imagen_path) {
					const { error: removeError } = await supabase.storage
						.from('imagenes-productos')
						.remove([producto.imagen_path]);

					if (removeError)
						console.warn('⚠️ Imagen no pudo ser eliminada del Storage:', removeError.message);
				}

				// 3. Eliminar el producto de la tabla
				const { error: deleteError } = await supabase
					.from('productos')
					.delete()
					.eq('id', eliminarId);

				if (deleteError) throw deleteError;

				// 4. Refrescar
				location.reload();
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} catch (err: any) {
				console.error('❌ Error eliminando producto:', err.message || err);
			}
		}
	}

	function cancelarEliminacion() {
		eliminarId = null;
		showConfirm = false;
	}
	function agregarProducto() {
		goto('/admin/agregar');
	}
	function irInicio() {
		goto('/');
	}

	onMount(async () => {
		const modo = localStorage.getItem('modoOscuro');
		if (modo === 'true') {
			document.documentElement.classList.add('dark');
		}
		await delay(500);

		show = true;
	});
</script>

<svelte:head>
	<title>Panel de Productos | Victoria Cake</title>
</svelte:head>

{#if show}
	<section
		class="animate-fade-in relative min-h-screen overflow-hidden bg-gradient-to-b from-pink-100 via-white to-white px-4 py-10 font-[Inter] text-gray-900 transition-colors duration-500 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 dark:text-white"
	>
		<!-- Fondo decorativo estilo blur -->
		<div
			class="absolute -top-10 -left-10 h-96 w-96 animate-pulse rounded-full bg-pink-300 opacity-20 blur-3xl"
		></div>
		<div
			class="absolute right-0 bottom-0 h-72 w-72 animate-pulse rounded-full bg-purple-200 opacity-20 blur-2xl delay-300"
		></div>

		<div class="relative z-10 mx-auto max-w-7xl space-y-8">
			<h1
				class="animate-fade-in text-center text-3xl font-extrabold text-pink-600 drop-shadow-md sm:text-left sm:text-4xl dark:text-pink-400"
			>
				Panel de Productos
			</h1>

			<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each productos as p, i (p.id)}
					<article
						class="relative flex h-full transform flex-col overflow-hidden rounded-3xl bg-white/70 shadow-lg backdrop-blur-lg transition duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-xl dark:bg-gray-800/60"
						tabindex="0"
						in:fly={{ y: 40, duration: 500, delay: i * 100 }}
					>
						<img
							src={p.imagen}
							alt={p.nombre}
							class="h-44 w-full object-cover transition duration-500 group-hover:scale-105"
							loading="lazy"
						/>

						<div class="flex flex-1 flex-col p-4">
							<h3 class="text-lg font-bold text-gray-900 dark:text-white">{p.nombre}</h3>
							<p class="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">
								{p.descripcion}
							</p>
							<p class="mt-3 font-extrabold text-pink-600 dark:text-pink-400">{p.precio}</p>
						</div>

						<div
							class="flex flex-col gap-2 rounded-b-2xl border-t border-pink-200 bg-white/50 p-4 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/50"
						>
							<button
								on:click={() => goto(`/admin/editar/${p.id}`)}
								class="flex items-center justify-center gap-2 rounded-full bg-pink-50 py-2 text-pink-600 transition hover:bg-pink-100 dark:bg-pink-900/30 dark:text-pink-300"
							>
								✏️ Editar
							</button>
							<button
								on:click={() => confirmarEliminacion(p.id)}
								class="flex items-center justify-center gap-2 rounded-full bg-red-50 py-2 text-red-600 transition hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300"
							>
								🗑️ Eliminar
							</button>
						</div>
					</article>
				{/each}
			</div>
		</div>

		<!-- Botones flotantes con estilo exotico blur -->
		<div class="fixed right-5 bottom-5 z-50 flex flex-col items-end gap-4">
			<button
				on:click={agregarProducto}
				class="flex transform items-center gap-2 rounded-full bg-pink-500/80 px-5 py-3 text-white shadow-lg backdrop-blur-sm transition hover:scale-105 hover:bg-pink-600/80"
			>
				🎂 Agregar
			</button>
			<button
				on:click={irInicio}
				class="rounded-full bg-white/80 px-4 py-2 text-pink-600 shadow backdrop-blur-sm transition hover:scale-105 dark:bg-gray-800/60 dark:text-white"
			>
				← Inicio
			</button>
		</div>
	</section>

	{#if showConfirm}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
			transition:fly={{ y: 20, duration: 300 }}
		>
			<div
				id="modal-confirm"
				class="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-3xl bg-white p-6 text-center shadow-2xl dark:bg-gray-800"
			>
				<h2 class="text-xl font-semibold text-gray-800 dark:text-white">¿Eliminar producto?</h2>
				<p class="text-gray-600 dark:text-gray-400">
					¿Estás seguro? Esta acción no se puede deshacer.
				</p>
				<div class="mt-4 flex justify-center gap-4">
					<button
						on:click={cancelarEliminacion}
						class="rounded-full border border-gray-300 px-4 py-2 text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
					>
						Cancelar
					</button>
					<button
						on:click={eliminarProducto}
						class="rounded-full bg-gradient-to-r from-red-400 to-red-500 px-4 py-2 font-semibold text-white transition hover:from-red-500 hover:to-red-600"
					>
						Eliminar
					</button>
				</div>
			</div>
		</div>
	{/if}
{/if}

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	.animate-fade-in {
		animation: fade-in 0.8s ease-out both;
	}

	@keyframes card {
		from {
			opacity: 0;
			transform: translateY(12px) scale(0.98);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
	.animate-card {
		animation: card 0.5s ease-out both;
	}

	@keyframes actions {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	.animate-actions {
		animation: actions 0.4s ease-out both;
		animation-delay: 0.1s;
	}

	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.shadow-button {
		box-shadow: 0 -8px 16px -8px rgba(0, 0, 0, 0.1);
	}
	.content-scroll::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 24px;
		background: linear-gradient(to top, rgba(255, 255, 255, 0.7), transparent);
		pointer-events: none;
	}
	html {
		scroll-behavior: smooth;
		font-family: 'Inter', sans-serif;
		overscroll-behavior: none;
	}
</style>
