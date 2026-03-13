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

async function createNewPlaylist(trackId) {
    const name = prompt('Enter playlist name:');
    if (!name || !name.trim()) return;

    const playlistName = name.trim();

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            alert('Please log in to create playlists');
            return;
        }

        // Create playlist in Supabase
        const { data, error } = await supabaseClient
            .from('user_playlists')
            .insert([
                {
                    user_id: user.id,
                    name: playlistName,
                    track_ids: [trackId]
                }
            ])
            .select();

        if (error) {
            console.error('Error creating playlist:', error);
            alert('Failed to create playlist');
            return;
        }

        // Close menu
        if (currentPlaylistMenu) {
            currentPlaylistMenu.remove();
            currentPlaylistMenu = null;
        }

        // Reload user playlists
        await loadUserPlaylists();

        alert(`Created playlist "${playlistName}" and added track!`);
    } catch (err) {
        console.error('Error:', err);
        alert('Failed to create playlist');
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
    const isInAnyPlaylist = Object.values(playlists).some(tracks => tracks.includes(trackId));
    if (isInAnyPlaylist) {
        button.classList.add('in-playlist');
    } else {
        button.classList.remove('in-playlist');
    }
}

// Initialize playlist buttons on page load
document.addEventListener('DOMContentLoaded', function() {
    Object.values(playlists).forEach(tracks => {
        tracks.forEach(trackId => {
            const buttons = document.querySelectorAll(`[onclick*="openPlaylistMenu(event, ${trackId})"]`);
            buttons.forEach(btn => updatePlaylistButton(trackId, btn));
        });
    });
});

// Mobile track menu (more button)
function openTrackMenu(event, trackId) {
    event.stopPropagation();

    // For now, just show an alert with options
    // TODO: Create a proper bottom sheet menu
    const options = [
        'Like',
        'Add to Playlist',
        'Download'
    ];

    // Simple implementation - you can enhance this with a proper modal later
    const choice = prompt('Choose an action:\n\n1. Like\n2. Add to Playlist\n3. Download\n\nEnter number (1-3):');

    if (choice === '1') {
        toggleLike(event, trackId);
    } else if (choice === '2') {
        openPlaylistMenu(event, trackId);
    } else if (choice === '3') {
        downloadTrack(event, trackId);
    }
}
