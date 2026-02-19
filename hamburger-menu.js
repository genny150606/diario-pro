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

    // Event listeners
    hamburgerBtn.addEventListener('click', toggleNavbar);

    sidebar.querySelectorAll('button, a').forEach(item => {
        item.addEventListener('click', closeNavbar);
    });

    // Chiudi con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeNavbar();
        }
    });

    console.log('✅ Hamburger menu setup completo (overlay rimosso)');
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

    if (sidebar) sidebar.classList.add('open');

    // Su mobile blocca lo scroll
    if (window.innerWidth < 768) {
        document.body.style.overflow = 'hidden';
    }
}

function closeNavbar() {
    const sidebar = document.querySelector('.sidebar');

    if (sidebar) sidebar.classList.remove('open');
    document.body.style.overflow = '';
}