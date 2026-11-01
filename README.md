# 🎬 Md Abu Baten · AI Creative Director & Generative Video Specialist

Official production repository for the creative portfolio of **Md Abu Baten** — AI Creative Director directing cinematic AI films, broadcast-ready AI commercials, and generative video campaigns for global brands.

- 🌐 **Live Website:** [https://optiobyte.com](https://optiobyte.com)
- 📁 **GitHub Repository:** [https://github.com/MrBaten/baten-creative-portfolio](https://github.com/MrBaten/baten-creative-portfolio)
- ✉️ **Inquiries & Direct Transmission:** [baten@optiobyte.com](mailto:baten@optiobyte.com)

---

## 🏗️ Architecture & Deployment Flow

```
┌───────────────────────────┐
│     Local Development     │ (Edit code, add media, preview on port 3000)
└─────────────┬─────────────┘
              │  git push origin main
              ▼
┌───────────────────────────┐
│     GitHub Repository     │ (Version control & source of truth)
│  (MrBaten/...-portfolio)  │
└─────────────┬─────────────┘
              │  Webhook Event / Direct Git Pull
              ▼
┌───────────────────────────┐
│    Hostinger Web Server   │ (Native Git clone into public_html/)
│  (Apache / LiteSpeed)     │ (Protected by .htaccess security headers)
└─────────────┬─────────────┘
              │  Origin Server Response
              ▼
┌───────────────────────────┐
│     Cloudflare Edge       │ (DNS, Full SSL/TLS, DDoS defense & CDN caching)
└─────────────┬─────────────┘
              │  https://optiobyte.com
              ▼
┌───────────────────────────┐
│        Live Client        │
└───────────────────────────┘
```

---

## 🚀 Upgradation Guide (How to Update Your Website)

Whenever you want to add a new project, edit copy, update styles, or change videos, follow these steps:

### 1. Run the Local Development Server
Before pushing changes, preview them locally on your computer:
```bash
# In the project directory:
python3 -m http.server 3000
```
Open your browser at **[http://localhost:3000](http://localhost:3000)** to verify your updates.

---

### 2. Common Content Updates

| To Update... | File to Edit | Notes |
| :--- | :--- | :--- |
| **Project Data & Videos** | [`src/data/portfolioData.js`](src/data/portfolioData.js) | Add or edit projects in the `projects` array. Ensure videos are placed in `src/assets/Projects/`. |
| **Services & Deliverables** | [`src/data/portfolioData.js`](src/data/portfolioData.js) | Modify the `services` array (names, taglines, deliverables). |
| **Social Links & Contact** | [`src/data/portfolioData.js`](src/data/portfolioData.js) & [`index.html`](index.html) | Update creator profile links and header/footer anchors. |
| **Color Tokens & Styling** | [`src/styles/main.css`](src/styles/main.css) | Custom design system variables and tactile physics rules. |
| **Physics & Interactions** | [`src/components/MotionEngine.js`](src/components/MotionEngine.js) | Smooth velocity scroll, viewfinder tracking, and polaroid parallax tilt. |
| **3D Reel (film strip)** | [`src/3d/reel.js`](src/3d/reel.js) | Scroll-driven Three.js scene. Rebuild the bundle after editing (see below). |
| **Reel frames** | [`src/assets/reel/`](src/assets/reel/) | 12 stills packed into one atlas (6 × 2, 360 × 540 each). |

---

### 3. Rebuild CSS / 3D when you change them

The site has no build step on the server — the compiled files are committed. Run these locally
whenever you change Tailwind classes or the 3D scene:

```bash
npm install          # once
npm run build:css    # after changing classes in index.html, 404.html or src/ → src/styles/tailwind.css
npm run build:3d     # after editing src/3d/reel.js → src/components/reel3d.bundle.js
npm run build        # both
```

> Use the named colour classes for opacity (`text-ca-ink/70`, `bg-ca-surface/95`).
> `text-[var(--ca-ink)]/70` compiles to **nothing** in Tailwind 3 — the opacity form only works on named colours.

---

### 4. Commit & Push to GitHub

Once your local changes are verified, deploy them with three commands in your terminal:

```bash
# 1. Stage all changed files
git add .

# 2. Create a descriptive commit message
git commit -m "feat: add new commercial reel and update project bio"

# 3. Push to GitHub main branch
git push origin main
```

---

### 5. How the Update Goes Live

#### Method A: 100% Automatic (Auto-Deployment Webhook)
If you have configured the Hostinger Webhook (see setup instructions below):
- As soon as your `git push` finishes, GitHub notifies Hostinger.
- Hostinger immediately runs `git pull` directly into `public_html/`.
- **Your live website updates in 3–5 seconds automatically!**

#### Method B: 1-Click Manual Pull (In Hostinger)
If you haven't enabled webhooks:
1. Log into **[Hostinger hPanel](https://hpanel.hostinger.com/)**.
2. Go to **Websites** ➔ click **Manage** on `optiobyte.com`.
3. In the left menu, navigate to **Advanced ➔ Git**.
4. Click the blue **Deploy** button next to your repository.
5. Hostinger pulls the latest commit from GitHub instantly.

---

### 6. Emergency Rollback (If something breaks)

If you push an update with a typo or bug and want to revert immediately:
```bash
# Revert the latest commit safely:
git revert HEAD

# Push the reverted state to GitHub:
git push origin main
```
Hostinger will deploy the rollback immediately, restoring the previously working state.

---

## 🛠️ Initial Deployment Setup Reference

This section documents the initial infrastructure configuration for reference:

### Hostinger Git Integration
1. Log into **Hostinger hPanel** ➔ **Websites** ➔ Manage `optiobyte.com`.
2. Scroll to **Advanced ➔ Git**.
3. **Repository:** `https://github.com/MrBaten/baten-creative-portfolio.git`
4. **Branch:** `main`
5. **Install in directory:** `public_html`
6. Click **Create** (or **Deploy**).

### Auto-Deployment Webhook (Optional but Recommended)
1. In Hostinger **Advanced ➔ Git**, click **Auto Deployment**.
2. Copy the **Webhook URL** provided by Hostinger.
3. Open your GitHub Repository ➔ **Settings ➔ Webhooks ➔ Add webhook**.
4. Paste the Webhook URL, set Content type to `application/json`, select **Just the push event**, and click **Add webhook**.

---

## 🌐 Cloudflare DNS & SSL Settings

`optiobyte.com` DNS records in **Cloudflare Dashboard**:

| Type | Name | Content / Target | Proxy Status | TTL |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `@` (optiobyte.com) | `[Hostinger Server IP]` | 🟠 Proxied | Auto |
| **CNAME** | `www` | `optiobyte.com` | 🟠 Proxied | Auto |

### Cloudflare SSL/TLS Configuration:
- **SSL Mode:** **Full** or **Full (strict)** (Ensures end-to-end encryption between Cloudflare edge and Hostinger origin).
- **Edge Certificates:**
  - ✅ **Always Use HTTPS:** Enabled
  - ✅ **Automatic HTTPS Rewrites:** Enabled
  - ✅ **Minimum TLS Version:** 1.2

---

## 🔒 Security & Performance Features

| Security Vector | Implementation | Location |
| :--- | :--- | :--- |
| **HTTPS Enforcement** | Strict 301 rewrites from HTTP to HTTPS | [`.htaccess`](.htaccess#L8-L11) |
| **Canonical Domain** | Redirects `www.optiobyte.com` ➔ `optiobyte.com` | [`.htaccess`](.htaccess#L13-L16) |
| **Content Security Policy (CSP)** | Whitelisted Google Fonts, YouTube, FormSubmit (Tailwind and Three.js are self-hosted) | [`.htaccess`](.htaccess) |
| **Strict-Transport-Security (HSTS)** | `max-age=31536000; includeSubDomains; preload` | [`.htaccess`](.htaccess#L34) |
| **Clickjacking & MIME Protection** | `X-Frame-Options: SAMEORIGIN` & `nosniff` | [`.htaccess`](.htaccess#L22-L28) |
| **DOM XSS Sanitization** | `sanitizeHTML()` helper encodes user inputs | [`index.html`](index.html#L217-L226) |
| **Form Spam & Bot Defense** | Hidden `_honey` trap input + FormSubmit CAPTCHA | [`index.html`](index.html#L1600-L1602) |
| **Sensitive File Protection** | Denies web access to `.git/`, `.github/`, `scripts/`, `src/3d/`, `.env`, `README.md`, build configs | [`.htaccess`](.htaccess) |
| **Speed Optimization** | Gzip compression + 1-year browser cache headers | [`.htaccess`](.htaccess#L40-L59) |

---

## 📁 Repository Structure

```
baten-creative-portfolio/
├── .github/
│   └── workflows/
│       └── deploy.yml           # GitHub Actions backup deployment workflow
├── .gitignore                   # Excludes .DS_Store, node_modules, env files
├── .htaccess                    # Hostinger Apache server configuration & security headers
├── _headers                     # Cloudflare/Netlify backup security headers
├── _redirects                   # Cloudflare/Netlify backup routing rules
├── 404.html                     # Custom branded 404 error page
├── favicon.ico                  # Site favicon
├── favicon.png                  # PNG favicon
├── index.html                   # Main single-page application & SEO schemas
├── package.json                 # Build scripts (Tailwind + 3D bundle)
├── tailwind.config.cjs          # Tailwind theme (brand colours & fonts)
├── README.md                    # Project, deployment, and upgradation manual
├── robots.txt                   # Search crawler directives
├── sitemap.xml                  # XML sitemap with image metadata for Google indexing
├── site.webmanifest             # PWA web manifest
├── scripts/
│   └── process_transparent_logo.py # Logo alpha extraction script
└── src/
    ├── assets/
    │   ├── Projects/            # Commercial 4K/vertical MP4 videos
    │   ├── reel/                # Frame atlas for the 3D reel (desktop + mobile sizes)
    │   └── baten/               # High-res portraits, avatars, brand stamps
    ├── 3d/
    │   └── reel.js              # THE REEL: scroll-driven 3D film strip (source)
    ├── components/
    │   ├── MotionEngine.js      # Spring physics, scroll velocity, viewfinder tracking
    │   └── reel3d.bundle.js     # Built from src/3d/reel.js + tree-shaken three.js (do not edit)
    ├── data/
    │   └── portfolioData.js     # Single source of truth for projects, services, bio
    └── styles/
        ├── main.css             # Design tokens, CRT grain, polaroid borders, brutalist tape, reel styles
        ├── tailwind.input.css   # Tailwind entry
        └── tailwind.css         # Compiled Tailwind (generated — npm run build:css)
```

---

## 📄 License & Ownership

© 2026 **Md Abu Baten**. All rights reserved.  
Directorial showcases, visual treatments, and commercial films are intellectual property of Md Abu Baten.
