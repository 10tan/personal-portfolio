/**
 * GitHub API Integration & Client-side Caching Module
 * 
 * Features:
 * - Unauthenticated fetching of public repositories
 * - LocalStorage caching with 1-hour expiration
 * - Graceful fallback on rate-limits, missing repos, or network disconnection
 * - Zero external dependencies, pure ES Module
 */

const CACHE_PREFIX = 'gh_cache_v1_';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache to respect unauthenticated rate limits

/**
 * Reads cached repository metadata if valid and unexpired.
 * @param {string} username 
 * @param {string} repo 
 * @returns {object|null}
 */
function getCachedRepo(username, repo) {
  try {
    const key = `${CACHE_PREFIX}${username}_${repo}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.timestamp || !parsed.data) return null;

    if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
      return parsed.data;
    }
    // Expired
    localStorage.removeItem(key);
  } catch (err) {
    // Storage access disabled or corrupt; treat as cache miss
  }
  return null;
}

/**
 * Saves repository metadata into localStorage.
 * @param {string} username 
 * @param {string} repo 
 * @param {object} data 
 */
function setCachedRepo(username, repo, data) {
  try {
    const key = `${CACHE_PREFIX}${username}_${repo}`;
    const payload = {
      timestamp: Date.now(),
      data: data
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (err) {
    // Storage quota exceeded or private mode; non-fatal
  }
}

/**
 * Fetches repository metadata from GitHub API or returns cached copy.
 * Returns null gracefully on any failure (rate-limits, 404, offline).
 * 
 * @param {string} username 
 * @param {string} repo 
 * @returns {Promise<object|null>}
 */
export async function fetchRepoMetadata(username, repo) {
  if (!username || !repo) return null;

  // 1. Check client-side cache first
  const cached = getCachedRepo(username, repo);
  if (cached) {
    return cached;
  }

  // 2. Fetch from GitHub API
  const url = `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo)}`;
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (response.status === 403 || response.status === 429) {
      console.warn(`[GitHub API] Rate limit reached while fetching "${repo}". Displaying configured data.`);
      return null;
    }

    if (!response.ok) {
      console.warn(`[GitHub API] Notice for repo "${repo}": HTTP ${response.status} (${response.statusText}).`);
      return null;
    }

    const json = await response.json();
    const result = {
      language: json.language || null,
      stars: typeof json.stargazers_count === 'number' ? json.stargazers_count : 0,
      pushedAt: json.pushed_at || null,
      htmlUrl: json.html_url || `https://github.com/${username}/${repo}`,
      description: json.description || ''
    };

    // Cache the clean result
    setCachedRepo(username, repo, result);
    return result;
  } catch (networkError) {
    console.warn(`[GitHub API] Network unavailable or offline for "${repo}". Using fallback data.`);
    return null;
  }
}

/**
 * Formats an ISO date string into a clean, human-readable relative time (e.g., "3 weeks ago").
 * @param {string|Date} dateInput 
 * @returns {string}
 */
export function formatRelativeTime(dateInput) {
  if (!dateInput) return '';

  const date = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSec < 60) return 'just now';
  if (diffMin === 1) return '1 minute ago';
  if (diffMin < 60) return `${diffMin} minutes ago`;
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffWeeks === 1) return '1 week ago';
  if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
  if (diffMonths === 1) return '1 month ago';
  if (diffMonths < 12) return `${diffMonths} months ago`;
  if (diffYears === 1) return '1 year ago';
  return `${diffYears} years ago`;
}
