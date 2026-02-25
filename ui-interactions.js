/**
 * STUDYJOURNAL PRO — Landing Page Interactions
 * Handling animations, magnetic effects, and scroll reveals.
 */

document.addEventListener('DOMContentLoaded', () => {
    initTypingAnimation();
    initMagneticButtons();
    initScrollReveal();
    updateAuroraBackground();
});

/**
 * ── TYPING ANIMATION ──
 * Refined sequence for the hero title and subtitle.
 */
async function initTypingAnimation() {
    const line1 = document.getElementById('heroTitleLine1');
    const line2 = document.getElementById('heroTitleLine2');
    const subtitle = document.getElementById('heroSubtitle');
    const actions = document.getElementById('heroActions');
    const preview = document.getElementById('heroPreview');

    if (!line1 || !line2) return;

    const text1 = "Il Tuo Studio,";
    const text2 = "Rivoluzionato dall'AI.";
    const textSubtitle = subtitle ? subtitle.textContent.trim() : "";

    // Reset
    line1.textContent = '';
    line2.textContent = '';
    if (subtitle) subtitle.textContent = '';
    if (actions) actions.style.opacity = '0';
    if (preview) preview.style.opacity = '0';

    const wait = (ms) => new Promise(res => setTimeout(res, ms));

    const typeWriter = async (element, text, speed) => {
        element.classList.add('typing-cursor');
        for (let i = 0; i < text.length; i++) {
            element.textContent += text.charAt(i);
            await wait(speed + (Math.random() * 20));
        }
        element.classList.remove('typing-cursor');
    };

    await wait(800);
    await typeWriter(line1, text1, 40);
    await wait(300);
    await typeWriter(line2, text2, 40);

    if (subtitle) {
        await wait(200);
        await typeWriter(subtitle, textSubtitle, 15);
    }

    // Smooth reveal for buttons and preview
    if (actions) {
        actions.style.transition = 'opacity 1s cubic-bezier(0.23, 1, 0.32, 1), transform 1s cubic-bezier(0.23, 1, 0.32, 1)';
        actions.style.transform = 'translateY(10px)';
        requestAnimationFrame(() => {
            actions.style.opacity = '1';
            actions.style.transform = 'translateY(0)';
        });
    }

    if (preview) {
        setTimeout(() => {
            preview.style.transition = 'opacity 1.2s cubic-bezier(0.23, 1, 0.32, 1), transform 1.2s cubic-bezier(0.23, 1, 0.32, 1)';
            preview.style.transform = 'translateY(20px) scale(0.98)';
            requestAnimationFrame(() => {
                preview.style.opacity = '1';
                preview.style.transform = 'translateY(0) scale(1)';
            });
        }, 500);
    }
}

/**
 * ── MAGNETIC BUTTONS ──
 * Subtle interaction for premium feel.
 */
function initMagneticButtons() {
    const buttons = document.querySelectorAll('.btn-hero-primary, .btn-hero-secondary');

    buttons.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translate(0, 0)';
        });
    });
}

/**
 * ── SCROLL REVEAL ──
 * Better performance and cleaner look than simple CSS reveals.
 */
function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    document.querySelectorAll('.feature-card, .landing-section .reveal, .stats-banner-inner, .timeline-step').forEach(el => {
        observer.observe(el);
    });
}

/**
 * ── AURORA BACKGROUND ──
 * Dynamic mouse-aware effect if needed, otherwise stay with optimized CSS.
 */
function updateAuroraBackground() {
    // Current CSS implementation is efficient. 
    // We could add mouse-parallax to orbs here if requested.
}
