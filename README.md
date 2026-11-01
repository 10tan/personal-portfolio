# Minimal Personal Portfolio

A fast, lightweight, and elegant personal portfolio static website. Built with vanilla HTML, CSS, and modern JavaScript modules. No build step, zero npm dependencies, and works out-of-the-box on GitHub Pages or any static file host.

---

## ⚡ Quick Start

You only need to edit the JSON files in the `data/` folder:

1. **`data/site.json`**: Your name, tagline, bio, current focus, email, social links, and accent color.
2. **`data/projects.json`**: The list of repositories and projects displayed on `projects.html`, their tags, and live deployment links.
3. **`data/interests.json`**: Interactive sub-pages (*Research Focus*, *Movies*, *Music*, *Books*, *Photography*, *Other Pursuits*) displayed inside the `About` page (`index.html`). Each sub-page can be switched using tabs or opened directly via URL hash (`#movies`, `#books`, etc.).

Both pages (`index.html` [About] and `projects.html` [Projects]) automatically include the **Contact section** at the bottom, rendered directly from `data/site.json`.

To preview locally:
```bash
# Python 3
python -m http.server 8000

# Open in browser:
# http://localhost:8000
```

---

## 📁 File Structure

```text
.
├── index.html                  # About page with bio, merged interests & contact
├── projects.html               # Dedicated Projects page with live GitHub stats & contact
├── css/
│   └── style.css               # Design tokens, light & dark themes, responsive layout, print styles
├── js/
│   ├── main.js                 # App lifecycle, routing, theme toggle, XSS protection
│   └── github.js               # GitHub API client, 1-hour localStorage cache, relative time
├── data/
│   ├── site.json               # Personal bio, contact, and site metadata
│   ├── projects.json           # Curated projects & repo settings
│   └── interests.json          # Academic & research interests
├── assets/
│   └── favicon.svg             # Minimal SVG favicon
├── .github/workflows/
│   └── pages.yml               # Automated GitHub Pages deployment workflow
└── README.md
```

---

## 🛠️ How to Customize

### 1. Editing `data/site.json`
Open `data/site.json` and replace the placeholder fields:

```json
{
  "name": "Alex Mercer",
  "tagline": "Astrophysicist & Computational Software Engineer",
  "bio": "I build open-source tools for astronomical data analysis and machine learning.",
  "currently": "Currently developing fast gamma/hadron separation algorithms and learning Rust.",
  "githubUsername": "alexmercer-dev",
  "accentColor": "#2563eb",
  "email": "alex.mercer@example.com",
  "links": [
    { "label": "GitHub", "url": "https://github.com/alexmercer-dev" },
    { "label": "LinkedIn", "url": "https://linkedin.com/in/alexmercer-example" },
    { "label": "Google Scholar", "url": "https://scholar.google.com" }
  ]
}
```

### 2. Adding or Removing a Project (`data/projects.json`)
Only repositories listed in `data/projects.json` are shown on the website.

- **To add a project**: Add a new JSON object to the array.
- **To remove a project**: Delete its entry from the array.
- **To hide a project temporarily**: Set `"hidden": true`.
- **To feature a project at the top**: Set `"featured": true`.

**Example:**
```json
[
  {
    "repo": "CherenkovLens",
    "title": "CherenkovLens",
    "description": "Python Cherenkov telescope image analysis pipeline for gamma/hadron separation.",
    "tags": ["Python", "Astrophysics", "Machine Learning"],
    "liveUrl": "https://cherenkovlens.example.org",
    "extraLinks": [
      { "label": "Technical Report", "url": "https://arxiv.org/abs/example" }
    ],
    "featured": true,
    "hidden": false
  }
]
```

### 3. Adding an Interest (`data/interests.json`)
Each object in `data/interests.json` generates its own section:

```json
[
  {
    "title": "Astronomy & Astrophotography",
    "text": "Deep-sky imaging with narrowband filters and cooled CMOS sensors.",
    "links": [
      { "label": "Astrobin Gallery", "url": "https://astrobin.com" }
    ]
  }
]
```

### 4. Changing Accent Color & Fonts
- **Accent Color**: Set `"accentColor": "#2563eb"` in `data/site.json`. Any valid HEX color (e.g., `#0969da`, `#10b981`, `#8b5cf6`, `#ea580c`) will automatically update links, badges, focus rings, and highlights.
- **Fonts**: Defined in `css/style.css` via `:root`:
  ```css
  --font-sans: "IBM Plex Sans", -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, monospace;
  ```
  You can swap Google Fonts in `index.html` (e.g. to `Inter`, `Geist`, or `Newsreader`).

---

## 🌐 Live GitHub Data & Rate Limits

- **Instant Render**: The site displays your configured title, description, and tags **immediately** from `data/projects.json` without waiting for the network.
- **Progressive Enrichment**: When the browser fetches metadata from GitHub (`https://api.github.com/repos/{githubUsername}/{repo}`), it enriches each card with primary language, live star count, and relative push time (e.g. "3 weeks ago").
- **1-Hour Client Caching**: All GitHub API responses are cached in browser `localStorage` for 1 hour. This ensures you never hit the unauthenticated limit of 60 requests/hour per IP.
- **Resilience**: If an API request fails (rate-limited HTTP 403, missing repo 404, or network offline), the site gracefully retains your JSON content and silences errors.

---

## 🚀 Deploying to GitHub Pages

### Option A: User Portfolio (`<username>.github.io`)
1. Create a public repository named `<your-github-username>.github.io`.
2. Push this project code to the `main` branch:
   ```bash
   git init
   git add .
   git commit -m "Initial portfolio release"
   git remote add origin https://github.com/<your-github-username>/<your-github-username>.github.io.git
   git branch -M main
   git push -u origin main
   ```
3. In GitHub: go to **Settings** > **Pages** > **Build and deployment** > Source: choose **GitHub Actions** (the included `.github/workflows/pages.yml` will automatically build and publish).
4. Your site will be live at `https://<your-github-username>.github.io`.

### Option B: Project Subdirectory (`github.com/<username>/<repo>`)
1. Push to any repository.
2. Under **Settings** > **Pages**, select **GitHub Actions**.
3. It will deploy to `https://<your-github-username>.github.io/<repo>/`.

### Attaching a Custom Domain
1. In repository **Settings** > **Pages** > **Custom domain**, enter your domain (e.g., `alexmercer.dev`).
2. Add a `CNAME` record in your DNS provider pointing to `<your-github-username>.github.io`.
3. Check **Enforce HTTPS**.

---

## ♿ Accessibility & Performance

- **Lighthouse 95+**: Zero bloated frameworks, pure semantic HTML5 (`<header>`, `<main>`, `<section>`, `<footer>`, `<nav>`), high-contrast colors meeting WCAG AAA / AA standards.
- **Skip Link**: Includes keyboard skip navigation for screen readers and power users.
- **Reduced Motion**: Respects `prefers-reduced-motion` to disable animations.
- **Theme Persistence**: Dark/Light mode respects system preferences and persists manual user toggles in `localStorage` with zero flicker on page load.
- **Print Friendly**: Dedicated print stylesheet formats text in clean monochrome with expanded URLs.
