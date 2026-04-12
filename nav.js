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

    // Expose to global scope for inline onclick handlers
    window.toggleMobileMenu = toggleMobileMenu;
    window.closeMobilePanel = closeMobilePanel;
    window.togglePanelSection = togglePanelSection;
}());
