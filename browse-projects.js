// browse-projects.js — Project management for browse.html
// Depends on: browse-tracks.js (supabaseClient via browse-init.js), browse-downloads.js (isUserLoggedIn, showLoginPrompt)

let userProjects = [];
let currentProjectMenu = null;
let currentProjectTrackId = null;

async function loadUserProjects() {
    try {
        if (!supabaseClient) return;
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) { userProjects = []; return; }

        const { data, error } = await supabaseClient
            .from('projects')
            .select('id, name, share_token')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        userProjects = error ? [] : (data || []);
    } catch (err) {
        userProjects = [];
    }
}

async function openProjectMenu(event, trackId) {
    event.stopPropagation();

    const loggedIn = await isUserLoggedIn();
    if (!loggedIn) {
        showLoginPrompt('create projects');
        return;
    }

    if (currentProjectMenu) { currentProjectMenu.remove(); currentProjectMenu = null; }
    if (typeof currentPlaylistMenu !== 'undefined' && currentPlaylistMenu) {
        currentPlaylistMenu.remove();
        currentPlaylistMenu = null;
    }
    document.querySelectorAll('.more-menu').forEach(m => m.remove());

    await loadUserProjects();

    currentProjectTrackId = trackId;
    const actionsContainer = event.target.closest('.track-actions');

    const menu = document.createElement('div');
    menu.className = 'playlist-menu open';

    const createNew = document.createElement('div');
    createNew.className = 'playlist-menu-item create-new';
    createNew.textContent = '+ New Project';
    createNew.onclick = (e) => {
        e.stopPropagation();
        openCreateProjectModal(trackId);
    };
    menu.appendChild(createNew);

    if (userProjects.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'playlist-menu-item';
        empty.style.cssText = 'color:#888;font-style:italic';
        empty.textContent = 'No projects yet';
        menu.appendChild(empty);
    } else {
        // For each project, check if track is already in it
        const { data: existingRows } = await supabaseClient
            .from('project_tracks')
            .select('project_id')
            .eq('track_id', trackId)
            .in('project_id', userProjects.map(p => p.id));

        const inProjectIds = new Set((existingRows || []).map(r => r.project_id));

        userProjects.forEach(project => {
            const item = document.createElement('div');
            item.className = 'playlist-menu-item';
            const inProject = inProjectIds.has(project.id);
            item.textContent = inProject ? `✓ ${project.name}` : project.name;
            if (inProject) item.classList.add('in-playlist');
            item.onclick = (e) => {
                e.stopPropagation();
                toggleTrackInProject(trackId, project.id, inProject);
            };
            menu.appendChild(item);
        });
    }

    actionsContainer.style.position = 'relative';
    actionsContainer.appendChild(menu);
    currentProjectMenu = menu;
}

function openCreateProjectModal(trackId) {
    _createProjectTrackId = trackId;
    const overlay = document.getElementById('createProjectOverlay');
    const modal = document.getElementById('createProjectModal');
    const input = document.getElementById('createProjectInput');
    overlay.classList.add('active');
    modal.classList.add('active');
    input.value = '';
    input.focus();
}

function closeCreateProjectModal() {
    document.getElementById('createProjectOverlay').classList.remove('active');
    document.getElementById('createProjectModal').classList.remove('active');
    _createProjectTrackId = null;
}

let _createProjectTrackId = null;

async function confirmCreateProject() {
    const input = document.getElementById('createProjectInput');
    const name = input.value.trim();
    if (!name) { input.focus(); return; }

    closeCreateProjectModal();

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        const { data: project, error } = await supabaseClient
            .from('projects')
            .insert([{ user_id: user.id, name }])
            .select()
            .single();

        if (error || !project) { console.error('Error creating project:', error); return; }

        if (_createProjectTrackId != null) {
            await supabaseClient
                .from('project_tracks')
                .insert([{ project_id: project.id, track_id: _createProjectTrackId }]);
        }

        if (currentProjectMenu) { currentProjectMenu.remove(); currentProjectMenu = null; }
        await loadUserProjects();
        showToast(`Project "${name}" created`);
    } catch (err) {
        console.error('Error:', err);
    }
}

async function toggleTrackInProject(trackId, projectId, isCurrentlyIn) {
    try {
        if (isCurrentlyIn) {
            await supabaseClient
                .from('project_tracks')
                .delete()
                .eq('project_id', projectId)
                .eq('track_id', trackId);
            showToast('Removed from project');
        } else {
            await supabaseClient
                .from('project_tracks')
                .insert([{ project_id: projectId, track_id: trackId }]);
            showToast('Added to project');
        }

        if (currentProjectMenu) { currentProjectMenu.remove(); currentProjectMenu = null; }
    } catch (err) {
        console.error('Error:', err);
    }
}

document.addEventListener('click', () => {
    if (currentProjectMenu) { currentProjectMenu.remove(); currentProjectMenu = null; }
});
