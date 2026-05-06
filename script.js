/**
 * GitFolio — script.js
 * GitHub Explorer · Clean, modular, vanilla JS
 */

document.addEventListener('DOMContentLoaded', () => {

    /* ─────────────────────────────────────────
       CONFIG & STATE
    ───────────────────────────────────────── */
    const API = 'https://api.github.com';
    let currentTheme = localStorage.getItem('gf-theme') || 'dark';

    /* ─────────────────────────────────────────
       DOM REFERENCES
    ───────────────────────────────────────── */
    const html              = document.documentElement;
    const navbar            = document.getElementById('navbar');
    const scrollProgress    = document.getElementById('scroll-progress');
    const themeBtn          = document.getElementById('theme-toggle');
    const iconSun           = document.getElementById('icon-sun');
    const iconMoon          = document.getElementById('icon-moon');
    const mobileMenuBtn     = document.getElementById('mobile-menu-btn');
    const menuOpenIcon      = document.getElementById('menu-open-icon');
    const menuCloseIcon     = document.getElementById('menu-close-icon');
    const navLinks          = document.getElementById('nav-links');

    const searchForm        = document.getElementById('search-form');
    const searchInput       = document.getElementById('username-input');
    const searchBtnText     = document.getElementById('search-btn-text');
    const searchBtnSpinner  = document.getElementById('search-btn-spinner');
    const searchLoading     = document.getElementById('search-loading');
    const searchError       = document.getElementById('search-error');
    const searchErrorMsg    = document.getElementById('search-error-msg');
    const searchResult      = document.getElementById('search-result-container');
    const userProfile       = document.getElementById('user-profile');
    const userReposGrid     = document.getElementById('user-repos-grid');

    const topicsPills       = document.querySelectorAll('.topic-pill');
    const topicsGrid        = document.getElementById('topics-grid');
    const topicsLoading     = document.getElementById('topics-loading');

    const trendingGrid      = document.getElementById('trending-grid');
    const trendingLoading   = document.getElementById('trending-loading');

    const toastContainer    = document.getElementById('toast-container');

    /* ─────────────────────────────────────────
       INIT
    ───────────────────────────────────────── */
    initTheme();
    initScrollBehavior();
    initMobileMenu();
    initRevealAnimations();
    loadTrending();
    loadTopicRepos('machine-learning');

    /* ─────────────────────────────────────────
       THEME
    ───────────────────────────────────────── */
    function initTheme() {
        applyTheme(currentTheme);
        themeBtn.addEventListener('click', () => {
            currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
            applyTheme(currentTheme);
            localStorage.setItem('gf-theme', currentTheme);
        });
    }

    function applyTheme(theme) {
        html.setAttribute('data-theme', theme);
        iconSun.style.display  = theme === 'dark'  ? 'block' : 'none';
        iconMoon.style.display = theme === 'light' ? 'block' : 'none';
    }

    /* ─────────────────────────────────────────
       SCROLL BEHAVIOUR (navbar blur + progress)
    ───────────────────────────────────────── */
    function initScrollBehavior() {
        window.addEventListener('scroll', () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
            scrollProgress.style.width = `${pct}%`;
            navbar.classList.toggle('scrolled', scrollTop > 10);
        }, { passive: true });
    }

    /* ─────────────────────────────────────────
       MOBILE MENU
    ───────────────────────────────────────── */
    function initMobileMenu() {
        mobileMenuBtn.addEventListener('click', () => {
            const isOpen = navLinks.classList.toggle('open');
            mobileMenuBtn.setAttribute('aria-expanded', isOpen);
            menuOpenIcon.style.display  = isOpen ? 'none'  : 'block';
            menuCloseIcon.style.display = isOpen ? 'block' : 'none';
        });
        // Close on nav link click
        navLinks.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('open');
                menuOpenIcon.style.display  = 'block';
                menuCloseIcon.style.display = 'none';
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
            });
        });
    }

    /* ─────────────────────────────────────────
       SCROLL REVEAL
    ───────────────────────────────────────── */
    function initRevealAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.classList.add('visible');
                    observer.unobserve(e.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    }

    /* ─────────────────────────────────────────
       GITHUB API HELPER
    ───────────────────────────────────────── */
    async function fetchGH(endpoint) {
        const res = await fetch(`${API}${endpoint}`, {
            headers: { 'Accept': 'application/vnd.github.v3+json' }
        });
        if (!res.ok) {
            if (res.status === 403) throw new Error('API rate limit exceeded. Please wait a moment.');
            if (res.status === 404) throw new Error('Not found.');
            throw new Error(`GitHub API error (${res.status}).`);
        }
        return res.json();
    }

    /* ─────────────────────────────────────────
       USER SEARCH
    ───────────────────────────────────────── */
    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = searchInput.value.trim();
        if (!username) return;

        // Reset UI
        searchResult.classList.add('hidden');
        searchError.classList.add('hidden');
        searchLoading.classList.remove('hidden');
        setSearchLoading(true);

        try {
            const [user, repos] = await Promise.all([
                fetchGH(`/users/${username}`),
                fetchGH(`/users/${username}/repos?per_page=100&sort=updated`)
            ]);

            let totalStars = 0;
            const langCount = {};
            repos.forEach(r => {
                totalStars += r.stargazers_count;
                if (r.language) langCount[r.language] = (langCount[r.language] || 0) + 1;
            });

            const topLangs = Object.entries(langCount)
                .sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);

            const topRepos = [...repos]
                .sort((a, b) => b.stargazers_count - a.stargazers_count)
                .slice(0, 6);

            renderProfile(user, totalStars, topLangs);
            renderRepos(userReposGrid, topRepos);

            searchLoading.classList.add('hidden');
            searchResult.classList.remove('hidden');
            searchResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
            showToast(`Loaded @${user.login}'s profile.`, 'success');
        } catch (err) {
            searchLoading.classList.add('hidden');
            searchError.classList.remove('hidden');
            searchErrorMsg.textContent = err.message === 'Not found.'
                ? `User "${username}" was not found on GitHub.`
                : err.message;
            if (err.message !== 'Not found.') showToast(err.message, 'error');
        } finally {
            setSearchLoading(false);
        }
    });

    function setSearchLoading(loading) {
        searchBtnText.style.display    = loading ? 'none'  : 'inline';
        searchBtnSpinner.classList.toggle('hidden', !loading);
    }

    /* ─── Render Profile ─── */
    function renderProfile(user, totalStars, topLangs) {
        const year = new Date(user.created_at).getFullYear();
        const langsHtml = topLangs.length
            ? `<div class="profile-languages">${topLangs.map(l =>
                `<span class="lang-chip">${l}</span>`).join('')}</div>` : '';

        userProfile.innerHTML = `
            <div class="profile-avatar-wrap">
                <img src="${user.avatar_url}&s=220" alt="${user.login}" class="profile-avatar" loading="lazy">
            </div>
            <div class="profile-info">
                <h3 class="profile-name">${user.name || user.login}</h3>
                <a href="${user.html_url}" target="_blank" rel="noopener" class="profile-username">@${user.login}</a>
                ${user.bio ? `<p class="profile-bio">${user.bio}</p>` : ''}
                <div class="profile-stats">
                    <div class="stat-item">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        <span>${user.followers.toLocaleString()} followers &middot; ${user.following.toLocaleString()} following</span>
                    </div>
                    <div class="stat-item">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                        <span>${user.public_repos.toLocaleString()} public repos</span>
                    </div>
                    <div class="stat-item">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        <span>${totalStars.toLocaleString()} total stars</span>
                    </div>
                    ${user.location ? `<div class="stat-item">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        <span>${user.location}</span></div>` : ''}
                    <div class="stat-item">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        <span>Joined ${year}</span>
                    </div>
                </div>
                ${langsHtml}
            </div>`;
    }

    /* ─── Render Repos ─── */
    function renderRepos(container, repos) {
        if (!repos.length) {
            container.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">No public repositories.</p>';
            return;
        }
        container.innerHTML = repos.map(r => repoCardHTML(r)).join('');
    }

    /* ─────────────────────────────────────────
       TOPICS
    ───────────────────────────────────────── */
    topicsPills.forEach(pill => {
        pill.addEventListener('click', () => {
            topicsPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            loadTopicRepos(pill.dataset.topic);
        });
    });

    async function loadTopicRepos(topic) {
        topicsGrid.innerHTML = '';
        topicsLoading.classList.remove('hidden');
        try {
            const data = await fetchGH(`/search/repositories?q=topic:${topic}&sort=stars&order=desc&per_page=6`);
            topicsLoading.classList.add('hidden');
            if (data.items?.length) {
                topicsGrid.innerHTML = data.items.map(r => repoCardHTML(r, true)).join('');
            } else {
                topicsGrid.innerHTML = '<p style="color:var(--text-muted)">No repositories found.</p>';
            }
        } catch (err) {
            topicsLoading.classList.add('hidden');
            showToast(err.message, 'error');
        }
    }

    /* ─────────────────────────────────────────
       TRENDING
    ───────────────────────────────────────── */
    async function loadTrending() {
        const since = new Date();
        since.setDate(since.getDate() - 30);
        const dateStr = since.toISOString().split('T')[0];
        try {
            const data = await fetchGH(`/search/repositories?q=created:>${dateStr}&sort=stars&order=desc&per_page=6`);
            trendingLoading.classList.add('hidden');
            if (data.items?.length) {
                trendingGrid.innerHTML = data.items.map(r => repoCardHTML(r, true)).join('');
            }
        } catch (err) {
            trendingLoading.classList.add('hidden');
            showToast(err.message, 'error');
        }
    }

    /* ─────────────────────────────────────────
       REPO CARD TEMPLATE
    ───────────────────────────────────────── */
    function repoCardHTML(repo, showOwner = false) {
        const color  = langColor(repo.language);
        const owner  = showOwner && repo.owner
            ? `<p class="repo-owner">by <strong>${repo.owner.login}</strong></p>` : '';
        const lang   = repo.language
            ? `<span class="repo-language"><span class="lang-dot" style="background:${color}"></span>${repo.language}</span>` : '';

        return `
        <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer" class="repo-card" role="listitem" aria-label="${repo.name} repository">
            <div class="repo-header">
                <span class="repo-name">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                    ${repo.name}
                </span>
                <span class="repo-visibility">${repo.private ? 'Private' : 'Public'}</span>
            </div>
            ${owner}
            <p class="repo-desc">${repo.description || 'No description provided.'}</p>
            <div class="repo-footer">
                ${lang}
                <span class="repo-stat">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    ${repo.stargazers_count.toLocaleString()}
                </span>
                <span class="repo-stat">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9"/><path d="M12 12v3"/></svg>
                    ${repo.forks_count.toLocaleString()}
                </span>
            </div>
        </a>`;
    }

    /* ─────────────────────────────────────────
       LANGUAGE COLORS
    ───────────────────────────────────────── */
    function langColor(lang) {
        const map = {
            JavaScript:'#f1e05a', TypeScript:'#3178c6', Python:'#3572A5',
            HTML:'#e34c26', CSS:'#563d7c', Java:'#b07219', Go:'#00ADD8',
            Rust:'#dea584', 'C++':'#f34b7d', Ruby:'#701516', C:'#555555',
            'C#':'#178600', PHP:'#4F5D95', Swift:'#F05138', Kotlin:'#A97BFF',
            Dart:'#00B4AB', Shell:'#89e051', Vue:'#41b883', R:'#198CE7'
        };
        return map[lang] || '#888899';
    }

    /* ─────────────────────────────────────────
       TOAST NOTIFICATIONS
    ───────────────────────────────────────── */
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icons = {
            error:   `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
            success: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
            info:    `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
        };
        toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('removing');
            toast.addEventListener('animationend', () => toast.remove(), { once: true });
        }, 3500);
    }

}); // end DOMContentLoaded
