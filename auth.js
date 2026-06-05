// Shared auth & nav helpers — included on every page
// Depends on: supabase.js (window.RS.waitForClient)
// Exposes: window.RS.initNavAuth(), window.RS.requireAuth(),
//          window.RS.updateNavAuth(), window.RS.handleLogout()
//          window.toggleProfileDropdown() (for inline onclick handlers)
(function () {

    // ── Profile dropdown ──────────────────────────────────────────────────────

    function toggleProfileDropdown() {
        var d = document.getElementById('profileDropdown');
        if (d) d.classList.toggle('active');
    }

    function closeProfileDropdown() {
        var d = document.getElementById('profileDropdown');
        if (d) d.classList.remove('active');
    }

    // Close when clicking outside the profile container
    document.addEventListener('click', function (e) {
        var pc = document.getElementById('profileContainer');
        if (pc && !pc.contains(e.target)) closeProfileDropdown();
    });

    // ── Logout ────────────────────────────────────────────────────────────────

    async function handleLogout(redirectTo) {
        try {
            var client = window.RS.getClient();
            await client.auth.signOut();
        } catch (err) {
            console.error('Logout error:', err);
        }
        localStorage.removeItem('readysounds_favorites');
        window.location.href = redirectTo || '/';
    }

    // ── Nav UI update ─────────────────────────────────────────────────────────
    // Shows the profile icon when logged in, auth buttons when logged out.
    // Called by initNavAuth and requireAuth; pages with custom auth logic
    // can also call it directly.

    function updateNavAuth(session) {
        var authButtons      = document.getElementById('authButtons');
        var profileContainer = document.getElementById('profileContainer');
        var profileInitial   = document.getElementById('profileInitial');
        var mobilePanelAuth  = document.getElementById('mobilePanelAuthBtns');

        if (session && session.user) {
            if (authButtons)      authButtons.style.display = 'none';
            if (profileContainer) profileContainer.style.display = 'flex';
            if (profileInitial)   profileInitial.textContent = session.user.email.charAt(0).toUpperCase();
            if (mobilePanelAuth)  mobilePanelAuth.style.display = 'none';
            injectMobileUserSection(session.user);
        } else {
            if (authButtons)      authButtons.style.display = '';
            if (profileContainer) profileContainer.style.display = 'none';
            if (mobilePanelAuth)  mobilePanelAuth.style.display = '';
            removeMobileUserSection();
        }
    }

    function injectMobileUserSection(user) {
        if (document.getElementById('mobilePanelUserSection')) return; // already present
        var panel = document.getElementById('mobilePanel');
        if (!panel) return;
        var section = document.createElement('div');
        section.id = 'mobilePanelUserSection';
        section.className = 'mobile-panel-user-section';
        section.innerHTML =
            '<div class="mobile-panel-user-header">My Account</div>' +
            '<a href="/favorites.html" class="mobile-panel-user-link">Favorites</a>' +
            '<a href="/my-playlists.html" class="mobile-panel-user-link">My Playlists</a>' +
            '<a href="/my-projects.html" class="mobile-panel-user-link">My Projects</a>' +
            '<a href="/account.html" class="mobile-panel-user-link">Account</a>' +
            '<a href="#" class="mobile-panel-user-link signout" onclick="handleLogout(); return false;">Sign Out</a>';
        var footer = panel.querySelector('.mobile-panel-footer');
        if (footer) panel.insertBefore(section, footer);
        else panel.appendChild(section);
    }

    function removeMobileUserSection() {
        var section = document.getElementById('mobilePanelUserSection');
        if (section) section.remove();
    }

    // ── initNavAuth ───────────────────────────────────────────────────────────
    // Use on public pages (browse, playlists, etc.) to show/hide the profile
    // icon without redirecting. Returns the current session (may be null).

    async function initNavAuth() {
        var client = await window.RS.waitForClient();
        var result = await client.auth.getSession();
        var session = result.data.session;
        updateNavAuth(session);

        client.auth.onAuthStateChange(function (event, session) {
            if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
                updateNavAuth(session);
            }
        });

        return session;
    }

    // ── requireAuth ───────────────────────────────────────────────────────────
    // Use on protected pages (account, downloads, settings, etc.).
    // Redirects to signup if not logged in; otherwise updates nav and returns
    // the session.

    async function requireAuth(redirectTo) {
        var client = await window.RS.waitForClient();
        var result = await client.auth.getSession();
        var session = result.data.session;

        if (!session) {
            window.location.href = redirectTo || 'signup.html';
            return null;
        }

        updateNavAuth(session);
        return session;
    }

    // ── Expose ────────────────────────────────────────────────────────────────

    window.RS = window.RS || {};
    window.RS.toggleProfileDropdown = toggleProfileDropdown;
    window.RS.closeProfileDropdown  = closeProfileDropdown;
    window.RS.handleLogout          = handleLogout;
    window.RS.updateNavAuth         = updateNavAuth;
    window.RS.initNavAuth           = initNavAuth;
    window.RS.requireAuth           = requireAuth;

    // Global aliases so existing inline onclick="handleLogout()" etc. keep working
    window.toggleProfileDropdown = toggleProfileDropdown;
    window.handleLogout = function (redirectTo) { return handleLogout(redirectTo); };

}());
