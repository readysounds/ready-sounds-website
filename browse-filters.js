// browse-filters.js — Filter state and apply-filters logic for browse.html
// Depends on: browse-tracks.js (applyFilters calls renderTrackGroup indirectly via loadTracksFromSupabase)

// Filter state
let activeFilters = {
    genre: [],
    bpm: [],
    mood: [],
    duration: []
};

// Toggle sidebar on tablet
function toggleTabletSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const btn = document.getElementById('tabletFilterToggle');
    const isOpen = sidebar.classList.toggle('tablet-open');
    btn.classList.toggle('active', isOpen);
    btn.querySelector('span').textContent = isOpen ? '▲' : '▼';
}

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
    renderFilterChips();
}

// Filter by mood from a track row tag click
function filterByMood(mood) {
    const normalized = mood.toLowerCase().trim();
    if (!activeFilters.mood.includes(normalized)) {
        activeFilters.mood.push(normalized);
        const sidebarOption = document.querySelector(`.filter-option[onclick*="'mood', '${normalized}'"]`);
        if (sidebarOption) sidebarOption.querySelector('.filter-checkbox')?.classList.add('checked');
    }
    applyFilters();
}

// Genre buckets: maps filter value → all track genre strings it should match
const GENRE_GROUPS = {
    'electronic': ['electronic', 'edm', 'electro', 'house', 'tech', 'progressive', 'nu wave', 'future bass', 'synth pop', 'synth punk', 'dub'],
    'dance':      ['dance'],
    'pop':        ['pop', 'indie pop', 'funk pop'],
    'indie':      ['indie', 'indie pop', 'indie rock'],
    'funk':       ['funk', 'funk rock', 'funk pop'],
    'hip hop':    ['hip hop', 'trap', 'afro beats'],
    'lo-fi':      ['lofi', 'lo-fi'],
};

// Label maps for chips display
const FILTER_LABELS = {
    genre: { electronic: 'Electronic', dance: 'Dance', pop: 'Pop', indie: 'Indie', funk: 'Funk', 'hip hop': 'Hip Hop', 'lo-fi': 'Lo-Fi' },
    bpm:   { '60-90': '60–90 BPM', '90-120': '90–120 BPM', '120-150': '120–150 BPM', '150+': '150+ BPM' },
    mood:  {},  // capitalized dynamically
    duration: { short: 'Short', medium: 'Medium', long: 'Long' }
};

function renderFilterChips() {
    const bar = document.getElementById('activeFiltersBar');
    if (!bar) return;

    const allActive = Object.entries(activeFilters).flatMap(([cat, values]) =>
        values.map(val => ({ cat, val }))
    );

    if (allActive.length === 0) {
        bar.style.display = 'none';
        bar.innerHTML = '';
        return;
    }

    bar.style.display = 'flex';
    bar.innerHTML = allActive.map(({ cat, val }) => {
        const label = FILTER_LABELS[cat]?.[val] || (val.charAt(0).toUpperCase() + val.slice(1));
        return `<span class="filter-chip">
            ${label}
            <span class="filter-chip-remove" onclick="removeFilterChip('${cat}','${val}')" title="Remove">×</span>
        </span>`;
    }).join('') + `<span class="filter-chips-clear" onclick="clearAllFilters()">Clear all</span>`;
}

function removeFilterChip(category, value) {
    activeFilters[category] = activeFilters[category].filter(v => v !== value);
    // Uncheck the corresponding sidebar checkbox
    const option = document.querySelector(`.filter-option[onclick*="'${category}', '${value}'"]`);
    if (option) option.querySelector('.filter-checkbox')?.classList.remove('checked');
    // Also uncheck in the mobile filter modal clone
    const modalOption = document.querySelector(`#filterModalBody .filter-option[onclick*="'${category}', '${value}'"]`);
    if (modalOption) modalOption.querySelector('.filter-checkbox')?.classList.remove('checked');
    applyFilters();
    renderFilterChips();
}

// Apply filters to tracks
const SEARCH_STOP_WORDS = new Set(['i','me','my','we','our','you','your','he','him','his','she','her','it','its','they','them','their','what','which','who','am','is','are','was','were','be','been','have','has','had','do','does','did','a','an','the','and','but','if','or','as','of','at','by','for','with','about','to','from','in','on','out','up','how','all','some','no','not','so','than','too','very','can','will','just','now','looking','find','need','want','get','something','song','music','track','sound','audio','good','great','nice','please','im','id','like','video','videos','footage','reel','reels','promo','content','background','scene','scenes','sequence','sequences','montage','montages']);

// Synonym map: query word → additional terms to also match against
const SEARCH_SYNONYMS = {
    'uplifting':  ['uplifting','inspiring','positive','happy','hopeful','energetic','motivational','triumphant'],
    'upbeat':     ['upbeat','energetic','positive','happy','fun','lively','bouncy'],
    'fun':        ['fun','playful','upbeat','energetic','lively','cheerful','bouncy','quirky'],
    'happy':      ['happy','joyful','cheerful','uplifting','positive','fun','upbeat'],
    'sad':        ['sad','melancholic','emotional','somber','reflective','nostalgic','bittersweet'],
    'calm':       ['calm','peaceful','relaxing','chill','ambient','serene','gentle','soft'],
    'relaxing':   ['relaxing','calm','peaceful','ambient','chill','serene','gentle'],
    'energetic':  ['energetic','upbeat','powerful','driving','intense','dynamic','epic'],
    'epic':       ['epic','cinematic','powerful','grand','triumphant','dramatic','orchestral'],
    'cinematic':  ['cinematic','epic','dramatic','orchestral','film','atmospheric','score'],
    'dramatic':   ['dramatic','cinematic','intense','powerful','emotional','epic','tense'],
    'romantic':   ['romantic','love','tender','intimate','warm','soft','emotional'],
    'dark':       ['dark','moody','intense','tense','mysterious','ominous','atmospheric'],
    'corporate':  ['corporate','business','professional','motivational','inspiring','clean'],
    'inspiring':  ['inspiring','motivational','uplifting','positive','hopeful','empowering'],
    'motivational':['motivational','inspiring','uplifting','energetic','powerful','driving'],
    'school':     ['school','kids','children','family','educational','fun','playful','cheerful'],
    'kids':       ['kids','children','family','school','playful','fun','cheerful','whimsical'],
    'workout':    ['workout','energetic','driving','intense','powerful','upbeat','pumping'],
    'travel':     ['travel','adventure','exploration','world','uplifting','inspiring','cinematic'],
    'summer':     ['summer','sunny','bright','warm','fun','upbeat','tropical','beach'],
    'christmas':  ['christmas','holiday','festive','winter','warm','joyful','celebratory'],
    'wedding':    ['wedding','romantic','love','emotional','tender','beautiful','elegant'],
    'documentary':['documentary','cinematic','thoughtful','atmospheric','emotional','ambient'],
    'sport':      ['sport','sports','energetic','driving','intense','powerful','action'],
    'fashion':    ['fashion','sleek','cool','modern','stylish','electronic','urban'],
    'cooking':    ['cooking','food','warm','fun','upbeat','playful','lighthearted'],
    'tech':       ['tech','technology','electronic','modern','clean','innovation','digital'],
    'nature':     ['nature','organic','peaceful','ambient','atmospheric','earthy','calm'],
};

// Expand a token into itself plus any synonyms
function expandToken(token) {
    return SEARCH_SYNONYMS[token] || [token];
}

function getSearchTokens() {
    const raw = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
    return raw.split(/\s+/).filter(t => t.length > 1 && !SEARCH_STOP_WORDS.has(t));
}

// Score a track against search tokens. Returns 0 if required tokens don't match.
function scoreTrackSearch(mainTrack, tokens) {
    if (tokens.length === 0) return 1;

    // Build weighted field strings — moods/use-cases/energy count more than title/genre
    const highWeight = [
        mainTrack.getAttribute('data-moods') || '',
        mainTrack.getAttribute('data-use-cases') || '',
        mainTrack.getAttribute('data-energy') || '',
        mainTrack.getAttribute('data-best-moments') || '',
    ].join(' ').toLowerCase();

    const lowWeight = [
        mainTrack.querySelector('.track-title')?.textContent || '',
        mainTrack.querySelector('.track-artist')?.textContent || '',
        mainTrack.querySelector('.track-genre')?.textContent || '',
        mainTrack.getAttribute('data-similar-artists') || '',
    ].join(' ').toLowerCase();

    const allText = highWeight + ' ' + lowWeight;

    let score = 0;
    let allMatch = true;

    for (const token of tokens) {
        const expanded = expandToken(token);
        const matchesHigh = expanded.some(t => highWeight.includes(t));
        const matchesLow  = expanded.some(t => lowWeight.includes(t));
        const matches = matchesHigh || matchesLow;

        if (!matches) { allMatch = false; break; }
        score += matchesHigh ? 2 : 1;
    }

    return allMatch ? score : 0;
}

function applyFilters() {
    const tokens = getSearchTokens();
    const trackGroups = Array.from(document.querySelectorAll('.track-group'));
    const container = trackGroups[0]?.parentElement;

    // Score and filter
    const scored = trackGroups.map(group => {
        const mainTrack = group.querySelector('.track-item.main-track');
        if (!mainTrack) return { group, score: 0, filterMatch: false };

        const searchScore = scoreTrackSearch(mainTrack, tokens);
        const searchMatch = tokens.length === 0 || searchScore > 0;

        // --- Filter matching ---
        let filterMatch = true;
        const trackGenres = mainTrack.querySelector('.track-genre')?.textContent?.toLowerCase().split(',').map(g => g.trim()) || [];
        const trackBPM = parseInt(mainTrack.querySelector('.track-bpm')?.textContent) || 0;
        const trackDuration = mainTrack.querySelector('.track-duration')?.textContent || '';

        if (activeFilters.genre.length > 0) {
            filterMatch = filterMatch && activeFilters.genre.some(fg => {
                const genreGroup = GENRE_GROUPS[fg.toLowerCase()] || [fg.toLowerCase()];
                return trackGenres.some(tg => genreGroup.includes(tg));
            });
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

        if (activeFilters.mood.length > 0) {
            const trackMoods = (mainTrack.getAttribute('data-moods') || '').toLowerCase().split(',').map(m => m.trim());
            filterMatch = filterMatch && activeFilters.mood.some(fm => trackMoods.includes(fm.toLowerCase()));
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

        return { group, score: searchScore, searchMatch, filterMatch };
    });

    // Sort by score descending when searching, then show/hide and reorder
    if (tokens.length > 0 && container) {
        const visible = scored.filter(s => s.searchMatch && s.filterMatch).sort((a, b) => b.score - a.score);
        const hidden  = scored.filter(s => !s.searchMatch || !s.filterMatch);
        [...visible, ...hidden].forEach(s => container.appendChild(s.group));
    }

    scored.forEach(({ group, searchMatch, filterMatch }) => {
        group.style.display = (searchMatch && filterMatch) ? '' : 'none';
    });

    // Update mobile search results label
    const query = (document.getElementById('searchInput')?.value || '').trim();
    const label = document.getElementById('searchResultsLabel');
    if (label) {
        if (query) {
            const visibleCount = [...trackGroups].filter(g => g.style.display !== 'none').length;
            label.innerHTML = `Results for: <span>"${query}"</span> &middot; ${visibleCount} track${visibleCount !== 1 ? 's' : ''}`;
            label.classList.add('has-query');
        } else {
            label.classList.remove('has-query');
        }
    }

    // Hide featured playlists and recently played when a search query is active
    const hasQuery = query.length > 0;
    const playlistsSection = document.getElementById('featuredPlaylistsSection');
    const recentlyPlayedSection = document.getElementById('recentlyPlayedSection');
    if (playlistsSection) {
        if (hasQuery) {
            playlistsSection.style.display = 'none';
        } else {
            const hasContent = playlistsSection.querySelector('.featured-playlist-card');
            if (hasContent) playlistsSection.style.display = 'block';
        }
    }
    if (recentlyPlayedSection) {
        if (hasQuery) {
            recentlyPlayedSection.style.display = 'none';
        } else {
            const hasContent = recentlyPlayedSection.querySelector('.track-item, .rp-item');
            if (hasContent) recentlyPlayedSection.style.display = 'block';
        }
    }

    renderFilterChips();
}
