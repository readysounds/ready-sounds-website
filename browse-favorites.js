// browse-favorites.js — Like/favorite state and UI for browse.html
// Depends on: browse-downloads.js (isUserLoggedIn, showLoginPrompt)

// ── Like buttons (legacy liked-tracks list) ──────────────────────────────────

let likedTracks = JSON.parse(localStorage.getItem('likedTracks') || '[]');

async function toggleLike(event, trackId) {
    event.stopPropagation();

    // Check if user is logged in
    const loggedIn = await isUserLoggedIn();
    if (!loggedIn) {
        showLoginPrompt('like tracks');
        return;
    }

    // Use the new favorites system
    toggleFavorite(trackId);
}

// Initialize like buttons on page load
document.addEventListener('DOMContentLoaded', function() {
    likedTracks.forEach(trackId => {
        const buttons = document.querySelectorAll(`[onclick*="toggleLike(event, ${trackId})"]`);
        buttons.forEach(btn => {
            btn.classList.add('liked');
            btn.textContent = '♥';
        });
    });
});

// Close playlist menu when clicking outside
document.addEventListener('click', function(e) {
    if (currentPlaylistMenu && !e.target.closest('.playlist-menu') && !e.target.closest('.action-btn-playlist')) {
        currentPlaylistMenu.remove();
        currentPlaylistMenu = null;
    }
});

// ── Favorites Management ─────────────────────────────────────────────────────

let favorites = [];

function loadFavorites() {
    const saved = localStorage.getItem('readysounds_favorites');
    favorites = saved ? JSON.parse(saved) : [];
    updateHeartIcons();
}

function saveFavorites() {
    localStorage.setItem('readysounds_favorites', JSON.stringify(favorites));
}

function toggleFavorite(trackId) {
    console.log('toggleFavorite called with trackId:', trackId);
    const index = favorites.indexOf(trackId);
    if (index > -1) {
        favorites.splice(index, 1);
        console.log('Removed from favorites:', trackId);
    } else {
        favorites.push(trackId);
        console.log('Added to favorites:', trackId);
    }
    saveFavorites();
    updateHeartIcons();
    console.log('Current favorites:', favorites);
}

function updateHeartIcons() {
    // Update all heart buttons to show filled/unfilled state
    document.querySelectorAll('.action-btn-like').forEach(btn => {
        const trackId = parseInt(btn.getAttribute('data-track-id') || btn.getAttribute('onclick')?.match(/\d+/)?.[0]);
        if (trackId && favorites.includes(trackId)) {
            btn.textContent = '❤️';
            btn.style.color = '#9c27b0';
        } else {
            btn.textContent = '🤍';
            btn.style.color = '';
        }
    });
}

function showFavorites() {
    // Close profile dropdown
    document.getElementById('profileDropdown').classList.remove('active');

    // Hide main content, show favorites view
    document.querySelector('.main-content').style.display = 'none';

    // Create or show favorites view
    let favView = document.getElementById('favoritesView');
    if (!favView) {
        favView = document.createElement('div');
        favView.id = 'favoritesView';
        favView.innerHTML = `
            <div style="max-width: 1400px; margin: 100px auto 40px; padding: 0 24px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px;">
                    <div>
                        <h1 style="font-size: 2.5em; margin-bottom: 8px; background: linear-gradient(135deg, #9c27b0, #4a148c); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">❤️ Favorites</h1>
                        <p style="color: #888; font-size: 1.1em;">Your liked tracks</p>
                    </div>
                    <button onclick="closeFavorites()" style="background: rgba(156, 39, 176, 0.2); border: 1px solid rgba(156, 39, 176, 0.3); color: white; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 1em;">Back to Browse</button>
                </div>
                <div id="favoritesTrackList"></div>
            </div>
        `;
        document.body.appendChild(favView);
    }

    // Populate favorites
    const trackList = favView.querySelector('#favoritesTrackList');
    if (favorites.length === 0) {
        trackList.innerHTML = '<p style="text-align: center; color: #666; font-size: 1.2em; padding: 60px;">You have no favorite songs!</p>';
    } else {
        const trackGroups = document.querySelectorAll('.track-group');
        let html = '<div class="track-list" style="background: rgba(26, 26, 26, 0.5); border-radius: 12px; padding: 20px;">';

        favorites.forEach(favId => {
            trackGroups.forEach(group => {
                const mainTrack = group.querySelector('.track-item.main-track');
                const trackId = mainTrack?.getAttribute('data-track-id');
                if (parseInt(trackId) === favId) {
                    const title = mainTrack.querySelector('.track-title')?.textContent || '';
                    const genre = mainTrack.querySelector('.track-genre')?.textContent || '';
                    const bpm = mainTrack.querySelector('.track-bpm')?.textContent || '';
                    const duration = mainTrack.querySelector('.track-duration')?.textContent || '';
                    const streamUrl = mainTrack.getAttribute('data-stream-url');

                    html += `
                        <div class="track-item" style="margin-bottom: 12px; background: rgba(26, 26, 26, 0.8); padding: 16px; border-radius: 8px; display: flex; align-items: center; gap: 16px;">
                            <button onclick="playTrack(event, ${trackId})" style="width: 40px; height: 40px; border-radius: 50%; background: #9c27b0; border: none; color: white; cursor: pointer; font-size: 18px;">▶</button>
                            <div style="flex: 1;">
                                <div style="font-weight: 600; margin-bottom: 4px;">${escHtml(title)}</div>
                                <div style="color: #888; font-size: 0.9em;">${escHtml(genre)} · ${escHtml(bpm)} BPM · ${escHtml(duration)}</div>
                            </div>
                            <button onclick="toggleFavorite(${trackId})" style="background: none; border: none; cursor: pointer; font-size: 24px;">❤️</button>
                        </div>
                    `;
                }
            });
        });

        html += '</div>';
        trackList.innerHTML = html;
    }

    favView.style.display = 'block';
}

function closeFavorites() {
    document.getElementById('favoritesView')?.remove();
    document.querySelector('.main-content').style.display = 'block';
}
