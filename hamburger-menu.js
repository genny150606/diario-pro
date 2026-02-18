/* ============================================
   HAMBURGER MENU - MOBILE & DESKTOP
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        setupHamburgerMenu();
    }, 500);
});

function setupHamburgerMenu() {
    const header = document.querySelector('.mobile-top-bar') || document.querySelector('header');
    const sidebar = document.querySelector('.sidebar');

    if (!header || !sidebar) return;

    // Usa il pulsante hamburger esistente oppure creane uno nuovo
    let hamburgerBtn = header.querySelector('.hamburger') || document.getElementById('hamburgerBtn');
    if (!hamburgerBtn) {
        hamburgerBtn = document.createElement('button');
        hamburgerBtn.id = 'hamburgerBtn';
        hamburgerBtn.innerHTML = '☰';
        hamburgerBtn.type = 'button';
        header.insertBefore(hamburgerBtn, header.firstChild);
    }
    hamburgerBtn.id = 'hamburgerBtn';

    // Crea l'overlay per mobile
    const overlay = document.createElement('div');
    overlay.className = 'navbar-overlay';
    document.body.appendChild(overlay);

    // Event listeners
    hamburgerBtn.addEventListener('click', toggleNavbar);
    overlay.addEventListener('click', closeNavbar);
    sidebar.querySelectorAll('button, a').forEach(item => {
        item.addEventListener('click', closeNavbar);
    });

    // Chiudi con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeNavbar();
        }
    });

    console.log('✅ Hamburger menu setup completo');
}

function toggleNavbar() {
    const sidebar = document.querySelector('.sidebar');

    if (!sidebar) return;

    if (sidebar.classList.contains('open')) {
        closeNavbar();
    } else {
        openNavbar();
    }
}

function openNavbar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.navbar-overlay');

    if (sidebar) sidebar.classList.add('open');

    // Overlay solo su mobile
    if (window.innerWidth < 768) {
        if (overlay) overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeNavbar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.navbar-overlay');

    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');

    document.body.style.overflow = '';
}