// browse-playlists.js — Playlist management and mobile track menu for browse.html
// Depends on: browse-tracks.js (supabaseClient via browse-init.js), browse-downloads.js (isUserLoggedIn, showLoginPrompt)

// Playlist Management
let userPlaylists = [];  // Will store playlists from Supabase

// Load user playlists from Supabase
async function loadUserPlaylists() {
    try {
        // Check if Supabase is initialized
        if (!supabaseClient) {
            console.log('Supabase not initialized yet, skipping playlist load');
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
        console.log('Loaded user playlists:', userPlaylists);
    } catch (err) {
        console.error('Error loading playlists:', err);
        userPlaylists = [];
    }
}

let currentPlaylistMenu = null;
let currentPlaylistTrackId = null;

async function openPlaylistMenu(event, trackId) {
    event.stopPropagation();

    // Check if user is logged in
    const loggedIn = await isUserLoggedIn();
    if (!loggedIn) {
        showLoginPrompt('create playlists');
        return;
    }

    // Close any open menu
    if (currentPlaylistMenu) {
        currentPlaylistMenu.remove();
    }

    // Load playlists if not loaded
    if (userPlaylists.length === 0) {
        await loadUserPlaylists();
    }

    currentPlaylistTrackId = trackId;
    const button = event.target;
    const actionsContainer = button.closest('.track-actions');

    // Create menu
    const menu = document.createElement('div');
    menu.className = 'playlist-menu open';

    // Create New Playlist option
    const createNew = document.createElement('div');
    createNew.className = 'playlist-menu-item create-new';
    createNew.textContent = '+ Create New Playlist';
    createNew.onclick = (e) => {
        e.stopPropagation();
        createNewPlaylist(trackId);
    };
    menu.appendChild(createNew);

    // List existing user playlists
    userPlaylists.forEach(playlist => {
        const item = document.createElement('div');
        item.className = 'playlist-menu-item';

        const trackIds = playlist.track_ids || [];
        const isInPlaylist = trackIds.includes(trackId);
        if (isInPlaylist) {
            item.classList.add('in-playlist');
            item.textContent = `✓ ${playlist.name}`;
        } else {
            item.textContent = playlist.name;
        }

        item.onclick = (e) => {
            e.stopPropagation();
            toggleTrackInPlaylist(trackId, playlist.id);
        };
        menu.appendChild(item);
    });

    // Show message if no playlists
    if (userPlaylists.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'playlist-menu-item';
        emptyMsg.style.color = '#888';
        emptyMsg.style.fontStyle = 'italic';
        emptyMsg.textContent = 'No playlists yet';
        menu.appendChild(emptyMsg);
    }

    actionsContainer.style.position = 'relative';
    actionsContainer.appendChild(menu);
    currentPlaylistMenu = menu;
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

        // Close menu
        if (currentPlaylistMenu) {
            currentPlaylistMenu.remove();
            currentPlaylistMenu = null;
        }

        // Reload playlists
        await loadUserPlaylists();

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

