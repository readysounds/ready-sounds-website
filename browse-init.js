// browse-init.js — UI helpers, auth init, and page bootstrap for browse.html
// Loaded last; sets supabaseClient used by all other browse-*.js modules.
// Depends on: supabase.js, auth.js, browse-tracks.js, browse-playlists.js,
//             browse-downloads.js, browse-favorites.js

// ── Misc UI helpers ──────────────────────────────────────────────────────────

// Search functionality — delegates to applyFilters() which handles both search + sidebar filters together
function searchTracks() {
    applyFilters();
}

function togglePanelSection(section) {
    const submenu = document.getElementById(section + 'Submenu');
    const btn = document.getElementById(section + 'Btn');
    submenu.classList.toggle('open');
    btn.classList.toggle('open');
}

// Update mobile panel auth state to match desktop
function updateMobilePanelAuth(isLoggedIn) {
    const accountBtn = document.getElementById('accountBtn');
    const authBtns = document.getElementById('mobilePanelAuthBtns');
    if (accountBtn) accountBtn.style.display = isLoggedIn ? 'flex' : 'none';
    if (authBtns) authBtns.style.display = isLoggedIn ? 'none' : 'flex';
}

// Mobile filter modal functions
function openFilterModal() {
    const modal = document.getElementById('filterModal');
    const overlay = document.getElementById('filterModalOverlay');
    const modalBody = document.getElementById('filterModalBody');

    // Clone filter content from sidebar to modal (only once)
    if (modalBody.children.length === 0) {
        const filterPanel = document.querySelector('.filter-panel');
        const clone = filterPanel.cloneNode(true);
        // Remove the clear button from cloned content (we have it in footer)
        const clearBtn = clone.querySelector('.clear-filters');
        if (clearBtn) clearBtn.remove();
        const filterHeader = clone.querySelector('.filter-header');
        if (filterHeader) filterHeader.remove();
        modalBody.appendChild(clone);
    }

    overlay.classList.add('visible');
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeFilterModal() {
    const modal = document.getElementById('filterModal');
    const overlay = document.getElementById('filterModalOverlay');

    modal.classList.remove('open');
    overlay.classList.remove('visible');
    document.body.style.overflow = 'auto';
}

// Toggle sidebar on mobile (legacy - now using modal)
function toggleSidebar() {
    openFilterModal();
}

// ── Global Supabase client ───────────────────────────────────────────────────
// Declared here so all browse-*.js modules share the same reference.
// Set during initAuth() below.
let supabaseClient = null;

// ── OAuth callback handler ───────────────────────────────────────────────────

async function handleOAuthCallback() {
    const hash = window.location.hash;

    if (!hash || !hash.includes('access_token')) {
        return false;
    }

    // Parse hash parameters
    const params = new URLSearchParams(hash.substring(1));
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');

    if (!access_token || !refresh_token) {
        console.error('❌ Missing tokens in OAuth callback');
        console.error('Access token:', access_token ? 'present' : 'missing');
        console.error('Refresh token:', refresh_token ? 'present' : 'missing');
        return false;
    }

    try {
        const supabaseClient = window.RS.getClient();

        const { data, error } = await supabaseClient.auth.setSession({
            access_token: access_token,
            refresh_token: refresh_token
        });

        if (error) {
            console.error('❌ Error setting session:', error);
            alert('Authentication error: ' + error.message);
            return false;
        }

        // Clean up URL
        window.history.replaceState(null, '', window.location.pathname);

        // Force a UI update
        await new Promise(resolve => setTimeout(resolve, 100));

        return true;
    } catch (err) {
        console.error('❌ OAuth callback error:', err);
        alert('OAuth error: ' + err.message);
        return false;
    }
}

// ── Auth init ────────────────────────────────────────────────────────────────

async function initAuth() {
    // Handle OAuth callback then get shared client
    supabaseClient = await window.RS.waitForClient();
    await handleOAuthCallback();

    // Load tracks and featured playlists from database
    loadTracksFromSupabase();
    loadFeaturedPlaylists();

    // Check authentication status
    async function checkAuth() {
        const { data: { session } } = await supabaseClient.auth.getSession();

        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        const authButtons = document.getElementById('authButtons');
        const profileContainer = document.getElementById('profileContainer');
        const profileInitial = document.getElementById('profileInitial');

        if (session && session.user) {
            // User is logged in - show profile dropdown
            if (authButtons) authButtons.style.display = 'none';
            if (profileContainer) profileContainer.style.display = 'flex';
            updateMobilePanelAuth(true);

            // Set profile initial (first letter of email)
            if (profileInitial && session.user.email) {
                profileInitial.textContent = session.user.email.charAt(0).toUpperCase();
            }

            // Load favorites from localStorage
            loadFavorites();

            // Load user playlists from Supabase
            await loadUserPlaylists();

            // Check subscription status and hide cart buttons if active
            const hasSubscription = await hasActiveSubscription();
            if (hasSubscription) {
                // Hide all cart buttons
                const cartButtons = document.querySelectorAll('.action-btn-primary');
                cartButtons.forEach(btn => {
                    btn.style.display = 'none';
                });
            }
        } else {
            // User is not logged in - show login buttons
            if (authButtons) authButtons.style.display = 'flex';
            if (profileContainer) profileContainer.style.display = 'none';
            updateMobilePanelAuth(false);
        }
    }

    // Check auth on page load
    checkAuth();

    // Listen for auth changes
    supabaseClient.auth.onAuthStateChange((event, session) => {
        // Handle all auth state changes including INITIAL_SESSION (after OAuth redirect)
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
            checkAuth();
        }
    });
}

// ── Track auto-play from hash ────────────────────────────────────────────────

function handleTrackAutoPlay() {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#track-')) {
        const trackId = parseInt(hash.replace('#track-', ''));
        if (trackId) {
            // Wait a moment for DOM to be ready
            setTimeout(() => {
                const trackButton = document.querySelector(`[data-track-id="${trackId}"]`);
                if (trackButton) {
                    // Scroll to track
                    trackButton.closest('.track-group')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Play the track
                    playTrack(null, trackId);
                }
            }, 500);
        }
    }
}

// ── Track Detail Panel ───────────────────────────────────────────────────────

function openTrackPanel(event, trackId) {
    event.stopPropagation();
    const data = trackData[trackId];
    if (!data) return;

    // Artwork
    const artworkEl = document.getElementById('trackPanelArtwork');
    const existing = artworkEl.querySelector('img, .track-panel-artwork-placeholder');
    if (existing) existing.remove();
    if (data.artwork_url) {
        const img = document.createElement('img');
        img.src = data.artwork_url;
        img.alt = data.artist;
        artworkEl.insertBefore(img, artworkEl.firstChild);
    } else {
        const ph = document.createElement('div');
        ph.className = 'track-panel-artwork-placeholder';
        ph.textContent = '🎵';
        artworkEl.insertBefore(ph, artworkEl.firstChild);
    }

    // Helper: render a metadata section
    function metaTags(label, value, fullWidth) {
        if (!value) return '';
        const tags = value.split(',').map(t => t.trim()).filter(Boolean);
        if (!tags.length) return '';
        const tagsHtml = tags.map(t => `<span class="track-panel-tag">${escHtml(t)}</span>`).join('');
        const cls = fullWidth ? 'track-panel-meta-full' : '';
        return `<div class="${cls}"><div class="track-panel-label">${label}</div><div class="track-panel-tags">${tagsHtml}</div></div>`;
    }
    function metaValue(label, value) {
        if (!value) return '';
        return `<div><div class="track-panel-label">${label}</div><div class="track-panel-value">${escHtml(value)}</div></div>`;
    }

    const specs = [data.bpm ? `${data.bpm} BPM` : null, data.duration].filter(Boolean).join(' · ');

    document.getElementById('trackPanelBody').innerHTML = `
        <h2 class="track-panel-title">${escHtml(data.trackTitle)}</h2>
        <div class="track-panel-artist">${escHtml(data.artist)}</div>
        ${specs ? `<div class="track-panel-specs">${escHtml(specs)}</div>` : ''}
        <div class="track-panel-actions">
            <button class="track-panel-btn-primary" onclick="downloadTrack(event, ${trackId})">↓ Download</button>
            <button class="track-panel-btn-secondary" onclick="addToCart(event, ${trackId})">Buy License</button>
        </div>
        <hr class="track-panel-divider">
        <div class="track-panel-meta-grid">
            ${metaTags('Moods', data.moods)}
            ${metaTags('Genre', data.genre)}
            ${metaValue('Energy', data.energy)}
        </div>
        ${metaTags('Use Cases', data.use_cases, true)}
        ${metaTags('Best Moments', data.best_moments, true)}
        ${metaTags('Similar Artists', data.similar_artists, true)}
    `;

    document.getElementById('trackPanelOverlay').classList.add('active');
    document.getElementById('trackPanel').classList.add('active');
    document.addEventListener('keydown', handlePanelEsc);
}

function closeTrackPanel() {
    document.getElementById('trackPanelOverlay').classList.remove('active');
    document.getElementById('trackPanel').classList.remove('active');
    document.removeEventListener('keydown', handlePanelEsc);
}

function handlePanelEsc(e) {
    if (e.key === 'Escape') closeTrackPanel();
}

// ── Featured Playlists ───────────────────────────────────────────────────────

async function loadFeaturedPlaylists() {
    const section = document.getElementById('featuredPlaylistsSection');
    const scroll = document.getElementById('featuredPlaylistsScroll');
    if (!section || !scroll || !supabaseClient) return;

    const { data: playlists, error } = await supabaseClient
        .from('curated_playlists')
        .select('slug, name, cover_url')
        .eq('is_active', true)
        .order('sort_order')
        .limit(12);

    if (error || !playlists || playlists.length === 0) return;

    scroll.innerHTML = playlists.map(p => {
        const img = p.cover_url
            ? `<img src="${p.cover_url}" alt="${p.name.replace(/"/g, '&quot;')}">`
            : `<div class="fp-placeholder">🎵</div>`;
        return `<a href="playlists.html#${p.slug}" class="featured-playlist-card">${img}<div class="fp-name">${p.name}</div></a>`;
    }).join('');

    section.style.display = 'block';
}

// ── Bootstrap ────────────────────────────────────────────────────────────────

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initAuth();
        handleTrackAutoPlay();
    });
} else {
    initAuth();
    handleTrackAutoPlay();
}
