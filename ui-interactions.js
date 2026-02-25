/**
 * STUDYJOURNAL PRO — Radical Landing Page Interactions
 */

document.addEventListener('DOMContentLoaded', () => {
    initDynamicIsland();
    initRadicalHero();
    initSpatialParallax();
    initRevealAnimations();
});

/**
 * ── DYNAMIC ISLAND ──
 * Shrink and blur on scroll.
 */
function initDynamicIsland() {
    const nav = document.getElementById('mainNav');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav.style.transform = 'translateX(-50%) translateY(-10px) scale(0.95)';
            nav.style.background = 'rgba(10, 10, 12, 0.9)';
        } else {
            nav.style.transform = 'translateX(-50%) translateY(0) scale(1)';
            nav.style.background = 'rgba(20, 20, 22, 0.7)';
        }
    });
}

/**
 * ── RADICAL HERO ──
 * Staggered entrance for the mega-typography.
 */
async function initRadicalHero() {
    const tag = document.getElementById('heroBadge');
    const line1 = document.getElementById('heroTitleLine1');
    const line2 = document.getElementById('heroTitleLine2');
    const subtitle = document.getElementById('heroSubtitle');
    const actions = document.getElementById('heroActions');
    const preview = document.getElementById('heroPreview');

    const wait = (ms) => new Promise(res => setTimeout(res, ms));

    // Initial state set in CSS would be better, but we can double down here
    [tag, line1, line2, subtitle, actions, preview].forEach(el => {
        if (!el) return;
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 1.2s cubic-bezier(0.16, 1, 0.3, 1)';
    });

    await wait(400);

    // Sequence
    if (tag) { tag.style.opacity = '1'; tag.style.transform = 'translateY(0)'; }
    await wait(200);
    if (line1) { line1.parentNode.style.opacity = '1'; line1.style.opacity = '1'; line1.style.transform = 'translateY(0)'; }
    await wait(150);
    if (line2) { line2.parentNode.style.opacity = '1'; line2.style.opacity = '1'; line2.style.transform = 'translateY(0)'; }
    await wait(300);
    if (subtitle) { subtitle.style.opacity = '1'; subtitle.style.transform = 'translateY(0)'; }
    await wait(200);
    if (actions) { actions.style.opacity = '1'; actions.style.transform = 'translateY(0)'; }
    await wait(400);
    if (preview) { preview.style.opacity = '1'; preview.style.transform = 'rotateX(15deg) translateY(0)'; }
}

/**
 * ── SPATIAL PARALLAX ──
 * Interactive depth based on mouse position.
 */
function initSpatialParallax() {
    const preview = document.getElementById('heroPreview');
    if (!preview) return;

    document.addEventListener('mousemove', (e) => {
        const x = (window.innerWidth / 2 - e.pageX) / 40;
        const y = (window.innerHeight / 2 - e.pageY) / 40;

        preview.style.transform = `rotateX(${15 + y}deg) rotateY(${-x}deg) translateY(${-y}px)`;
    });
}

/**
 * ── REVEAL ANIMATIONS ──
 * Smooth opacity/transform transitions for minimalist sections.
 */
function initRevealAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    document.querySelectorAll('.reveal-section, .feature-large-text').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(40px)';
        el.style.transition = 'all 1.4s cubic-bezier(0.16, 1, 0.3, 1)';
        observer.observe(el);
    });

    // Custom class for the reveal
    const style = document.createElement('style');
    style.innerHTML = `
        .is-visible {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);
}
