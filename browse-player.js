// browse-player.js — Audio playback, player bar, and modal player for browse.html
// Depends on: browse-tracks.js (currentAudio, currentPlayButton, currentTrackId, trackData)

// ── Volume ────────────────────────────────────────────────────────────────────

function setVolume(val) {
    const v = parseInt(val);
    if (typeof currentAudio !== 'undefined' && currentAudio) currentAudio.volume = v / 100;
    const slider = document.getElementById('volumeSlider');
    if (slider) slider.style.background =
        `linear-gradient(to right, #9c27b0 ${v}%, rgba(255,255,255,0.15) ${v}%)`;
    const icon = document.getElementById('volumeIcon');
    if (icon) icon.textContent = v === 0 ? '🔇' : v < 50 ? '🔉' : '🔊';
}

function toggleMute() {
    const slider = document.getElementById('volumeSlider');
    if (!slider) return;
    if (parseInt(slider.value) > 0) {
        slider._prev = slider.value;
        slider.value = 0;
    } else {
        slider.value = slider._prev || 100;
    }
    setVolume(slider.value);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Build 40 waveform bars in the modal (randomised heights, re-used each play)
function buildModalWaveform() {
    const container = document.getElementById('playerModalWaveformBars');
    if (!container || container.children.length > 0) return;
    const heights = [30,45,60,75,85,70,55,65,80,90,85,70,60,50,40,35,45,60,75,85,80,65,55,45,35,30,40,55,70,80,75,60,50,40,30,35,50,65,75,80];
    container.innerHTML = heights.map(h =>
        `<div class="player-modal-waveform-bar" style="height:${h}%"></div>`
    ).join('');
}

// Update waveform bar colouring based on progress %
function updateModalWaveform(percent) {
    const bars = document.querySelectorAll('.player-modal-waveform-bar');
    const playedCount = Math.round((percent / 100) * bars.length);
    bars.forEach((bar, i) => {
        bar.classList.toggle('played', i < playedCount);
    });
}

// SVG paths for the modal play/pause icon
const SVG_PLAY  = '<path d="M8 5.5v13l11-6.5z"/>';
const SVG_PAUSE = '<rect x="6" y="5" width="4" height="14" rx="1.5"/><rect x="14" y="5" width="4" height="14" rx="1.5"/>';

// Sync all play buttons to a given state
function syncPlayButtons(playing) {
    const desktopBtn = document.getElementById('nowPlayingPlayBtn');
    const miniBtn    = document.getElementById('miniPlayBtn');
    const modalIcon  = document.getElementById('playerModalPlayIcon');
    // Desktop bar and mini bar use text (small size, text is fine)
    if (desktopBtn) desktopBtn.textContent = playing ? '⏸' : '▶';
    if (miniBtn)    miniBtn.textContent    = playing ? '⏸' : '▶';
    // Modal uses sharp SVG
    if (modalIcon) modalIcon.innerHTML = playing ? SVG_PAUSE : SVG_PLAY;
}

// Update Now Playing Bar (desktop + mini + modal)
function updateNowPlayingBar(trackId) {
    const track    = trackData[trackId];
    const playerBar = document.getElementById('nowPlayingBar');

    // Grab artwork from the playing track's DOM element
    const trackEl  = document.querySelector(`.track-item[data-track-id="${trackId}"]`);
    const artSrc   = trackEl ? (trackEl.querySelector('.track-artwork img')?.src || '') : '';

    if (track) {
        // Desktop
        document.getElementById('nowPlayingTitle').textContent  = track.title;
        document.getElementById('nowPlayingArtist').textContent = track.artist || 'readysounds';
        const desktopArt = document.getElementById('nowPlayingArtwork');
        if (desktopArt && artSrc) desktopArt.src = artSrc;

        // Mini bar
        document.getElementById('miniTitle').textContent  = track.title;
        document.getElementById('miniArtist').textContent = track.artist || 'readysounds';
        const miniArt = document.getElementById('miniArtwork');
        if (miniArt && artSrc) miniArt.src = artSrc;

        // Full player modal
        document.getElementById('playerModalTitle').textContent  = track.title;
        document.getElementById('playerModalArtist').textContent = track.artist || 'readysounds';
        const modalArt = document.getElementById('playerModalArtwork');
        if (modalArt && artSrc) modalArt.src = artSrc;

        playerBar.classList.add('visible');
        buildModalWaveform();

        // Update OS / car / lock screen now-playing metadata
        if ('mediaSession' in navigator) {
            const osTitle = track.title.includes(' - ') ? track.title.split(' - ').slice(1).join(' - ') : track.title;
            navigator.mediaSession.metadata = new MediaMetadata({
                title:  osTitle,
                artist: track.artist || 'readysounds',
                album:  'readysounds catalog',
                artwork: artSrc ? [{ src: artSrc }] : []
            });
            navigator.mediaSession.setActionHandler('play',  () => { currentAudio?.play(); syncPlayButtons(true); });
            navigator.mediaSession.setActionHandler('pause', () => { currentAudio?.pause(); syncPlayButtons(false); });
            navigator.mediaSession.setActionHandler('previoustrack', () => playPreviousTrack());
            navigator.mediaSession.setActionHandler('nexttrack',     () => playNextTrackManual());
        }
    }

    syncPlayButtons(currentAudio && !currentAudio.paused);
}

// Toggle play/pause from any button
function togglePlayPause() {
    if (currentAudio) {
        if (currentAudio.paused) {
            currentAudio.play();
            syncPlayButtons(true);
            if (currentPlayButton) currentPlayButton.textContent = '⏸';
        } else {
            currentAudio.pause();
            syncPlayButtons(false);
            if (currentPlayButton) currentPlayButton.textContent = '▶';
        }
    }
}

// Seek from desktop player bar
function seekFromPlayer(event) {
    if (!currentAudio) return;
    const bar  = event.currentTarget;
    const rect = bar.getBoundingClientRect();
    currentAudio.currentTime = ((event.clientX - rect.left) / rect.width) * currentAudio.duration;
}

// Seek from full player modal waveform
function seekFromPlayerModal(event) {
    if (!currentAudio) return;
    const waveform = document.getElementById('playerModalWaveform');
    const rect     = waveform.getBoundingClientRect();
    const percent  = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    currentAudio.currentTime = percent * currentAudio.duration;
}

// Update all progress indicators
function updatePlayerProgress() {
    if (currentAudio && currentTrackId && !isNaN(currentAudio.duration)) {
        const percent = (currentAudio.currentTime / currentAudio.duration) * 100;
        const curFmt  = formatTime(currentAudio.currentTime);
        const durFmt  = formatTime(currentAudio.duration);

        // Desktop bar
        const fill = document.getElementById('nowPlayingProgressFill');
        if (fill) fill.style.width = percent + '%';
        const ct = document.getElementById('nowPlayingCurrentTime');
        if (ct) ct.textContent = curFmt;
        const dt = document.getElementById('nowPlayingDuration');
        if (dt) dt.textContent = durFmt;

        // Modal
        document.getElementById('playerModalCurrentTime').textContent = curFmt;
        document.getElementById('playerModalDuration').textContent    = durFmt;
        updateModalWaveform(percent);
    }
}

// Open / close full player modal
function openPlayerModal() {
    const modal = document.getElementById('playerModal');
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    buildModalWaveform();
}
function closePlayerModal() {
    document.getElementById('playerModal').classList.remove('open');
    document.body.style.overflow = '';
}

// Add-to-playlist from inside the modal
function openPlaylistMenuFromModal() {
    if (currentTrackId) {
        closePlayerModal();
        // Trigger the regular playlist menu for the current track
        const trackEl = document.querySelector(`.track-item[data-track-id="${currentTrackId}"]`);
        const plusBtn = trackEl ? trackEl.querySelector('.action-btn-playlist') : null;
        if (plusBtn) plusBtn.click();
    }
}

// Favourite toggle from modal
function toggleFavoriteFromModal() {
    if (!currentTrackId) return;
    const btn = document.getElementById('playerModalFavBtn');
    const isFav = btn.classList.contains('active');
    if (isFav) {
        btn.classList.remove('active');
        btn.textContent = '♡';
        removeFromFavorites && removeFromFavorites(currentTrackId);
    } else {
        btn.classList.add('active');
        btn.textContent = '♥';
        addToFavorites && addToFavorites(currentTrackId);
    }
}

// Toggle alternates visibility
function toggleAlternates(event, alternatesId) {
    // Don't toggle if clicking on play button, action buttons, or track title (opens panel instead)
    if (event.target.closest('.track-play') || event.target.closest('.action-btn') || event.target.closest('.waveform-container') || event.target.closest('.track-info-clickable')) {
        return;
    }

    const alternatesContainer = document.getElementById(alternatesId);
    const mainTrack = event.currentTarget;

    alternatesContainer.classList.toggle('expanded');
    mainTrack.classList.toggle('expanded');
}

// Seek audio by clicking on waveform
function seekAudio(event, trackId) {
    event.stopPropagation();

    const waveformContainer = event.currentTarget;
    const rect = waveformContainer.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentClicked = clickX / rect.width;

    // If this track is playing, seek to position
    if (currentAudio && currentTrackId === trackId) {
        currentAudio.currentTime = currentAudio.duration * percentClicked;
    } else {
        // Start playing from clicked position
        const trackItem = waveformContainer.closest('.track-item');
        const playButton = trackItem.querySelector('.track-play');
        playTrack({ target: playButton, stopPropagation: () => {} }, trackId);

        // Wait a bit for audio to load, then seek
        setTimeout(() => {
            if (currentAudio && !isNaN(currentAudio.duration)) {
                currentAudio.currentTime = currentAudio.duration * percentClicked;
            }
        }, 100);
    }
}

// Update waveform progress
function updateProgress() {
    if (currentAudio && currentTrackId) {
        const progressBar = document.getElementById(`progress-${currentTrackId}`);
        if (progressBar && !isNaN(currentAudio.duration)) {
            const percent = (currentAudio.currentTime / currentAudio.duration) * 100;
            progressBar.style.width = percent + '%';
        }

        // Update player bar progress
        updatePlayerProgress();
    }
    requestAnimationFrame(updateProgress);
}

// Start progress animation
requestAnimationFrame(updateProgress);

// Manual next track (from button)
function playNextTrackManual() {
    if (currentTrackId) {
        playNextTrack(currentTrackId);
    }
}

// Play previous track
function playPreviousTrack() {
    if (!currentTrackId) return;

    // Get all main tracks (not alternates)
    const mainTracks = Array.from(document.querySelectorAll('.track-item.main-track'));

    // Find current track index
    let currentIndex = -1;
    for (let i = 0; i < mainTracks.length; i++) {
        const trackId = parseInt(mainTracks[i].getAttribute('data-track-id'));
        if (trackId === currentTrackId) {
            currentIndex = i;
            break;
        }
    }

    // Play previous track if exists
    if (currentIndex > 0) {
        const prevTrack = mainTracks[currentIndex - 1];
        const playButton = prevTrack.querySelector('.track-play');

        if (playButton) {
            playButton.click();
        }
    }
}

// Auto-play next track function
function playNextTrack(currentTrackId) {
    // Get all main tracks (not alternates)
    const mainTracks = Array.from(document.querySelectorAll('.track-item.main-track'));

    // Find current track index
    let currentIndex = -1;
    for (let i = 0; i < mainTracks.length; i++) {
        const trackId = parseInt(mainTracks[i].getAttribute('data-track-id'));
        if (trackId === currentTrackId) {
            currentIndex = i;
            break;
        }
    }

    // Play next track if exists
    if (currentIndex >= 0 && currentIndex < mainTracks.length - 1) {
        const nextTrack = mainTracks[currentIndex + 1];
        const nextTrackId = parseInt(nextTrack.getAttribute('data-track-id'));
        const playButton = nextTrack.querySelector('.track-play');

        if (playButton) {
            // Small delay for smooth transition
            setTimeout(() => {
                playButton.click();
            }, 500);
        }
    } else {
        // Reached end of playlist - reset player
        syncPlayButtons(false);
        currentAudio = null;
        currentPlayButton = null;
        currentTrackId = null;
    }
}

// Play track
function playTrack(event, trackId) {
    event.stopPropagation();
    const button = event.target;
    const item = button.closest('.track-item');
    const streamUrl = item.getAttribute('data-stream-url');

    // Toggle play/pause for same track
    if (currentAudio && currentPlayButton === button) {
        if (currentAudio.paused) {
            currentAudio.play();
            button.textContent = '⏸';
        } else {
            currentAudio.pause();
            button.textContent = '▶';
        }
        return;
    }

    // Stop current audio and reset progress
    if (currentAudio) {
        currentAudio.pause();
        if (currentTrackId) {
            const oldProgress = document.getElementById(`progress-${currentTrackId}`);
            if (oldProgress) oldProgress.style.width = '0%';
        }
        currentAudio = null;
    }

    // Reset all buttons
    document.querySelectorAll('.track-play').forEach(btn => btn.textContent = '▶');

    // Play new track
    if (streamUrl) {
        currentAudio = new Audio(streamUrl);
        currentAudio.preload = 'auto';
        currentTrackId = trackId;
        currentPlayButton = button;

        // Buffering feedback
        currentAudio.addEventListener('waiting', () => {
            if (currentPlayButton) currentPlayButton.textContent = '…';
        });
        currentAudio.addEventListener('stalled', () => {
            if (currentPlayButton) currentPlayButton.textContent = '…';
        });
        currentAudio.addEventListener('playing', () => {
            if (currentPlayButton) currentPlayButton.textContent = '⏸';
        });
        currentAudio.addEventListener('error', (e) => {
            console.error('Audio error:', e);
            if (currentPlayButton) currentPlayButton.textContent = '▶';
            syncPlayButtons(false);
        });

        currentAudio.play().catch(err => {
            console.error('Audio playback error:', err);
            button.textContent = '▶';
        });
        button.textContent = '⏸';

        // Update player bar
        updateNowPlayingBar(trackId);

        currentAudio.onended = function() {
            button.textContent = '▶';
            syncPlayButtons(false);
            const progressBar = document.getElementById(`progress-${trackId}`);
            if (progressBar) progressBar.style.width = '0%';
            const fill = document.getElementById('nowPlayingProgressFill');
            if (fill) fill.style.width = '0%';
            updateModalWaveform(0);

            // Auto-play next main track
            playNextTrack(trackId);
        };
    } else {
        alert('Preview not available');
    }
}
