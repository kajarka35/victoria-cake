<script lang="ts">
	import { onMount } from 'svelte';

	let darkMode = false;
	let show = false;

	onMount(() => {
		const prefersDark =
			localStorage.getItem('dark') === 'true' ||
			window.matchMedia('(prefers-color-scheme: dark)').matches;
		darkMode = prefersDark;
		document.documentElement.classList.toggle('dark', darkMode);

		setTimeout(() => {
			show = true;
		}, 200);
	});
	export let data;

	// --- ASSETS COMPARTIDOS CON CMS (SINCRONIZADO) ---
	const ICONS: Record<string, string> = {
		whatsapp:
			'<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>',
		phone:
			'<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
		email:
			'<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
		messenger:
			'<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
		telegram: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>',
		instagram:
			'<rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>',
		facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
		tiktok: '<path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/>',
		youtube:
			'<path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/>',
		twitter:
			'<path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>',
		linkedin:
			'<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',
		map: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
		pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
		store:
			'<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/>',
		motorcycle:
			'<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6h5a1 1 0 0 1 1 1v4"/><path d="M12 9V5a1 1 0 0 0-1-1H7L4.29 7.64"/><path d="M19 14v-3h-6l-2.6 1.8"/><path d="M2.5 17.5H2"/>',
		clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
		calendar:
			'<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
		globe:
			'<circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
		star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
		link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'
	};

	const COLORS: Record<string, string> = {
		green: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
		teal: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
		lime: 'bg-lime-100 text-lime-800 dark:bg-lime-900/40 dark:text-lime-300',
		blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
		cyan: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
		indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
		pink: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
		red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
		orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
		yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
		purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
		slate: 'bg-slate-100 text-slate-800 dark:bg-slate-700/50 dark:text-slate-100',
		gray: 'bg-gray-100 text-gray-900 dark:bg-gray-700/50 dark:text-gray-100'
	};
</script>

<svelte:head>
	<title>Contáctanos | Victoria Cake</title>
</svelte:head>

{#if show}
	<section
		class="animate-fade-in relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-pink-100 via-white to-white px-4 py-20 font-[Inter] text-gray-900 transition-colors duration-500 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 dark:text-white"
	>
		<!-- Background blur elements -->
		<div
			class="absolute -left-10 -top-10 h-96 w-96 animate-pulse rounded-full bg-pink-300 opacity-20 blur-3xl"
		></div>
		<div
			class="absolute bottom-0 right-0 h-72 w-72 animate-pulse rounded-full bg-purple-200 opacity-20 blur-2xl delay-300"
		></div>

		<div
			class="animate-fade-in relative z-10 w-full max-w-2xl space-y-8 rounded-3xl bg-white/60 p-8 shadow-xl backdrop-blur-2xl dark:bg-gray-800/50"
		>
			<h1 class="text-center text-4xl font-extrabold text-pink-600 dark:text-pink-400">
				{data.cms?.contact?.page_title || 'Contáctanos'}
			</h1>
			<p class="text-center text-lg text-gray-700 dark:text-gray-300">
				{data.cms?.contact?.page_subtitle ||
					'Estamos aquí para ayudarte. Puedes contactarnos a través de cualquiera de los siguientes canales:'}
			</p>

			<div class="flex flex-col gap-6">
				{#key data.cms?.contact}
					<!-- LOGICA NUEVA PARA TARJETAS DINÁMICAS -->
					{#if data.cms?.contact?.contact_cards}
						{@const cards = JSON.parse(data.cms.contact.contact_cards || '[]')}
						{#if cards.length > 0}
							{#each cards as card}
								<a
									href={card.link}
									target="_blank"
									class="flex items-center gap-4 rounded-2xl px-5 py-4 shadow transition duration-300 hover:scale-105 hover:shadow-lg {COLORS[
										card.color
									] || COLORS['gray']}"
								>
									<!-- SVG ICON RENDER -->
									<div class="h-6 w-6 shrink-0">
										<svg
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											{@html ICONS[card.icon] || ICONS['link']}
										</svg>
									</div>
									<span class="text-lg font-semibold">{card.label}</span>
								</a>
							{/each}
						{:else}
							<!-- Mostrar mensaje vacío si no hay tarjetas -->
							<p class="text-center italic text-gray-400">
								No hay información de contacto disponible.
							</p>
						{/if}
					{:else}
						<!-- Fallback total solo si no existe la key contact_cards en DB -->
						<p class="text-center text-gray-500">Cargando contactos...</p>
					{/if}
				{/key}
			</div>

			<div class="flex flex-col justify-center gap-4 pt-6 sm:flex-row">
				<a
					href="/"
					class="rounded-full border border-pink-300 bg-white/70 px-6 py-3 text-pink-600 shadow transition duration-300 hover:scale-105 hover:bg-pink-100 dark:border-pink-700 dark:bg-gray-900/40 dark:text-pink-300 dark:hover:bg-pink-800/30"
				>
					{data.cms?.contact?.btn_home || '⬅️ Volver al inicio'}
				</a>
				<a
					href="/catalogo"
					class="transform rounded-full bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-3 text-white shadow-lg transition duration-300 hover:scale-105 hover:from-pink-600 hover:to-pink-700 hover:shadow-xl"
				>
					{data.cms?.contact?.btn_catalog || '🎂 Ver Catálogo'}
				</a>
			</div>
		</div>
	</section>
{/if}

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
			transform: translateY(24px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.animate-fade-in {
		animation: fade-in 0.8s ease-out both;
	}

	html {
		scroll-behavior: smooth;
		font-family: 'Inter', sans-serif;
	}
</style>
