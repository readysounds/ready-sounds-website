// browse-filters.js — Filter state and apply-filters logic for browse.html
// Depends on: browse-tracks.js (applyFilters calls renderTrackGroup indirectly via loadTracksFromSupabase)

// Filter state
let activeFilters = {
    genre: [],
    bpm: [],
    mood: [],
    duration: []
};

// Toggle filter section dropdown
function toggleFilterSection(titleElement) {
    const section = titleElement.parentElement;
    section.classList.toggle('collapsed');
}

// Toggle filter checkbox
function toggleFilter(element, category, value) {
    const checkbox = element.querySelector('.filter-checkbox');
    const isChecked = checkbox.classList.contains('checked');

    if (isChecked) {
        checkbox.classList.remove('checked');
        activeFilters[category] = activeFilters[category].filter(v => v !== value);
    } else {
        checkbox.classList.add('checked');
        activeFilters[category].push(value);
    }

    applyFilters();
}

// Clear all filters
function clearAllFilters() {
    // Reset filter state
    activeFilters = {
        genre: [],
        bpm: [],
        mood: [],
        duration: []
    };

    // Uncheck all checkboxes
    document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
        checkbox.classList.remove('checked');
    });

    applyFilters();
}

// Apply filters to tracks
const SEARCH_STOP_WORDS = new Set(['i','me','my','we','our','you','your','he','him','his','she','her','it','its','they','them','their','what','which','who','am','is','are','was','were','be','been','have','has','had','do','does','did','a','an','the','and','but','if','or','as','of','at','by','for','with','about','to','from','in','on','out','up','how','all','some','no','not','so','than','too','very','can','will','just','now','looking','find','need','want','get','something','song','music','track','sound','audio','good','great','nice','please','im','id','like','video','videos','footage','reel','reels','promo','content','background','scene','scenes','sequence','sequences','montage','montages']);

function getSearchTokens() {
    const raw = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
    return raw.split(/\s+/).filter(t => t.length > 1 && !SEARCH_STOP_WORDS.has(t));
}

function applyFilters() {
    const tokens = getSearchTokens();
    const trackGroups = document.querySelectorAll('.track-group');

    trackGroups.forEach(group => {
        const mainTrack = group.querySelector('.track-item.main-track');
        if (!mainTrack) return;

        // --- Search matching ---
        let searchMatch = true;
        if (tokens.length > 0) {
            const searchableText = [
                mainTrack.querySelector('.track-title')?.textContent || '',
                mainTrack.querySelector('.track-artist')?.textContent || '',
                mainTrack.querySelector('.track-genre')?.textContent || '',
                mainTrack.querySelector('.track-bpm')?.textContent || '',
                mainTrack.getAttribute('data-use-cases') || '',
                mainTrack.getAttribute('data-moods') || '',
                mainTrack.getAttribute('data-similar-artists') || '',
                mainTrack.getAttribute('data-energy') || '',
                mainTrack.getAttribute('data-best-moments') || '',
            ].join(' ').toLowerCase();
            searchMatch = tokens.some(token => searchableText.includes(token));
        }

        // --- Filter matching ---
        let filterMatch = true;
        const trackGenres = mainTrack.querySelector('.track-genre')?.textContent.toLowerCase().split(',').map(g => g.trim()) || [];
        const trackBPM = parseInt(mainTrack.querySelector('.track-bpm')?.textContent) || 0;
        const trackDuration = mainTrack.querySelector('.track-duration')?.textContent || '';

        if (activeFilters.genre.length > 0) {
            filterMatch = filterMatch && activeFilters.genre.some(fg => trackGenres.includes(fg.toLowerCase()));
        }

        if (activeFilters.bpm.length > 0) {
            filterMatch = filterMatch && activeFilters.bpm.some(range => {
                if (range === '60-90') return trackBPM >= 60 && trackBPM <= 90;
                if (range === '90-120') return trackBPM > 90 && trackBPM <= 120;
                if (range === '120-150') return trackBPM > 120 && trackBPM <= 150;
                if (range === '150+') return trackBPM > 150;
                return false;
            });
        }

        if (activeFilters.duration.length > 0) {
            filterMatch = filterMatch && activeFilters.duration.some(range => {
                const [minutes, seconds] = trackDuration.split(':').map(Number);
                const totalSeconds = minutes * 60 + seconds;
                if (range === 'short') return totalSeconds < 60;
                if (range === 'medium') return totalSeconds >= 60 && totalSeconds <= 180;
                if (range === 'long') return totalSeconds > 180;
                return false;
            });
        }

        group.style.display = (searchMatch && filterMatch) ? '' : 'none';
    });
}
