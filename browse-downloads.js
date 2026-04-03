// browse-downloads.js — Download flow, subscription check, and login helpers for browse.html
// Depends on: browse-tracks.js (cart, trackData), supabase.js (supabaseClient via browse-init.js)

// Track current download request
let currentDownloadTrackId = null;
let currentDownloadTrackInfo = null;

// Check if user has active subscription
async function hasActiveSubscription() {
    try {
        // Get current user
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

        if (userError || !user) {
            return false;
        }

        // Query the profiles table for subscription status
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('subscription_status, subscription_plan')
            .eq('email', user.email)
            .single();

        if (profileError) {
            console.error('Error fetching profile:', profileError);
            return false;
        }

        // Check if subscription is active
        if (profile && profile.subscription_status === 'active') {
            return true;
        }

        return false;
    } catch (error) {
        console.error('Error checking subscription:', error);
        return false;
    }
}

// Download Track Function
async function downloadTrack(event, trackId) {
    event.stopPropagation();

    // Check if user is logged in
    const loggedIn = await isUserLoggedIn();
    if (!loggedIn) {
        showLoginPrompt('download tracks');
        return;
    }

    // Check if user has active subscription
    const hasSubscription = await hasActiveSubscription();

    if (hasSubscription) {
        // User has subscription - show download options modal
        showDownloadOptions(trackId);
        return;
    }

    // No subscription - show the purchase modal
    // Store the track ID and info for the cart button in the modal
    currentDownloadTrackId = trackId;

    // Get track info — prefer trackData lookup, fall back to DOM traversal
    const tdEntry = trackData[trackId];
    if (tdEntry) {
        currentDownloadTrackInfo = {
            id: trackId,
            title: tdEntry.title,
            artist: tdEntry.artist
        };
    } else {
        const trackElement = event.target.closest('.track-item');
        if (trackElement) {
            const titleElement = trackElement.querySelector('.track-title');
            if (titleElement) {
                let title = titleElement.textContent.trim();
                title = title.replace(/\d+\s+versions?/i, '').trim();
                const parts = title.split(' - ');
                const artist = parts.length > 1 ? parts[0].trim() : 'Buck Moon';
                currentDownloadTrackInfo = { id: trackId, title, artist };
            }
        }
    }

    // Show the download prompt modal
    showDownloadPrompt();
}

// Show download prompt modal
function showDownloadPrompt() {
    const overlay = document.getElementById('downloadOverlay');
    const modal = document.getElementById('downloadModal');
    overlay.classList.add('visible');
    setTimeout(() => {
        modal.classList.add('visible');
    }, 10);
}

// Close download prompt modal
function closeDownloadPrompt() {
    const overlay = document.getElementById('downloadOverlay');
    const modal = document.getElementById('downloadModal');
    modal.classList.remove('visible');
    setTimeout(() => {
        overlay.classList.remove('visible');
    }, 300);
}

// Show download options modal for subscribers
async function showDownloadOptions(trackId) {
    const trackElement = document.querySelector(`[data-track-id="${trackId}"]`);
    if (!trackElement) return;

    // Get track info — prefer trackData (has clean title/artist), fall back to DOM
    const td = trackData[trackId] || {};
    const trackMeta = {
        trackId,
        trackTitle: td.trackTitle || '',
        trackArtist: td.artist || '',
    };

    // Get track info
    const titleElement = trackElement.querySelector('.track-title');
    let trackTitle = td.trackTitle || 'Track';
    if (!td.trackTitle && titleElement) {
        trackTitle = titleElement.textContent.trim().replace(/\d+\s+versions?/i, '').trim();
    }

    // Set modal title
    document.getElementById('downloadOptionsTrackTitle').textContent = trackTitle;

    // Get base URL from stream URL
    const streamUrl = trackElement.getAttribute('data-stream-url');
    if (!streamUrl) return;

    // Extract base path and filename
    // Example: https://.../audio/primum-electronic/buck-moon-go-now/buck-moon-go-now-full-preview.mp3
    const urlParts = streamUrl.split('/');
    const filename = urlParts.pop(); // buck-moon-go-now-full-preview.mp3
    const folder = urlParts.pop(); // buck-moon-go-now
    const album = urlParts.pop(); // primum-electronic
    const basePath = urlParts.join('/'); // https://.../audio

    // Allow per-track download folder override (e.g. when audio/downloads use different album folders)
    const downloadAlbum = trackElement.getAttribute('data-download-album');
    const fixAlbum = (url) => downloadAlbum ? url.replace('/' + album + '/', '/' + downloadAlbum + '/') : url;

    // Remove -full-preview.mp3 or -preview.mp3 to get base name
    const baseName = filename.replace(/-full-preview\.mp3$/, '').replace(/-preview\.mp3$/, '');

    // Build download options
    const optionsList = document.getElementById('downloadOptionsList');
    optionsList.innerHTML = '';

    // Main track options
    const mainSection = document.createElement('div');
    mainSection.className = 'download-section';
    mainSection.innerHTML = '<h3 style="margin: 0 0 10px 0; font-size: 16px;">Main Track</h3>';

    // MP3 option (high quality from /downloads/)
    const mp3Btn = document.createElement('button');
    mp3Btn.className = 'download-option-btn';
    mp3Btn.textContent = '🎵 Download MP3';
    mp3Btn.onclick = async (e) => {
        const btn = e.currentTarget;
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Downloading...';
        try {
            const mp3Url = fixAlbum(streamUrl.replace('/audio/', '/downloads/'));
            await downloadFile(mp3Url, filename, { ...trackMeta, versionTitle: 'Full Track', fileFormat: 'MP3' });
            closeDownloadOptions();
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    };
    mainSection.appendChild(mp3Btn);

    // WAV option (full quality from /downloads/)
    const wavBtn = document.createElement('button');
    wavBtn.className = 'download-option-btn';
    wavBtn.textContent = '🎧 Download WAV (High Quality)';
    wavBtn.onclick = async (e) => {
        const btn = e.currentTarget;
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Downloading...';
        try {
            // Change /audio/ to /downloads/ and .mp3 to .wav
            const wavUrl = fixAlbum(streamUrl.replace('/audio/', '/downloads/').replace('.mp3', '.wav'));
            const wavFilename = filename.replace('.mp3', '.wav');
            await downloadFile(wavUrl, wavFilename, { ...trackMeta, versionTitle: 'Full Track', fileFormat: 'WAV' });
            closeDownloadOptions();
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    };
    mainSection.appendChild(wavBtn);

    optionsList.appendChild(mainSection);

    // Check if this track has alternates
    const trackGroup = trackElement.closest('.track-group');
    if (trackGroup) {
        const alternatesContainer = trackGroup.querySelector('.alternates-container');
        if (alternatesContainer) {
            const alternates = alternatesContainer.querySelectorAll('.track-item.alternate');

            if (alternates.length > 0) {
                const altSection = document.createElement('div');
                altSection.className = 'download-section';
                altSection.innerHTML = '<h3 style="margin: 20px 0 10px 0; font-size: 16px;">Alternate Versions</h3>';

                alternates.forEach(alt => {
                    const altTitle = alt.querySelector('.track-title')?.textContent.trim() || 'Alternate';
                    const altStreamUrl = alt.getAttribute('data-stream-url');

                    if (altStreamUrl) {
                        const altFilename = altStreamUrl.split('/').pop();

                        // Container for this alternate's options
                        const altDiv = document.createElement('div');
                        altDiv.style.marginBottom = '10px';
                        altDiv.innerHTML = `<p style="margin: 10px 0 5px 0; font-weight: 500;">${altTitle}</p>`;

                        // MP3 - replace /audio/ with /downloads/ and remove -preview if present
                        const altMp3 = document.createElement('button');
                        altMp3.className = 'download-option-btn-small';
                        altMp3.textContent = 'MP3';
                        altMp3.onclick = async (e) => {
                            const btn = e.currentTarget;
                            btn.disabled = true;
                            btn.textContent = '...';
                            try {
                                const altMp3Url = fixAlbum(altStreamUrl.replace('/audio/', '/downloads/').replace('-preview', ''));
                                const altMp3Filename = altFilename.replace('-preview', '');
                                await downloadFile(altMp3Url, altMp3Filename, { ...trackMeta, versionTitle: altTitle, fileFormat: 'MP3' });
                                closeDownloadOptions();
                            } finally {
                                btn.disabled = false;
                                btn.textContent = 'MP3';
                            }
                        };
                        altDiv.appendChild(altMp3);

                        // WAV - replace /audio/ with /downloads/, remove -preview if present, and change .mp3 to .wav
                        const altWav = document.createElement('button');
                        altWav.className = 'download-option-btn-small';
                        altWav.textContent = 'WAV';
                        altWav.onclick = async (e) => {
                            const btn = e.currentTarget;
                            btn.disabled = true;
                            btn.textContent = '...';
                            try {
                                const altWavUrl = fixAlbum(altStreamUrl.replace('/audio/', '/downloads/').replace('-preview', '').replace('.mp3', '.wav'));
                                const altWavFilename = altFilename.replace('-preview', '').replace('.mp3', '.wav');
                                await downloadFile(altWavUrl, altWavFilename, { ...trackMeta, versionTitle: altTitle, fileFormat: 'WAV' });
                                closeDownloadOptions();
                            } finally {
                                btn.disabled = false;
                                btn.textContent = 'WAV';
                            }
                        };
                        altDiv.appendChild(altWav);

                        altSection.appendChild(altDiv);
                    }
                });

                optionsList.appendChild(altSection);
            }
        }
    }

    // Stems section
    const stemsSection = document.createElement('div');
    stemsSection.className = 'download-section';
    stemsSection.innerHTML = '<h3 style="margin: 20px 0 10px 0; font-size: 16px;">Stems</h3>';

    const stemsBtn = document.createElement('button');
    stemsBtn.className = 'download-option-btn';
    stemsBtn.textContent = '📦 Download All Stems (ZIP)';
    stemsBtn.onclick = async (e) => {
        const btn = e.currentTarget;
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Preparing stems...';
        try {
            await downloadStems(basePath, album, folder, baseName);
            closeDownloadOptions();
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    };
    stemsSection.appendChild(stemsBtn);

    optionsList.appendChild(stemsSection);

    // Show modal
    const overlay = document.getElementById('downloadOptionsOverlay');
    const modal = document.getElementById('downloadOptionsModal');
    overlay.classList.add('visible');
    setTimeout(() => {
        modal.classList.add('visible');
    }, 10);
}

// Close download options modal
function closeDownloadOptions() {
    const overlay = document.getElementById('downloadOptionsOverlay');
    const modal = document.getElementById('downloadOptionsModal');
    modal.classList.remove('visible');
    setTimeout(() => {
        overlay.classList.remove('visible');
    }, 300);
}

// Download a single file
async function downloadFile(url, filename, trackMeta = {}) {
    try {
        // Get user's auth token
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            alert('Please log in to download files.');
            return;
        }

        // Convert the R2 public URL to a file path
        // Example: https://pub-xxx.r2.dev/downloads/primum-electronic/track.wav
        // Extract: downloads/primum-electronic/track.wav
        const urlObj = new URL(url);
        const filePath = urlObj.pathname.substring(1); // Remove leading slash

        // Call our Netlify function to get a signed URL
        const response = await fetch('/.netlify/functions/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                filePath,
                trackId: trackMeta.trackId || null,
                trackTitle: trackMeta.trackTitle || '',
                trackArtist: trackMeta.trackArtist || '',
                versionTitle: trackMeta.versionTitle || 'Full Track',
                fileFormat: trackMeta.fileFormat || (filename.toLowerCase().endsWith('.wav') ? 'WAV' : 'MP3')
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Download failed');
        }

        const { downloadUrl } = await response.json();

        // Now download the file using the signed URL
        const fileResponse = await fetch(downloadUrl);
        if (!fileResponse.ok) {
            throw new Error('Failed to download file');
        }

        const blob = await fileResponse.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch (error) {
        console.error('Download error:', error);
        alert('Download failed. Please try again.');
    }
}

// Download stems as ZIP
async function downloadStems(basePath, album, folder, baseName) {
    // Try all possible stem types we've seen across all tracks
    // Code will try to fetch each one, and only include stems that exist
    const allPossibleStems = [
        'bass',
        'drums',
        'leads',
        'synths-and-strings',
        'synth-chords',
        'synths-plucks',
        'vocals',
        'pianos-and-strings',
        'pianos',
        'guitars',
        'intro-sounds',
        'strings',
        'synth-leads',
        'keys',
        'vox-fx',
        'vox',
        'percussion',
        'fx',
        'pads',
        'arps',
        'brass',
        'woodwinds',
        'organ',
        'electric-piano',
        'acoustic-guitar',
        'electric-guitar',
        'synth-bass',
        'sub-bass',
        'kick',
        'snare',
        'hi-hats',
        'cymbals',
        'toms',
        'claps',
        'shakers',
        'tambourine'
    ];

    const stemUrls = allPossibleStems.map(stem => ({
        url: `${basePath}/downloads/${album}/${folder}/${baseName}-stems-${stem}.wav`,
        filename: `${baseName}-stems-${stem}.wav`
    }));

    // Load JSZip library if not already loaded
    if (typeof JSZip === 'undefined') {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            script.onload = () => createAndDownloadZip(stemUrls, baseName).then(resolve).catch(reject);
            script.onerror = () => reject(new Error('Failed to load ZIP library'));
            document.head.appendChild(script);
        });
    } else {
        return createAndDownloadZip(stemUrls, baseName);
    }
}

// Create ZIP file with stems
async function createAndDownloadZip(stemUrls, baseName) {
    const zip = new JSZip();
    const stemsFolder = zip.folder('stems');

    // Show loading message
    const loadingMsg = document.createElement('div');
    loadingMsg.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #1a1a1a; border: 1px solid #9c27b0; padding: 20px 40px; border-radius: 12px; z-index: 9999; color: white; font-size: 16px;';
    loadingMsg.textContent = 'Preparing stems download...';
    document.body.appendChild(loadingMsg);

    // Fetch all stem files
    let foundCount = 0;
    const fetchPromises = stemUrls.map(async ({url, filename}) => {
        try {
            const response = await fetch(url);
            if (response.ok) {
                const blob = await response.blob();
                stemsFolder.file(filename, blob);
                foundCount++;
                return true;
            }
        } catch (error) {
            // Stem not found, skip silently
        }
        return false;
    });

    await Promise.all(fetchPromises);

    // Remove loading message
    document.body.removeChild(loadingMsg);

    if (foundCount === 0) {
        alert('No stems found for this track.');
        return;
    }

    // Generate ZIP
    const content = await zip.generateAsync({type: 'blob'});

    // Download ZIP
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `${baseName}-stems.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Add to cart from download modal
function addToCartFromModal() {
    if (currentDownloadTrackInfo) {
        // Check if already in cart
        const existingItem = cart.find(item => item.id === currentDownloadTrackInfo.id);
        if (existingItem) {
            alert('This track is already in your cart!');
            closeDownloadPrompt();
            return;
        }

        // Add to cart with default Individual license
        cart.push({
            id: currentDownloadTrackInfo.id,
            title: currentDownloadTrackInfo.title,
            artist: currentDownloadTrackInfo.artist,
            license: 'individual',
            price: 10
        });

        updateCartCount();
        closeDownloadPrompt();

        // Go straight to checkout
        setTimeout(() => {
            proceedToCheckout();
        }, 300);
    }
}

// Check if user is logged in
async function isUserLoggedIn() {
    try {
        if (!supabaseClient) {
            return false;
        }
        const { data: { session } } = await supabaseClient.auth.getSession();
        return session !== null && session.user !== null;
    } catch (error) {
        console.error('Error checking auth status:', error);
        return false;
    }
}

// Show login prompt modal
function showLoginPrompt(action) {
    const modal = document.getElementById('loginPromptModal');
    const overlay = document.getElementById('loginPromptOverlay');
    const msg = document.getElementById('loginPromptMessage');
    if (!modal) return;
    msg.textContent = `Create a free account to ${action}!`;
    overlay.classList.add('active');
    modal.classList.add('active');
}

function closeLoginPrompt() {
    document.getElementById('loginPromptOverlay').classList.remove('active');
    document.getElementById('loginPromptModal').classList.remove('active');
}
