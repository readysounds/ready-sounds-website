export default async function handler(request, context) {
    const url = new URL(request.url);
    const slug = url.searchParams.get('playlist');

    const response = await context.next();

    if (!slug) return response;

    const title = slug
        .split('-')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

    const ogTitle = `${title} — readysounds.`;
    const ogDesc = `Listen to the "${title}" playlist on readysounds. Human-made music for content creators.`;
    const ogImage = 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/images/readysounds-text.png';
    const ogUrl = `https://readysounds.com/playlists.html?playlist=${encodeURIComponent(slug)}`;

    const inject = `
    <meta property="og:type" content="website">
    <meta property="og:url" content="${ogUrl}">
    <meta property="og:title" content="${ogTitle}">
    <meta property="og:description" content="${ogDesc}">
    <meta property="og:image" content="${ogImage}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${ogTitle}">
    <meta name="twitter:description" content="${ogDesc}">
    <meta name="twitter:image" content="${ogImage}">`;

    const html = await response.text();
    const modified = html.replace(
        /<meta property="og:type"[^>]*>[\s\S]*?<meta name="twitter:image"[^>]*>/,
        inject.trim()
    );

    return new Response(modified, {
        status: response.status,
        headers: response.headers,
    });
}

export const config = { path: '/playlists.html' };
