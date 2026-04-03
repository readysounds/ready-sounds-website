// browse-recently-played.js — Track recently played history in localStorage

const RP_KEY = 'readysounds_recently_played';
const RP_MAX = 10;

function getRecentlyPlayedIds() {
    try {
        const raw = localStorage.getItem(RP_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function addToRecentlyPlayed(trackId) {
    const ids = getRecentlyPlayedIds().filter(id => id !== trackId);
    ids.unshift(trackId);
    localStorage.setItem(RP_KEY, JSON.stringify(ids.slice(0, RP_MAX)));
    renderRecentlyPlayed();
}

function clearRecentlyPlayed() {
    localStorage.removeItem(RP_KEY);
    renderRecentlyPlayed();
}

function renderRecentlyPlayed() {
    const section = document.getElementById('recentlyPlayedSection');
    if (!section) return;

    const ids = getRecentlyPlayedIds().filter(id => trackData && trackData[id]);

    if (ids.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    const scroll = section.querySelector('.rp-scroll');

    scroll.innerHTML = ids.map(id => {
        const t = trackData[id];
        const artwork = t.artwork_url
            ? `<img src="${t.artwork_url}" alt="" onerror="this.style.display='none'">`
            : `<div class="rp-artwork-fallback">🎵</div>`;
        return `
        <div class="rp-card" onclick="playTrackById(${id})">
            <div class="rp-artwork">
                ${artwork}
                <div class="rp-play-overlay">▶</div>
            </div>
            <div class="rp-title">${escHtml(t.title)}</div>
        </div>`;
    }).join('');
}

// Play a track by ID without a click event (used by recently played cards)
function playTrackById(trackId) {
    const btn = document.querySelector(`.track-play[data-for="${trackId}"]`)
             || document.querySelector(`.track-item[data-track-id="${trackId}"] .track-play`);
    if (btn) {
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
}
