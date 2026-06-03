// browse-playlists.js — Playlist management and mobile track menu for browse.html
// Depends on: browse-tracks.js (supabaseClient via browse-init.js), browse-downloads.js (isUserLoggedIn, showLoginPrompt)

// ── Toast ─────────────────────────────────────────────────────────────────────
let _toastTimer = null;
function showToast(message) {
    let el = document.getElementById('appToast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'appToast';
        el.className = 'toast';
        document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('visible');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('visible'), 2000);
}

// Playlist Management
let userPlaylists = [];  // Will store playlists from Supabase

// Load user playlists from Supabase
async function loadUserPlaylists() {
    try {
        // Check if Supabase is initialized
        if (!supabaseClient) {
            return;
        }

        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            userPlaylists = [];
            return;
        }

        const { data, error } = await supabaseClient
            .from('user_playlists')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading playlists:', error);
            userPlaylists = [];
            return;
        }

        userPlaylists = data || [];
    } catch (err) {
        console.error('Error loading playlists:', err);
        userPlaylists = [];
    }
}

let currentPlaylistMenu = null;
let currentPlaylistTrackId = null;

async function openPlaylistMenu(event, trackId) {
    event.stopPropagation();

    const loggedIn = await isUserLoggedIn();
    if (!loggedIn) {
        showLoginPrompt('create playlists');
        return;
    }

    if (currentPlaylistMenu) { currentPlaylistMenu.remove(); }
    document.querySelectorAll('.more-menu').forEach(m => m.remove());

    // Load playlists + projects in parallel
    await Promise.all([loadUserPlaylists(), loadUserProjects()]);

    currentPlaylistTrackId = trackId;
    const btn = event.target.closest('.action-btn-playlist') || event.target;

    const menu = document.createElement('div');
    menu.className = 'playlist-menu open';

    // ── Playlists section ──────────────────────────────────────────────────────
    const plHeader = document.createElement('div');
    plHeader.className = 'playlist-menu-section-header';
    plHeader.textContent = 'Playlists';
    menu.appendChild(plHeader);

    const createNewPl = document.createElement('div');
    createNewPl.className = 'playlist-menu-item create-new';
    createNewPl.textContent = '+ New Playlist';
    createNewPl.onclick = (e) => { e.stopPropagation(); createNewPlaylist(trackId); };
    menu.appendChild(createNewPl);

    userPlaylists.forEach(playlist => {
        const item = document.createElement('div');
        item.className = 'playlist-menu-item';
        const isIn = (playlist.track_ids || []).includes(trackId);
        item.textContent = isIn ? `✓ ${playlist.name}` : playlist.name;
        if (isIn) item.classList.add('in-playlist');
        item.onclick = (e) => { e.stopPropagation(); toggleTrackInPlaylist(trackId, playlist.id); };
        menu.appendChild(item);
    });

    // ── Divider ────────────────────────────────────────────────────────────────
    const divider = document.createElement('div');
    divider.className = 'playlist-menu-divider';
    menu.appendChild(divider);

    // ── Projects section ───────────────────────────────────────────────────────
    const prHeader = document.createElement('div');
    prHeader.className = 'playlist-menu-section-header';
    prHeader.textContent = 'Projects';
    menu.appendChild(prHeader);

    const createNewPr = document.createElement('div');
    createNewPr.className = 'playlist-menu-item create-new';
    createNewPr.textContent = '+ New Project';
    createNewPr.onclick = (e) => { e.stopPropagation(); openCreateProjectModal(trackId); };
    menu.appendChild(createNewPr);

    if (userProjects.length > 0) {
        // Check which projects already contain this track
        const { data: existingRows } = await supabaseClient
            .from('project_tracks')
            .select('project_id')
            .eq('track_id', trackId)
            .in('project_id', userProjects.map(p => p.id));
        const inProjectIds = new Set((existingRows || []).map(r => r.project_id));

        userProjects.forEach(project => {
            const item = document.createElement('div');
            item.className = 'playlist-menu-item';
            const isIn = inProjectIds.has(project.id);
            item.textContent = isIn ? `✓ ${project.name}` : project.name;
            if (isIn) item.classList.add('in-playlist');
            item.onclick = (e) => { e.stopPropagation(); toggleTrackInProject(trackId, project.id, isIn); };
            menu.appendChild(item);
        });
    }

    menu.style.position = 'fixed';
    menu.style.zIndex = '9999';
    menu.style.visibility = 'hidden';
    document.body.appendChild(menu);
    currentPlaylistMenu = menu;

    requestAnimationFrame(() => {
        const btnRect = btn.getBoundingClientRect();
        const menuWidth = menu.offsetWidth || 200;
        const menuHeight = menu.offsetHeight;
        let left = btnRect.right - menuWidth;
        if (left < 8) left = 8;
        let top = btnRect.top - menuHeight - 8;
        if (top < 8) top = btnRect.bottom + 8;
        menu.style.left = left + 'px';
        menu.style.top = top + 'px';
        menu.style.visibility = '';
    });

    const closeMenu = (e) => {
        if (!menu.contains(e.target) && e.target !== btn) {
            menu.remove();
            currentPlaylistMenu = null;
            document.removeEventListener('click', closeMenu, true);
        }
    };
    document.addEventListener('click', closeMenu, true);
}

let _createPlaylistTrackId = null;

function createNewPlaylist(trackId) {
    _createPlaylistTrackId = trackId;
    const overlay = document.getElementById('createPlaylistOverlay');
    const modal = document.getElementById('createPlaylistModal');
    const input = document.getElementById('createPlaylistInput');
    overlay.classList.add('active');
    modal.classList.add('active');
    input.value = '';
    input.focus();
}

function closeCreatePlaylistModal() {
    document.getElementById('createPlaylistOverlay').classList.remove('active');
    document.getElementById('createPlaylistModal').classList.remove('active');
    _createPlaylistTrackId = null;
}

async function confirmCreatePlaylist() {
    const input = document.getElementById('createPlaylistInput');
    const playlistName = input.value.trim();
    if (!playlistName) { input.focus(); return; }

    closeCreatePlaylistModal();

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        const { error } = await supabaseClient
            .from('user_playlists')
            .insert([{ user_id: user.id, name: playlistName, track_ids: [_createPlaylistTrackId] }])
            .select();

        if (error) { console.error('Error creating playlist:', error); return; }

        if (currentPlaylistMenu) {
            currentPlaylistMenu.remove();
            currentPlaylistMenu = null;
        }

        await loadUserPlaylists();
        showToast(`Playlist "${playlistName}" created`);
    } catch (err) {
        console.error('Error:', err);
    }
}

async function toggleTrackInPlaylist(trackId, playlistId) {
    try {
        // Get the playlist
        const { data: playlist, error: fetchError } = await supabaseClient
            .from('user_playlists')
            .select('*')
            .eq('id', playlistId)
            .single();

        if (fetchError) {
            console.error('Error fetching playlist:', fetchError);
            return;
        }

        let trackIds = playlist.track_ids || [];
        const index = trackIds.indexOf(trackId);

        if (index > -1) {
            // Remove from playlist
            trackIds.splice(index, 1);
        } else {
            // Add to playlist
            trackIds.push(trackId);
        }

        // Update playlist
        const { error: updateError } = await supabaseClient
            .from('user_playlists')
            .update({ track_ids: trackIds })
            .eq('id', playlistId);

        if (updateError) {
            console.error('Error updating playlist:', updateError);
            return;
        }

        const wasAdded = index === -1;

        // Close menu
        if (currentPlaylistMenu) {
            currentPlaylistMenu.remove();
            currentPlaylistMenu = null;
        }

        // Reload playlists
        await loadUserPlaylists();
        showToast(wasAdded ? 'Added to playlist' : 'Removed from playlist');

    } catch (err) {
        console.error('Error:', err);
    }
}

function updatePlaylistButton(trackId, button) {
    // Check if track is in any playlist
    const isInAnyPlaylist = userPlaylists.some(playlist => (playlist.track_ids || []).includes(trackId));
    if (isInAnyPlaylist) {
        button.classList.add('in-playlist');
    } else {
        button.classList.remove('in-playlist');
    }
}

// Close any open menus when clicking outside
document.addEventListener('click', () => {
    if (currentPlaylistMenu) { currentPlaylistMenu.remove(); currentPlaylistMenu = null; }
    document.querySelectorAll('.more-menu').forEach(m => m.remove());
});

