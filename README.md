# Md Abu Baten · AI Creative Director Portfolio

Official portfolio website for **Md Abu Baten** — AI Creative Director & Generative Video Specialist based in Dhaka, Bangladesh directing cinematic AI commercials and brand films worldwide.

🌐 **Production Domain:** [https://optiobyte.com](https://optiobyte.com)  
✉️ **Direct Contact:** [baten@optiobyte.com](mailto:baten@optiobyte.com)

---

## ⚡ Tech Stack & Architecture

- **Core:** Semantic HTML5, Vanilla JavaScript (ES Modules)
- **Styling:** Custom Design System (`src/styles/main.css`) + Tailwind CSS
- **Interaction Engine:** Bespoke physics-driven `MotionEngine.js`
- **Deployment:** GitHub Actions CI/CD ➔ Hostinger Web Hosting via FTPS
- **DNS & CDN:** Cloudflare (Edge Caching, DDoS Protection, DNSSEC)
- **Web Server:** Apache / LiteSpeed (`.htaccess` with strict CSP, HSTS, Gzip, and Cache-Control)

---

## 🚀 Automated Deployment Pipeline

Any commit pushed to the `main` branch automatically triggers the GitHub Actions workflow in `.github/workflows/deploy.yml` to sync changed files to Hostinger's `public_html/`.

### Required GitHub Secrets
To enable automated deployments, add the following secrets in **Settings ➔ Secrets and variables ➔ Actions**:

| Secret Name | Value Description |
| :--- | :--- |
| `FTP_SERVER` | Hostinger FTP Hostname (e.g. `ftp.optiobyte.com` or Hostinger Server IP) |
| `FTP_USERNAME` | Hostinger FTP Username (e.g. `u123456789`) |
| `FTP_PASSWORD` | Hostinger FTP Account Password |

---

## 🔒 Security & Performance Features

- **Content Security Policy (CSP):** Restricts script, style, and media sources.
- **Strict-Transport-Security (HSTS):** Enforces HTTPS with preload.
- **X-Frame-Options & Nosniff:** Prevents clickjacking and MIME sniffing.
- **Client-Side Form Sanitization & Honeypot:** Neutralizes injection vectors and spam bots.
- **Browser Caching & Gzip Compression:** Configured via `.htaccess` for optimal Core Web Vitals.
