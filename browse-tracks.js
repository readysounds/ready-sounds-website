// browse-tracks.js — Shared state, HTML rendering helpers, and Supabase track loader
// Depends on: supabase.js (supabaseClient set by browse-init.js)

// ── Shared playback state ────────────────────────────────────────────────────
let currentAudio = null;
let currentPlayButton = null;
let currentTrackId = null;
let cart = [];

// Track data — populated dynamically from Supabase
const trackData = {};

// ── Rendering helpers ────────────────────────────────────────────────────────

// Generate waveform bars (decorative)
function generateWaveformBars() {
    const heights = [40, 55, 70, 82, 90, 95, 90, 82, 74, 65, 56, 48, 55, 68, 80, 88, 92, 85, 75, 62];
    return heights.map(h => `<div class="waveform-bar" style="height: ${h}%"></div>`).join('');
}

// Render a single alternate version
function renderAlternate(alt, track) {
    const domId = alt.id + 100;
    const downloadAttr = (alt.download_album || track.download_album)
        ? `data-download-album="${alt.download_album || track.download_album}"`
        : '';
    return `
    <div class="track-item alternate"
         data-track-id="${domId}"
         data-stream-url="${alt.stream_url}"
         ${downloadAttr}>
        <div class="track-play" onclick="playTrack(event, ${domId})">&#9654;</div>
        <div class="track-artwork">
            <img src="${track.artwork_url || ''}" alt="${escHtml(track.artist)}" onerror="this.style.display='none'; this.parentElement.innerHTML='&#127925;';">
        </div>
        <div class="track-info">
            <span class="track-title">${escHtml(alt.title)}</span>
        </div>
        <div class="expand-arrow"></div>
        <div class="waveform-container" onclick="seekAudio(event, ${domId})" data-track-id="${domId}">
            <div class="waveform-progress" id="progress-${domId}"></div>
            <div class="waveform">${generateWaveformBars()}</div>
        </div>
        <div class="track-genre" data-genre="${escHtml(track.genre || '')}">${escHtml(track.genre || '')}</div>
        <div class="track-moods"></div>
        <div class="track-bpm">${track.bpm || ''}</div>
        <div class="track-duration">${escHtml(alt.duration || '')}</div>
        <div class="track-actions">
            <button class="action-btn action-btn-playlist" onclick="openPlaylistMenu(event, ${domId})">+</button>
            <button class="action-btn action-btn-more" onclick="openMoreMenu(event, ${domId})" title="More">•••</button>
            <button class="action-btn action-btn-download" onclick="downloadTrack(event, ${domId})">&#11015;</button>
        </div>
    </div>`;
}

// Render a track group (main track + alternates)
function renderTrackGroup(track) {
    const alts = (track.alternates || []).slice().sort((a, b) => a.sort_order - b.sort_order);
    const hasAlts = alts.length > 0;
    const versionsCount = alts.length;
    const downloadAttr = track.download_album ? `data-download-album="${track.download_album}"` : '';
    const toggleAttr = hasAlts ? `onclick="toggleAlternates(event, 'alternates-${track.id}')"` : '';
    const moodTags = (track.moods || '').split(',').slice(0, 3).map(m => m.trim()).filter(Boolean);
    const moodsList = moodTags.map(m => `<span class="mood-tag" onclick="filterByMood('${escAttr(m)}');event.stopPropagation()">${escHtml(m)}</span>`).join(', ');

    return `
    <div class="track-group">
        <div class="track-item main-track${hasAlts ? ' has-alternates' : ''}"
             data-track-id="${track.id}"
             data-stream-url="${track.stream_url}"
             data-use-cases="${escAttr(track.use_cases || '')}"
             data-moods="${escAttr(track.moods || '')}"
             data-similar-artists="${escAttr(track.similar_artists || '')}"
             data-energy="${escAttr(track.energy || '')}"
             data-best-moments="${escAttr(track.best_moments || '')}"
             ${downloadAttr}
             ${toggleAttr}>
            <div class="track-play" onclick="playTrack(event, ${track.id})">&#9654;</div>
            <div class="track-artwork">
                <img src="${track.artwork_url || ''}" alt="${escHtml(track.artist)}" onerror="this.style.display='none'; this.parentElement.innerHTML='&#127925;';">
            </div>
            <div class="track-info track-info-clickable" onclick="openTrackPanel(event, ${track.id})">
                <span class="track-title"><span class="track-title-text">${escHtml(track.title)}</span>${hasAlts ? `<span class="versions-badge" onclick="event.stopPropagation(); toggleAlternates(event, 'alternates-${track.id}')">${versionsCount} versions</span>` : ''}</span>
                <span class="track-artist">${escHtml(track.artist)}</span>
            </div>
            <div class="expand-arrow">▾</div>
            <div class="waveform-container" onclick="seekAudio(event, ${track.id})" data-track-id="${track.id}">
                <div class="waveform-progress" id="progress-${track.id}"></div>
                <div class="waveform">${generateWaveformBars()}</div>
            </div>
            <div class="track-genre" data-genre="${escHtml(track.genre || '')}">${escHtml(track.genre || '')}</div>
            <div class="track-moods">${moodsList}</div>
            <div class="track-bpm">${track.bpm || ''}</div>
            <div class="track-duration">${escHtml(track.duration || '')}</div>
            <div class="track-actions">
                <button class="action-btn action-btn-like" data-track-id="${track.id}" onclick="toggleLike(event, ${track.id})">&#129293;</button>
                <button class="action-btn action-btn-primary" onclick="addToCart(event, ${track.id})">cart</button>
                <button class="action-btn action-btn-playlist" onclick="openPlaylistMenu(event, ${track.id})">+</button>
                <button class="action-btn action-btn-more" onclick="openMoreMenu(event, ${track.id})" title="More">•••</button>
                <button class="action-btn action-btn-download" onclick="downloadTrack(event, ${track.id})">&#11015;</button>
            </div>
        </div>
        ${hasAlts ? `<div class="alternates-container" id="alternates-${track.id}">${alts.map(a => renderAlternate(a, track)).join('')}</div>` : ''}
    </div>`;
}

// Escape HTML special characters for text content
function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
// Escape for HTML attribute values
function escAttr(str) {
    return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;');
}

// ── More menu (···) ─────────────────────────────────────────────────────────

function openMoreMenu(event, trackId) {
    event.stopPropagation();
    const btn = event.currentTarget;
    const actionsContainer = btn.closest('.track-actions');

    // Close playlist menu if open
    if (typeof currentPlaylistMenu !== 'undefined' && currentPlaylistMenu) {
        currentPlaylistMenu.remove();
        currentPlaylistMenu = null;
    }

    // Toggle: close if this menu is already open
    const existing = actionsContainer.querySelector('.more-menu');
    if (existing) { existing.remove(); return; }

    // Close any other open more menus
    document.querySelectorAll('.more-menu').forEach(m => m.remove());

    actionsContainer.style.position = 'relative';

    const menu = document.createElement('div');
    menu.className = 'playlist-menu more-menu open';

    const shareItem = document.createElement('div');
    shareItem.className = 'playlist-menu-item';
    shareItem.innerHTML = '&#11014;&nbsp; Share';
    shareItem.onclick = (e) => {
        e.stopPropagation();
        const url = `${window.location.origin}${window.location.pathname}#track-${trackId}`;
        navigator.clipboard.writeText(url).then(() => {
            menu.remove();
            if (typeof showToast === 'function') showToast('Link copied');
        });
    };
    menu.appendChild(shareItem);

    actionsContainer.appendChild(menu);
}

// ── Supabase track loader ────────────────────────────────────────────────────

// Load all tracks from Supabase and render them
async function loadTracksFromSupabase() {
    const container = document.getElementById('trackListContainer');
    if (!container || !supabaseClient) return;

    container.innerHTML = '<div style="text-align:center;padding:60px;color:#888;">Loading tracks...</div>';

    const { data: tracks, error } = await supabaseClient
        .from('tracks')
        .select('*, alternates(*)')
        .eq('is_active', true)
        .order('sort_order');

    if (error || !tracks || tracks.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:60px;color:#888;">Failed to load tracks. Please refresh.</div>';
        console.error('Error loading tracks:', error);
        return;
    }

    // Populate trackData lookup for the player bar
    tracks.forEach(track => {
        trackData[track.id] = {
            title: track.title,
            trackTitle: track.title,
            artist: track.artist,
            duration: track.duration,
            artwork_url: track.artwork_url || '',
            bpm: track.bpm || '',
            genre: track.genre || '',
            moods: track.moods || '',
            use_cases: track.use_cases || '',
            similar_artists: track.similar_artists || '',
            energy: track.energy || '',
            best_moments: track.best_moments || '',
        };
        const alts = track.alternates || [];
        alts.forEach(alt => {
            const domId = alt.id + 100;
            trackData[domId] = {
                title: `${track.title} (${alt.title})`,
                artist: track.artist,
                duration: alt.duration
            };
        });
    });

    // Weighted shuffle: real-estate-friendly moods/genres float to top, randomized each visit
    const PREFERRED_MOODS = new Set(['uplifting', 'positive', 'happy', 'cheerful', 'inspiring', 'hopeful', 'bright', 'optimistic', 'feel-good', 'warm', 'motivating', 'upbeat', 'energetic', 'playful', 'fun', 'light', 'airy', 'joyful']);
    const PREFERRED_GENRES = new Set(['pop', 'indie pop', 'indie', 'indie rock', 'acoustic']);
    const shuffled = tracks.map(track => {
        const moods = (track.moods || '').toLowerCase().split(',').map(m => m.trim());
        const genre = (track.genre || '').toLowerCase();
        let score = Math.random();
        if (moods.some(m => PREFERRED_MOODS.has(m))) score += 1;
        if (PREFERRED_GENRES.has(genre)) score += 0.5;
        return { track, score };
    }).sort((a, b) => b.score - a.score).map(s => s.track);

    // Render track list
    container.innerHTML = shuffled.map(track => renderTrackGroup(track)).join('');

    // Re-apply liked state for logged-in users
    if (typeof loadFavorites === 'function') loadFavorites();

    // Render recently played (now that trackData is populated)
    if (typeof renderRecentlyPlayed === 'function') renderRecentlyPlayed();

    // Handle deep-link to a specific track now that DOM is ready
    if (typeof handleTrackAutoPlay === 'function') handleTrackAutoPlay();
}
