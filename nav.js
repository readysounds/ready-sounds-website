// Shared mobile nav logic — included on every page
(function () {
    function toggleMobileMenu() {
        const panel = document.getElementById('mobilePanel');
        const overlay = document.getElementById('mobilePanelOverlay');
        const toggle = document.getElementById('mobileMenuToggle');
        if (panel.classList.contains('open')) {
            closeMobilePanel();
        } else {
            panel.classList.add('open');
            overlay.classList.add('active');
            if (toggle) toggle.textContent = '✕';
            document.body.style.overflow = 'hidden';
        }
    }

    function closeMobilePanel() {
        const panel = document.getElementById('mobilePanel');
        const overlay = document.getElementById('mobilePanelOverlay');
        const toggle = document.getElementById('mobileMenuToggle');
        if (panel) panel.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
        if (toggle) toggle.textContent = '☰';
        document.body.style.overflow = '';
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeMobilePanel();
    });

    function togglePanelSection(section) {
        var submenu = document.getElementById(section + 'Submenu');
        var btn = document.getElementById(section + 'Btn');
        if (submenu) submenu.classList.toggle('open');
        if (btn) btn.classList.toggle('open');
    }

    // Touch-friendly Music dropdown toggle (works alongside hover on desktop)
    document.addEventListener('DOMContentLoaded', function () {
        const trigger = document.querySelector('.nav-music-trigger');
        const dropdown = document.querySelector('.nav-music-dropdown');
        if (trigger && dropdown) {
            trigger.addEventListener('click', function (e) {
                const isOpen = dropdown.classList.toggle('open');
                if (isOpen) {
                    const close = function (ev) {
                        if (!dropdown.contains(ev.target)) {
                            dropdown.classList.remove('open');
                            document.removeEventListener('click', close, true);
                        }
                    };
                    document.addEventListener('click', close, true);
                }
            });
        }
    });

    // Expose to global scope for inline onclick handlers
    window.toggleMobileMenu = toggleMobileMenu;
    window.closeMobilePanel = closeMobilePanel;
    window.togglePanelSection = togglePanelSection;
}());
