<script lang="ts">
	import '../app.css';

	let { children, data } = $props();
</script>

<svelte:head>
	<!-- SEO Dinámico desde CMS -->
	<title>{data.cms?.seo?.site_title || 'Victoria Cake | Pastelería Artesanal'}</title>
	<meta
		name="description"
		content={data.cms?.seo?.site_description ||
			'Pasteles personalizados y repostería artesanal para tus momentos más dulces.'}
	/>

	<!-- Open Graph Básico -->
	<meta property="og:title" content={data.cms?.seo?.site_title || 'Victoria Cake'} />
	<meta
		property="og:description"
		content={data.cms?.seo?.site_description || 'Repostería artesanal hecha con amor.'}
	/>
	<meta property="og:type" content="website" />
</svelte:head>

{@render children()}
