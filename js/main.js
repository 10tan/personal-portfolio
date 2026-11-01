/**
 * Main Application Module
 * 
 * Orchestrates:
 * - Loading configuration from data/*.json
 * - Synchronous initial DOM rendering (instant layout)
 * - Dynamic theme toggling (system default + manual override)
 * - Asynchronous GitHub metadata enrichment & relative time calculation
 * - Dynamic SEO meta tag & JSON-LD updates
 * - Strict XSS prevention using safe DOM manipulation
 */

import { fetchRepoMetadata, formatRelativeTime } from './github.js';

// SVG Icons for Project and External Links
const SVG_ICONS = {
  external: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
  code: '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>'
};

/**
 * Sanitizes URLs to prevent javascript: and data: pseudo-protocol attacks.
 * @param {string} url 
 * @returns {string} Safe URL or '#'
 */
function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '#';
  const trimmed = url.trim();
  if (/^(https?:\/\/|mailto:)/i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
    return trimmed;
  }
  return '#';
}

/**
 * Color Theme Controller
 */
class ThemeController {
  constructor() {
    this.storageKey = 'theme-preference';
    this.html = document.documentElement;
    this.toggleBtn = document.getElementById('theme-toggle-btn');
    this.toggleText = document.getElementById('theme-toggle-text');
    this.sunIcon = this.toggleBtn ? this.toggleBtn.querySelector('.icon-sun') : null;
    this.moonIcon = this.toggleBtn ? this.toggleBtn.querySelector('.icon-moon') : null;
    this.themeMetaTag = document.getElementById('meta-theme-color');

    this.init();
  }

  init() {
    // 1. Initial visual state
    this.updateUI();

    // 2. Click listener
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => this.toggle());
    }

    // 3. System preference change listener
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (!this.hasStoredPreference()) {
        this.updateUI();
      }
    });

    // 4. Keyboard shortcut: 'T' toggles theme
    window.addEventListener('keydown', (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;
      if (e.key === 't' || e.key === 'T') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          this.toggle();
        }
      }
    });
  }

  hasStoredPreference() {
    try {
      return !!localStorage.getItem(this.storageKey);
    } catch (e) {
      return false;
    }
  }

  getEffectiveTheme() {
    const attr = this.html.getAttribute('data-theme');
    if (attr === 'dark' || attr === 'light') return attr;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  toggle() {
    const current = this.getEffectiveTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    
    this.html.setAttribute('data-theme', next);
    try {
      localStorage.setItem(this.storageKey, next);
    } catch (e) {
      // Storage unavailable
    }
    this.updateUI();
  }

  updateUI() {
    const current = this.getEffectiveTheme();
    const isDark = current === 'dark';

    if (this.sunIcon && this.moonIcon) {
      this.sunIcon.style.display = isDark ? 'inline-block' : 'none';
      this.moonIcon.style.display = isDark ? 'none' : 'inline-block';
    }

    if (this.toggleText) {
      this.toggleText.textContent = isDark ? 'Light' : 'Dark';
    }

    if (this.toggleBtn) {
      this.toggleBtn.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} mode`);
    }

    if (this.themeMetaTag) {
      this.themeMetaTag.setAttribute('content', isDark ? '#090a0f' : '#ffffff');
    }
  }
}

/**
 * Loads JSON files with safety fallbacks.
 * @param {string} path 
 * @returns {Promise<any>}
 */
async function loadConfig(path) {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load ${path}: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`[Portfolio] Configuration error for ${path}:`, error);
    return null;
  }
}

/**
 * Updates dynamic SEO meta tags and JSON-LD schema
 * @param {object} site 
 */
function updateSEOAndMeta(site) {
  if (!site) return;

  const cleanName = site.name || 'Alex Mercer';
  const cleanTagline = site.tagline || 'Personal Portfolio';
  const pageTitle = `${cleanName} — ${cleanTagline}`;
  const bioText = site.bio || '';

  // Title & Head Meta
  document.title = pageTitle;
  const metaDesc = document.getElementById('meta-description');
  if (metaDesc) metaDesc.setAttribute('content', bioText);

  const ogTitle = document.getElementById('og-title');
  if (ogTitle) ogTitle.setAttribute('content', pageTitle);

  const ogDesc = document.getElementById('og-description');
  if (ogDesc) ogDesc.setAttribute('content', bioText);

  const twTitle = document.getElementById('twitter-title');
  if (twTitle) twTitle.setAttribute('content', pageTitle);

  const twDesc = document.getElementById('twitter-description');
  if (twDesc) twDesc.setAttribute('content', bioText);

  // Accent Color injection into CSS variables
  if (site.accentColor && /^#[0-9a-fA-F]{3,8}$/.test(site.accentColor)) {
    document.documentElement.style.setProperty('--accent-color', site.accentColor);
  }

  // JSON-LD Person schema update
  const schemaScript = document.getElementById('schema-person');
  if (schemaScript) {
    const schemaData = {
      "@context": "https://schema.org",
      "@type": "Person",
      "name": cleanName,
      "jobTitle": cleanTagline,
      "description": bioText,
      "email": site.email ? `mailto:${site.email}` : undefined,
      "sameAs": Array.isArray(site.links) ? site.links.map(l => l.url) : []
    };
    schemaScript.textContent = JSON.stringify(schemaData, null, 2);
  }
}

/**
 * Renders the Header, About, and Contact sections from site.json
 * @param {object} site 
 */
function renderSiteData(site) {
  if (!site) return;

  // Header Title & Tagline
  const siteNameEl = document.getElementById('site-name');
  if (siteNameEl) siteNameEl.textContent = site.name || 'Alex Mercer';

  const siteTaglineEl = document.getElementById('site-tagline');
  if (siteTaglineEl) siteTaglineEl.textContent = site.tagline || '';

  // About Bio
  const aboutBioEl = document.getElementById('about-bio');
  if (aboutBioEl) aboutBioEl.textContent = site.bio || '';

  // Currently Card
  const currentlyContainer = document.getElementById('currently-container');
  const currentlyTextEl = document.getElementById('currently-text');
  if (site.currently && site.currently.trim().length > 0) {
    if (currentlyTextEl) currentlyTextEl.textContent = site.currently;
    if (currentlyContainer) currentlyContainer.style.display = 'flex';
  } else if (currentlyContainer) {
    currentlyContainer.style.display = 'none';
  }

  // Contact Row
  const contactRow = document.getElementById('contact-row');
  if (contactRow) {
    contactRow.replaceChildren();

    // 1. Emails: support both array of emails and single email
    if (Array.isArray(site.emails) && site.emails.length > 0) {
      site.emails.forEach(item => {
        if (!item || !item.url) return;
        const emailLi = document.createElement('li');
        emailLi.className = 'contact-item';
        const emailLink = document.createElement('a');
        emailLink.href = sanitizeUrl(item.url);
        emailLink.textContent = item.label || item.url.replace(/^mailto:/, '');
        emailLi.appendChild(emailLink);
        contactRow.appendChild(emailLi);
      });
    } else if (site.email) {
      const emailLi = document.createElement('li');
      emailLi.className = 'contact-item';
      const emailLink = document.createElement('a');
      emailLink.href = `mailto:${encodeURIComponent(site.email)}`;
      emailLink.textContent = site.email;
      emailLi.appendChild(emailLink);
      contactRow.appendChild(emailLi);
    }

    // 2. Additional social/professional links
    if (Array.isArray(site.links)) {
      site.links.forEach(item => {
        if (!item || !item.url || !item.label) return;
        const li = document.createElement('li');
        li.className = 'contact-item';
        const a = document.createElement('a');
        a.href = sanitizeUrl(item.url);
        a.textContent = item.label;
        if (item.url.startsWith('http')) {
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
        }
        li.appendChild(a);
        contactRow.appendChild(li);
      });
    }
  }

  // Footer author name & year
  const footerAuthorEl = document.getElementById('footer-author-name');
  if (footerAuthorEl && site.name) {
    footerAuthorEl.textContent = site.name;
  }
  const currentYearEl = document.getElementById('current-year');
  if (currentYearEl) {
    currentYearEl.textContent = new Date().getFullYear();
  }
}

/**
 * Instantly renders project cards from local projects.json data.
 * @param {Array} projects 
 * @param {string} githubUsername 
 * @returns {Array} List of active project entries with their DOM elements
 */
function renderProjectsInitial(projects, githubUsername) {
  const container = document.getElementById('projects-list');
  if (!container) return [];

  container.replaceChildren();

  if (!Array.isArray(projects) || projects.length === 0) {
    const emptyMsg = document.createElement('p');
    emptyMsg.textContent = 'No projects configured yet.';
    container.appendChild(emptyMsg);
    return [];
  }

  // Filter hidden and sort featured first, preserving relative index order
  const filtered = projects
    .filter(p => !p.hidden)
    .sort((a, b) => {
      const aFeatured = a.featured ? 1 : 0;
      const bFeatured = b.featured ? 1 : 0;
      return bFeatured - aFeatured;
    });

  const activeRecords = [];

  filtered.forEach((project, index) => {
    const article = document.createElement('article');
    article.className = 'project-item';
    article.setAttribute('aria-labelledby', `proj-heading-${index}`);

    // Header (Title + Featured Badge)
    const header = document.createElement('div');
    header.className = 'project-header';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'project-title-wrap';

    const h3 = document.createElement('h3');
    h3.id = `proj-heading-${index}`;
    h3.className = 'project-title';

    // Clicking project title opens Vercel deployment link
    if (project.liveUrl && project.liveUrl.trim().length > 0) {
      const titleLink = document.createElement('a');
      titleLink.href = sanitizeUrl(project.liveUrl);
      titleLink.target = '_blank';
      titleLink.rel = 'noopener noreferrer';
      titleLink.className = 'project-title-link';
      titleLink.textContent = project.title || project.repo;
      titleLink.title = `Open ${project.title || project.repo} live on Vercel`;
      h3.appendChild(titleLink);
    } else {
      h3.textContent = project.title || project.repo;
    }
    titleWrap.appendChild(h3);

    if (project.featured) {
      const featuredBadge = document.createElement('span');
      featuredBadge.className = 'project-badge-featured';
      featuredBadge.textContent = 'Featured';
      titleWrap.appendChild(featuredBadge);
    }
    header.appendChild(titleWrap);
    article.appendChild(header);

    // Description
    const descP = document.createElement('p');
    descP.className = 'project-description';
    descP.id = `proj-desc-${index}`;
    descP.textContent = project.description || '';
    article.appendChild(descP);

    // Tags
    if (Array.isArray(project.tags) && project.tags.length > 0) {
      const tagList = document.createElement('ul');
      tagList.className = 'project-tags';
      tagList.setAttribute('aria-label', 'Technologies used');
      project.tags.forEach(tag => {
        const tagLi = document.createElement('li');
        tagLi.className = 'project-tag';
        tagLi.textContent = tag;
        tagList.appendChild(tagLi);
      });
      article.appendChild(tagList);
    }

    // Links & GitHub Meta Row
    const metaRow = document.createElement('div');
    metaRow.className = 'project-meta-links-row';

    // Links container
    const linksList = document.createElement('ul');
    linksList.className = 'project-links';

    // Vercel Live Demo Link
    if (project.liveUrl && project.liveUrl.trim().length > 0) {
      const liveLi = document.createElement('li');
      liveLi.className = 'project-link-item';
      const liveA = document.createElement('a');
      liveA.href = sanitizeUrl(project.liveUrl);
      liveA.target = '_blank';
      liveA.rel = 'noopener noreferrer';
      liveA.textContent = 'Live on Vercel ↗';
      liveLi.appendChild(liveA);
      linksList.appendChild(liveLi);
    }

    // GitHub Repo Link
    if (project.repo && githubUsername) {
      const ghLi = document.createElement('li');
      ghLi.className = 'project-link-item';
      const ghA = document.createElement('a');
      ghA.href = sanitizeUrl(`https://github.com/${githubUsername}/${project.repo}`);
      ghA.target = '_blank';
      ghA.rel = 'noopener noreferrer';
      ghA.textContent = 'GitHub ↗';
      ghLi.appendChild(ghA);
      linksList.appendChild(ghLi);
    }

    // Extra links (e.g., Papers, Reports, Documentation)
    if (Array.isArray(project.extraLinks)) {
      project.extraLinks.forEach(extra => {
        if (!extra || !extra.url || !extra.label) return;
        const extraLi = document.createElement('li');
        extraLi.className = 'project-link-item';
        const extraA = document.createElement('a');
        extraA.href = sanitizeUrl(extra.url);
        extraA.target = '_blank';
        extraA.rel = 'noopener noreferrer';
        extraA.textContent = extra.label;
        extraLi.appendChild(extraA);
        linksList.appendChild(extraLi);
      });
    }

    metaRow.appendChild(linksList);

    // Live GitHub Metadata Placeholder
    const metaContainer = document.createElement('div');
    metaContainer.className = 'project-github-meta';
    metaContainer.id = `proj-gh-meta-${index}`;
    metaRow.appendChild(metaContainer);

    article.appendChild(metaRow);
    container.appendChild(article);

    activeRecords.push({
      project,
      descElement: descP,
      metaContainer
    });
  });

  return activeRecords;
}

/**
 * Asynchronously enriches rendered projects with live GitHub stats and relative time.
 * @param {Array} activeRecords 
 * @param {string} githubUsername 
 */
async function enrichProjectsWithGitHub(activeRecords, githubUsername) {
  if (!githubUsername || !Array.isArray(activeRecords)) return;

  const pushDates = [];

  // Fetch concurrently
  const fetchPromises = activeRecords.map(async (record) => {
    const { project, descElement, metaContainer } = record;
    if (!project.repo) return;

    const data = await fetchRepoMetadata(githubUsername, project.repo);
    if (!data) return; // Gracefully keep fallback layout

    // If description was missing from JSON, fall back to GitHub's
    if ((!project.description || project.description.trim() === '') && data.description) {
      descElement.textContent = data.description;
    }

    // Record push date for site-wide footer
    if (data.pushedAt) {
      pushDates.push(new Date(data.pushedAt));
    }

    // Populate live metadata
    metaContainer.replaceChildren();

    // 1. Language badge
    if (data.language) {
      const langSpan = document.createElement('span');
      langSpan.className = 'github-meta-item';
      
      const dot = document.createElement('span');
      dot.className = 'language-dot';
      dot.setAttribute('aria-hidden', 'true');
      
      const text = document.createTextNode(data.language);
      langSpan.appendChild(dot);
      langSpan.appendChild(text);
      metaContainer.appendChild(langSpan);
    }

    // 2. Stars
    if (typeof data.stars === 'number' && data.stars > 0) {
      const starSpan = document.createElement('span');
      starSpan.className = 'github-meta-item';
      starSpan.title = `${data.stars} GitHub stars`;
      
      // Inline SVG star
      const starIcon = document.createElement('span');
      starIcon.innerHTML = SVG_ICONS.star;
      
      const starCount = document.createTextNode(` ${data.stars}`);
      starSpan.appendChild(starIcon.firstChild);
      starSpan.appendChild(starCount);
      metaContainer.appendChild(starSpan);
    }

    // 3. Last updated relative time
    if (data.pushedAt) {
      const relTime = formatRelativeTime(data.pushedAt);
      if (relTime) {
        const timeSpan = document.createElement('span');
        timeSpan.className = 'github-meta-item';
        timeSpan.textContent = relTime;
        timeSpan.title = `Last pushed: ${new Date(data.pushedAt).toLocaleString()}`;
        metaContainer.appendChild(timeSpan);
      }
    }
  });

  await Promise.allSettled(fetchPromises);

  // Update footer "Last updated" with the most recent repository activity
  if (pushDates.length > 0) {
    pushDates.sort((a, b) => b - a);
    const mostRecentDate = pushDates[0];
    const footerTimeEl = document.getElementById('footer-update-time');
    if (footerTimeEl) {
      const relString = formatRelativeTime(mostRecentDate);
      footerTimeEl.textContent = relString || 'recently';
      footerTimeEl.setAttribute('datetime', mostRecentDate.toISOString());
    }
  }
}

/**
 * Renders Interests as interactive sub-pages within the page.
 * Features:
 * - Sub-page tab bar with ARIA tablist / tab / tabpanel roles
 * - Smooth instant switching with subtle fade
 * - URL hash synchronization (e.g. #movies, #music, #books)
 * - Keyboard navigation (arrow keys)
 * - Deep linking support on direct page load
 * @param {Array} interests 
 */
function renderInterests(interests) {
  const container = document.getElementById('interests-container');
  if (!container) return;

  container.replaceChildren();

  if (!Array.isArray(interests) || interests.length === 0) {
    const emptyMsg = document.createElement('p');
    emptyMsg.textContent = 'No interests listed.';
    container.appendChild(emptyMsg);
    return;
  }

  // 1. Create Sub-Page Navigation Bar (Tabs)
  const nav = document.createElement('nav');
  nav.className = 'subpage-nav';
  nav.setAttribute('role', 'tablist');
  nav.setAttribute('aria-label', 'Interests and pursuits subpages');

  // 2. Create Panels Container
  const panelsWrapper = document.createElement('div');
  panelsWrapper.className = 'subpage-panels-wrapper';

  const tabButtons = [];
  const panels = [];

  interests.forEach((item, index) => {
    if (!item) return;
    const subpageId = item.id || `subpage-${index}`;

    // Create Tab Button
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.role = 'tab';
    btn.className = 'subpage-tab-btn';
    btn.id = `tab-${subpageId}`;
    btn.setAttribute('aria-controls', `panel-${subpageId}`);
    btn.setAttribute('aria-selected', 'false');
    btn.setAttribute('tabindex', '-1');
    btn.dataset.id = subpageId;

    const labelSpan = document.createElement('span');
    labelSpan.className = 'subpage-tab-label';
    labelSpan.textContent = item.shortLabel || item.title;
    btn.appendChild(labelSpan);

    nav.appendChild(btn);
    tabButtons.push(btn);

    // Create Sub-Page Panel
    const panel = document.createElement('article');
    panel.role = 'tabpanel';
    panel.className = 'subpage-panel';
    panel.id = `panel-${subpageId}`;
    panel.setAttribute('aria-labelledby', `tab-${subpageId}`);
    panel.hidden = true;
    panel.dataset.id = subpageId;

    // Header within subpage
    const header = document.createElement('div');
    header.className = 'subpage-header';

    const h3 = document.createElement('h3');
    h3.className = 'subpage-title';
    h3.textContent = item.title;
    header.appendChild(h3);
    panel.appendChild(header);

    // Narrative text
    if (item.text) {
      const p = document.createElement('p');
      p.className = 'subpage-text';
      p.textContent = item.text;
      panel.appendChild(p);
    }

    // List of rich entries with thumbnail & personal thoughts (Movies, Books, Music)
    if (Array.isArray(item.entries) && item.entries.length > 0) {
      const entriesGrid = document.createElement('div');
      entriesGrid.className = 'review-entries-grid';

      item.entries.forEach(entry => {
        if (!entry || !entry.title) return;

        const card = document.createElement('div');
        card.className = 'review-entry-card';

        // Thumbnail image
        if (entry.image) {
          const thumbWrap = document.createElement('div');
          thumbWrap.className = 'review-thumb-wrap';

          const img = document.createElement('img');
          img.className = 'review-thumb-img';
          img.src = sanitizeUrl(entry.image);
          img.alt = entry.title;
          img.loading = 'lazy';
          img.onerror = () => {
            thumbWrap.style.display = 'none';
          };
          thumbWrap.appendChild(img);
          card.appendChild(thumbWrap);
        }

        // Details content
        const contentWrap = document.createElement('div');
        contentWrap.className = 'review-content-wrap';

        // Title and Subtitle
        const titleRow = document.createElement('div');
        titleRow.className = 'review-title-row';

        const titleEl = document.createElement('h4');
        titleEl.className = 'review-title';

        if (entry.link && entry.link.trim().length > 0) {
          const a = document.createElement('a');
          a.href = sanitizeUrl(entry.link);
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.textContent = entry.title;
          titleEl.appendChild(a);
        } else {
          titleEl.textContent = entry.title;
        }
        titleRow.appendChild(titleEl);

        if (entry.subtitle) {
          const subtitleEl = document.createElement('span');
          subtitleEl.className = 'review-subtitle';
          subtitleEl.textContent = entry.subtitle;
          titleRow.appendChild(subtitleEl);
        }
        contentWrap.appendChild(titleRow);

        // "What I felt" personal thought
        if (entry.thought) {
          const thoughtBlock = document.createElement('blockquote');
          thoughtBlock.className = 'review-thought';
          thoughtBlock.textContent = entry.thought;
          contentWrap.appendChild(thoughtBlock);
        }

        card.appendChild(contentWrap);
        entriesGrid.appendChild(card);
      });

      panel.appendChild(entriesGrid);
    }

    // List of subpage items (e.g. Photography, Other)
    if (Array.isArray(item.items) && item.items.length > 0) {
      const itemsList = document.createElement('ul');
      itemsList.className = 'subpage-items-list';
      item.items.forEach(subItem => {
        if (!subItem) return;
        const li = document.createElement('li');
        li.className = 'subpage-item-pill';
        li.textContent = subItem;
        itemsList.appendChild(li);
      });
      panel.appendChild(itemsList);
    }

    // External links
    if (Array.isArray(item.links) && item.links.length > 0) {
      const linksList = document.createElement('ul');
      linksList.className = 'subpage-links-list';
      item.links.forEach(link => {
        if (!link || !link.url || !link.label) return;
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = sanitizeUrl(link.url);
        a.textContent = link.label;
        if (link.url.startsWith('http')) {
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
        }
        li.appendChild(a);
        linksList.appendChild(li);
      });
      panel.appendChild(linksList);
    }

    panelsWrapper.appendChild(panel);
    panels.push(panel);
  });

  container.appendChild(nav);
  container.appendChild(panelsWrapper);

  /**
   * Switches active subpage.
   */
  function activateSubpage(id, updateHash = true) {
    let targetIndex = interests.findIndex(item => (item.id || '') === id);
    if (targetIndex === -1) targetIndex = 0;

    tabButtons.forEach((btn, idx) => {
      const isActive = idx === targetIndex;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      btn.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    panels.forEach((pnl, idx) => {
      const isActive = idx === targetIndex;
      pnl.hidden = !isActive;
      pnl.classList.toggle('active', isActive);
    });

    const activeId = interests[targetIndex].id || `subpage-${targetIndex}`;
    if (updateHash && window.location.hash !== `#${activeId}`) {
      try {
        history.replaceState(null, '', `#${activeId}`);
      } catch (e) {
        // Fallback for restricted storage or environments
      }
    }
  }

  // Click listener for tabs
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      activateSubpage(btn.dataset.id, true);
    });
  });

  // Keyboard navigation for tablist
  nav.addEventListener('keydown', (e) => {
    const currentIndex = tabButtons.findIndex(b => b.getAttribute('aria-selected') === 'true');
    if (currentIndex === -1) return;

    let nextIndex = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % tabButtons.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + tabButtons.length) % tabButtons.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = tabButtons.length - 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      tabButtons[nextIndex].focus();
      activateSubpage(tabButtons[nextIndex].dataset.id, true);
    }
  });

  // Hash-based subpage sync (supports deep links like #movies, #music, #books)
  function syncWithHash() {
    const rawHash = window.location.hash.replace(/^#/, '');
    if (rawHash) {
      const matching = interests.find(i => i.id === rawHash);
      if (matching) {
        activateSubpage(matching.id, false);
        return;
      }
    }
    // Default to first subpage
    if (interests[0] && interests[0].id) {
      activateSubpage(interests[0].id, false);
    }
  }

  window.addEventListener('hashchange', syncWithHash);
  syncWithHash();
}

/**
 * Application Bootstrap
 */
async function initPortfolio() {
  // 1. Initialize Theme Controller
  const theme = new ThemeController();

  // 2. Synchronize navigation active link with current URL
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-item a').forEach(link => {
    const linkPath = link.getAttribute('href');
    if (linkPath === currentPath || ((currentPath === '' || currentPath === '/') && linkPath === 'index.html')) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });

  // 3. Load global site configuration (Header, About bio, Contact, Footer)
  const siteData = await loadConfig('data/site.json');
  if (siteData) {
    updateSEOAndMeta(siteData);
    renderSiteData(siteData);
  }

  const githubUser = siteData ? siteData.githubUsername : '';

  // 4. Projects Page: only fetch and render if #projects-list is in DOM
  const projectsContainer = document.getElementById('projects-list');
  if (projectsContainer) {
    const projectsData = await loadConfig('data/projects.json');
    const activeRecords = renderProjectsInitial(projectsData || [], githubUser);
    enrichProjectsWithGitHub(activeRecords, githubUser);
  }

  // 5. Interests Page: only fetch and render if #interests-container is in DOM
  const interestsContainer = document.getElementById('interests-container');
  if (interestsContainer) {
    const interestsData = await loadConfig('data/interests.json');
    renderInterests(interestsData || []);
  }
}

// Start on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPortfolio);
} else {
  initPortfolio();
}
