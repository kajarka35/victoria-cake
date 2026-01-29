<script lang="ts">
	// import { fly } from 'svelte/transition';
	import { onMount } from 'svelte';
	import ProductoCard from './ProductoCard.svelte';
	import ProductoModal from './ProductoModal.svelte';
	import { goto } from '$app/navigation';

	interface Producto {
		id: number;
		nombre: string;
		descripcion: string;
		precio: string;
		imagen: string;
		ingredientes?: string;
		tamano?: string;
		galeria?: string[];
	}

	export let data;
	const productos: Producto[] = data.productos;

	let show = false;
	let activeCard: number | null = null;
	let modalProducto: Producto | null = null;
	let search = '';
	let cargando = true;
	let enviado = false;

	const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

	onMount(() => {
		(async () => {
			await delay(600);
			cargando = false;
			show = true;
		})();

		const cerrarConEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape') cerrarModal();
		};
		window.addEventListener('keydown', cerrarConEscape);

		return () => {
			window.removeEventListener('keydown', cerrarConEscape);
		};
	});

	function abrirModal(producto: Producto) {
		modalProducto = producto;
		document.body.style.overflow = 'hidden';
	}

	function cerrarModal() {
		modalProducto = null;
		document.body.style.overflow = '';
	}

	function toggleCard(id: number) {
		activeCard = activeCard === id ? null : id;
	}

	async function pedirPorWhatsApp(producto: Producto) {
		enviado = true;
		await delay(500);
		enviado = false;
		const mensaje = `¡Hola Victoria Cake! \ud83c\udf3d\n\nEstoy interesado/a en el siguiente producto:\n\n*${producto.nombre}*\nPrecio: ${producto.precio}\n\n¿Podrías darme más información y disponibilidad? ¡Gracias! \ud83d\udc96`;
		const url = `https://wa.me/573126589467?text=${encodeURIComponent(mensaje)}`;
		window.open(url, '_blank', 'noopener');
	}

	function irInicio() {
		goto('/');
	}

	function irContacto() {
		goto('/contacto');
	}

	$: productosFiltrados = productos.filter((p) =>
		p.nombre.toLowerCase().includes(search.toLowerCase())
	);
</script>

<svelte:head>
	<title>Catálogo | Victoria Cake</title>
	<meta
		name="description"
		content="Explora nuestros pasteles artesanales únicos, con sabor, diseño y calidad en cada detalle."
	/>
</svelte:head>

{#if show}
	<div
		class="sticky top-0 z-[100] border-b border-pink-200 bg-white/90 px-4 py-4 shadow-sm backdrop-blur-md dark:border-pink-500 dark:bg-gray-900/90"
	>
		<div class="mx-auto flex max-w-7xl justify-center">
			<input
				type="text"
				placeholder="Buscar pastel..."
				class="w-full max-w-md rounded-2xl border border-pink-300 px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-400 dark:bg-gray-900 dark:text-white"
				bind:value={search}
			/>
		</div>
	</div>

	<section
		class="animate-fade-in relative bg-gradient-to-b from-pink-100 via-white to-white dark:from-gray-900 dark:via-gray-950 dark:to-gray-900"
	>
		<div
			class="absolute -left-10 -top-10 h-96 w-96 animate-pulse rounded-full bg-pink-300 opacity-20 blur-3xl"
		></div>
		<div
			class="absolute bottom-0 right-0 h-72 w-72 animate-pulse rounded-full bg-purple-200 opacity-20 blur-2xl delay-300"
		></div>

		<div class="container mx-auto px-4 py-12 sm:px-6 sm:py-16 lg:px-12 lg:py-20">
			<div class="relative z-10 space-y-6 text-center">
				<h2
					class="animate-fade-in text-3xl font-extrabold tracking-tight text-pink-600 drop-shadow-md sm:text-4xl lg:text-5xl dark:text-pink-400"
				>
					{data.cms?.title || 'Nuestros Productos'}
				</h2>
				<p
					class="animate-fade-in mx-auto max-w-2xl text-base text-gray-600 delay-200 sm:text-lg dark:text-gray-300"
				>
					{data.cms?.subtitle ||
						'Descubre el arte pastelero: diseño, sabor y dedicación en cada creación.'}
				</p>
			</div>

			<div
				class="mt-14 grid grid-cols-[repeat(auto-fit,_minmax(260px,_1fr))] justify-items-center gap-6"
			>
				{#if cargando}
					<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
					{#each Array(6) as _, i (i)}
						<div
							class="h-80 w-full animate-pulse rounded-2xl bg-white/70 dark:bg-gray-800/60"
						></div>
					{/each}
				{:else if productosFiltrados.length === 0}
					<p class="col-span-full mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
						No se encontraron productos.
					</p>
				{:else}
					{#each productosFiltrados as producto, i (producto.id)}
						<div class="fade-up w-full" style="--delay: {i * 70}ms">
							<ProductoCard
								{producto}
								{activeCard}
								index={i}
								on:abrirModal={() => abrirModal(producto)}
								on:pedirWhatsApp={() => pedirPorWhatsApp(producto)}
								on:toggle={() => toggleCard(producto.id)}
							/>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	</section>
{/if}

<div class="pointer-events-auto fixed bottom-5 right-5 z-[999] flex flex-col items-end gap-3">
	<button
		on:click={irInicio}
		class="rounded-full border border-pink-200 bg-white/60 p-3 text-pink-600 shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-105 dark:border-pink-400 dark:bg-gray-800/60 dark:text-white"
		aria-label="Inicio"
	>
		🏠
	</button>
	<button
		on:click={irContacto}
		class="rounded-full bg-pink-500/90 p-3 text-white shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-pink-600"
		aria-label="Contáctanos"
	>
		📞
	</button>
</div>

{#if modalProducto}
	<ProductoModal
		producto={modalProducto}
		on:cerrar={cerrarModal}
		on:pedirWhatsApp={() => modalProducto && pedirPorWhatsApp(modalProducto)}
	/>
{/if}

{#if enviado}
	<div
		class="animate-fade-in fixed bottom-4 right-4 z-50 rounded-xl bg-pink-500 px-4 py-2 text-sm text-white shadow-lg"
	>
		Abriendo WhatsApp...
	</div>
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

	.fade-up {
		opacity: 0;
		transform: translateY(20px);
		animation: fadeUp 0.5s ease-out forwards;
		animation-delay: var(--delay, 0ms);
	}

	@keyframes fadeUp {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	html {
		scroll-behavior: smooth;
		overscroll-behavior: none;
	}

	body {
		overflow-x: hidden;
	}
</style>
