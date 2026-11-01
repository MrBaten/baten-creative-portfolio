# Md Abu Baten · AI Creative Director — optiobyte.com

Personal site of **Md Abu Baten**: a neon night film studio in 3D that you scroll through.
It opens with ~30,000 glowing particles that turn from noise into the name "BATEN" and then into
frames from the commercials (the way generative video turns noise into film). Scrolling blows the
particles past the camera into the studio: portraits, monitors playing the films, a neon lighting
rig, a dolly track and a clapperboard. Palette: midnight indigo, electric cyan, solar orange, laser lime.

- Live: https://optiobyte.com
- Repo: https://github.com/MrBaten/baten-creative-portfolio
- Contact: baten@optiobyte.com

---

## ✏️ Updating your content (no code)

**Everything you see on the site lives in one file: [`src/data/content.js`](src/data/content.js).**

1. Open the file on GitHub and click the **pencil** icon.
2. Edit the text between the quotes. The comments in the file explain each part.
3. Click **Commit changes**. Hostinger redeploys from `main` within seconds.

| To change… | Edit in `content.js` |
| :--- | :--- |
| Name, role, email, booking link, social links | `profile` |
| Headline, intro, opening word and caption | `hero` |
| About text, photos, principles | `about` |
| Films (title, YouTube ID, text, case study) | `works` |
| Services and deliverables | `services` |
| Process steps | `process` |
| Industries | `industries` |
| Contact heading, project types, form email | `contact` |

**Adding a new film**
1. Put a portrait poster image (about 720 × 1280, `.webp` or `.jpg`) in `src/media/`.
   The opening particles redraw the first three posters, so pick a clear, simple frame
   (one product, strong light) rather than a busy one.
2. Optional: a short silent loop for the studio monitors (5–8 s, `.mp4`, under ~1 MB) in `src/media/`.
3. Copy one `{ … }` block in `works`, paste it after the last one, and fill it in
   (`youtubeId` is the code after `shorts/` or `watch?v=` in the YouTube link).
   The studio shows the first three films on its monitors; the list shows all of them.

**If an edit breaks the page**, the site shows a notice naming `content.js` instead of a blank screen.
Open the file's history on GitHub and revert your last commit, or fix the missing quote or comma.

Search-engine text (page title, description, share image) is in the `<head>` of `index.html`.

---

## 🧱 How it's built

```
index.html               Page shell, SEO metadata, structured data
src/data/content.js      ALL site content (edit this)
src/app/main.js          Renders content, navigation, film player, contact form, scroll → camera
src/app/world.bundle.js  Built 3D studio (do not edit — generated from src/3d/world.js)
src/3d/world.js          3D studio source (Three.js)
src/styles/site.css      Design system and layout
src/media/               Film posters and silent preview loops
src/assets/baten/        Photos, avatar, share card
404.html                 Not-found page
.htaccess                HTTPS, security headers (CSP), caching
```

- Text is real HTML (readable by search engines and screen readers, works on every phone).
  The 3D studio is drawn behind it and loads after the text.
- Without WebGL, or with data saver on, the page shows a soft studio backdrop instead.
- With "reduce motion" turned on, the camera follows the scroll with no extra animation.
- The 3D measures its own frame rate and steps down on slow devices: edge smoothing, then
  resolution, then the glow, then half the particles. It stops drawing when nothing moves.
- Mouse and trackpad scrolling is smoothed (Lenis) so the page and the 3D move together.
  Phones keep native scrolling; it's off for people who turn on "reduce motion".
- Avoid `backdrop-filter` blur on anything that sits over the 3D: it forces the browser to
  re-blur the moving canvas every frame.

### Editing the 3D studio (developers)

```bash
npm install
npm run build      # rebuild src/app/world.bundle.js (3D) and src/app/scroll.bundle.js (smooth scroll)
```

When you change `site.css`, `main.js` or the bundle, bump the `?v=` number on their links in
`index.html` so returning visitors don't get the old cached file. `content.js` is never cached.

---

## 🚀 Deployment

Push to `main` on GitHub → Hostinger pulls it (Websites → optiobyte.com → Advanced → Git → Deploy,
or automatically with the webhook). Cloudflare sits in front: if something looks stale,
purge its cache (Caching → Purge Everything).

Rollback: `git revert HEAD && git push origin main`.

---

© 2026 Md Abu Baten. All rights reserved. Films and visuals are the property of Md Abu Baten.
