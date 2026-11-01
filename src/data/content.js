/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  OPTIOBYTE.COM — ALL SITE CONTENT LIVES IN THIS ONE FILE         ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * How to update (on GitHub): open this file → click the pencil icon →
 * edit the text between the quotes → "Commit changes". The site
 * redeploys from `main` automatically.
 *
 * Rules that keep the site working:
 *  • Keep every value inside its quotes: "like this". To use a quote
 *    mark inside the text, write \" (backslash + quote).
 *  • Keep the commas at the end of lines exactly as they are.
 *  • To add a project / service / step, copy one whole { ... } block,
 *    paste it after the last one (with a comma between), and edit it.
 *  • Images and videos go in src/media/ — then put their path here.
 *
 * If a change breaks the page, the site shows a plain notice instead of
 * a blank screen; undo your last commit on GitHub to restore it.
 *
 * Replacing an image or video? Give the new file a NEW name (e.g.
 * coffee-poster-2.webp) — browsers keep old images for up to a year.
 *
 * Not in this file: the Google/social-share text (title, description,
 * share image) is in the <head> of index.html.
 */

export const content = {
  /* ── WHO YOU ARE ─────────────────────────────────────────────── */
  profile: {
    name: "Md Abu Baten",
    shortName: "Baten",
    role: "AI Creative Director & Generative Video Specialist",
    location: "Dhaka, Bangladesh",
    reach: "Directing for brands worldwide",
    email: "baten@optiobyte.com",
    bookingLink: "https://cal.com/abubaten",
    bookingLabel: "Book a 15-minute call",
    replyTime: "Replies within 24–48 hours",
    // Small round photo used in the header and contact card
    avatar: "./src/assets/baten/baten-avatar-128.webp",
    socials: [
      { label: "LinkedIn", url: "https://www.linkedin.com/in/mrbaten/" },
      { label: "Instagram", url: "https://www.instagram.com/baten.optiobyte/" },
      { label: "YouTube", url: "https://www.youtube.com/@HuzugeBiggan" },
      { label: "Facebook", url: "https://www.facebook.com/baten101" },
    ],
  },

  /* ── FIRST SCREEN ────────────────────────────────────────────── */
  hero: {
    headline: "I direct cinematic AI films that make brands unforgettable.",
    intro:
      "Senior creative direction meets generative video pipelines: broadcast-grade commercial films, tactile ad worlds and visual campaigns, made with cinematic taste and fast execution.",
    primaryAction: "Watch the films",
    secondaryAction: "Start a project",
    // The word the opening particles form (short, capitals work best)
    openingWord: "BATEN",
    // Small live caption under the hero while the particles change
    openingStatus: {
      noise: "Denoising",
      name: "Resolving",
      film: "Now rendering",
    },
  },

  /* ── ABOUT ───────────────────────────────────────────────────── */
  about: {
    title: "Behind the lens",
    body: [
      "Great films aren’t made by algorithms. They are made by taste, point of view and storytelling.",
      "I combine senior creative direction with generative video pipelines to turn ambitious scripts into broadcast-grade commercial films in days, not months. From prompt-locked character continuity to 35mm anamorphic lighting and tactile sound design, I treat generative AI as a precision camera system and production engine for brands that refuse to blend in.",
    ],
    // Photos shown in the 3D studio (portrait photos work best)
    photos: [
      { src: "./src/assets/baten/baten-laptop-1024.webp", alt: "Md Abu Baten at his workstation" },
      { src: "./src/assets/baten/baten-workspace-1024.webp", alt: "Baten's studio workspace" },
    ],
    principles: [
      {
        title: "Taste over technology",
        text: "AI creates pixels; creative direction creates meaning. Lens choice, key-to-fill lighting ratios and deliberate pacing are directed with human taste from day one.",
      },
      {
        title: "Continuity and polish",
        text: "No uncanny AI sheen. Locked faces, consistent product materials and optical-flow tracking keep commercial cuts free of morphing and distortion.",
      },
      {
        title: "Speed without compromise",
        text: "Traditional production takes months; raw AI generation lacks polish. I bridge both, delivering studio-grade campaigns in days so brands can test and scale fast.",
      },
    ],
  },

  /* ── WORK ────────────────────────────────────────────────────────
     youtubeId: the code after "watch?v=" or "shorts/" in a YouTube link.
     vertical: true for 9:16 Shorts, false for 16:9 films.
     poster: still image (src/media/…). loop: short silent clip played
     on the studio screens (optional — leave "" to show the poster). */
  works: [
    {
      title: "Coffee Commercials",
      tagline: "Cold coffee from bean to bottle",
      summary:
        "A cold coffee commercial built on slow-motion bean selection, bottle condensation and rich brew textures.",
      category: "Beverage commercial",
      year: "2026",
      youtubeId: "zmp8BQxVO6E",
      vertical: true,
      poster: "./src/media/coffee-poster-2.webp",
      loop: "./src/media/coffee-loop.mp4",
      role: "Creative direction, prompt architecture, generative motion, sound design",
      tools: "Runway Gen-3, Kling AI, Midjourney v6, DaVinci Resolve, Premiere Pro",
      challenge:
        "Capture the sensory richness and craft of specialty coffee without a costly multi-day studio shoot.",
      idea:
        "An intimate morning-ritual film: slow-motion pours, rising steam, warm amber tones and café acoustics.",
      execution:
        "A prompt-locked lighting and liquid-dynamics pipeline across Midjourney v6 and Runway Gen-3, with macro pour physics and a warm 35mm grade in DaVinci Resolve.",
      outcome:
        "A broadcast-ready 4K coffee commercial with rich sensory storytelling and premium brand positioning.",
    },
    {
      title: "MC Burger",
      tagline: "One bite, pure burger bliss",
      summary:
        "A high-energy fast-food spot driven by flame-grilled textures, kinetic burger assembly and macro crunch.",
      category: "Food commercial",
      year: "2026",
      youtubeId: "hDvPZ9c22Gw",
      vertical: true,
      poster: "./src/media/burger-poster.webp",
      loop: "./src/media/burger-loop.mp4",
      role: "Creative direction, 3D reference alignment, AI motion direction, sound design",
      tools: "Kling AI, Runway Gen-3, Midjourney v6, After Effects, DaVinci Resolve",
      challenge:
        "AI food footage often looks flat or rubbery without strict material and gravity continuity.",
      idea:
        "Turn the burger build into a kinetic spectacle: open flames, flying sesame buns, melting cheddar and crisp lettuce snaps.",
      execution:
        "3D spatial references combined with Kling AI motion brushes to lock layer geometry while generating realistic melting cheese and smoke.",
      outcome:
        "An appetising, high-energy commercial ready for broadcast and digital performance campaigns.",
    },
    {
      title: "Zingora Crunch",
      tagline: "Spicy blast, in slow motion",
      summary:
        "A hyper-sensory snack commercial built on acoustic crunch, pop colour and flying seasoning.",
      category: "Snack commercial",
      year: "2026",
      youtubeId: "aBxnXEPCx9I",
      vertical: false,
      poster: "./src/media/zingora-poster-2.webp",
      loop: "./src/media/zingora-loop.mp4",
      role: "Creative direction, treatment, particle physics, colour pipeline",
      tools: "Midjourney v6, Runway Gen-3, Kling AI, DaVinci Resolve, Premiere Pro",
      challenge:
        "Snack ads must stop the scroll in under two seconds and make people hear the crunch.",
      idea:
        "A saturated, playful world where every chip snap releases a slow-motion shockwave of flavour and seasoning.",
      execution:
        "Ultra-slow-motion particle passes in Runway Gen-3, pop-colour grading in DaVinci Resolve and layered micro-foley.",
      outcome:
        "An arresting commercial suite made for social ads and brand rollouts.",
    },
  ],
  workTitle: "Selected films",
  workIntro: "Playing on the monitors in the studio. Open any film to watch it in full.",
  // Shown under the work section. Keep it accurate.
  workNote:
    "Featured films are directorial showcases and spec campaigns made to demonstrate broadcast-grade standards. Client references on request.",

  /* ── SERVICES ────────────────────────────────────────────────── */
  servicesTitle: "What I make",
  services: [
    {
      title: "AI commercials and brand films",
      text: "Story-led commercial spots from treatment to broadcast-ready master: prompt-locked characters and products, directed motion passes, polished edits for TV, web and paid media.",
      deliverables: ["Director's treatment", "Storyboards", "15 / 30 / 60s masters", "Colour grade and mix"],
    },
    {
      title: "Generative video and modular ads",
      text: "Modular video built for paid and organic social: 20+ distinct hooks, lighting setups and emotional angles per sprint, so you find the winner and scale it.",
      deliverables: ["20–40 cut variations", "9:16, 1:1, 16:9 exports", "Hook variants", "Fast iteration"],
    },
    {
      title: "Visual world-building and launches",
      text: "Product worlds that would be too costly or impossible to shoot: liquid macro physics, botanical refractions, futuristic architecture with real material texture.",
      deliverables: ["World visual bible", "Macro product passes", "3D / AI hybrid assets", "Campaign key art"],
    },
    {
      title: "Creative direction and pitch treatments",
      text: "Senior creative leadership for agencies preparing pitches: visual treatments, AI proof-of-concept mood films, camera style guides and prompt bibles.",
      deliverables: ["Pitch deck and treatment", "60s mood film", "Camera grammar guide", "Presentation assets"],
    },
    {
      title: "Campaign concepts and visual strategy",
      text: "The core visual idea and narrative hook for multi-platform campaigns, tied to the brand's truth and pushed with modern generative tools.",
      deliverables: ["Concept document", "Keyframe storyboards", "Motion design system", "Rollout plan"],
    },
    {
      title: "Social-first motion",
      text: "Vertical films made to hold attention in the first second: editorial pacing, sound design and unexpected generative visuals that get shared.",
      deliverables: ["9:16 video suites", "Micro-narratives", "Trend interpretations", "Audio-synced cuts"],
    },
  ],

  /* ── PROCESS (shown in order) ────────────────────────────────── */
  processTitle: "How a film gets made",
  process: [
    {
      title: "Concept and treatment",
      text: "We clarify the objective, audience hook and story arc. I write a director's treatment covering tone, camera grammar and colour, with keyframe storyboards, before a single frame is generated.",
      milestone: "Approved treatment",
    },
    {
      title: "Continuity locks",
      text: "I lock character faces, product geometry and lighting references across Midjourney, ComfyUI and 3D passes, so nothing morphs between shots.",
      milestone: "Locked references",
    },
    {
      title: "Generative passes",
      text: "Camera moves, speed ramps and character motion directed in Runway Gen-3, Kling AI and optical-flow tools. Every shot has intent; nothing is left to generation luck.",
      milestone: "Selected takes",
    },
    {
      title: "Edit, grade and sound",
      text: "Cut in Premiere Pro, graded in DaVinci Resolve, layered with foley, sound design and voiceover. A broadcast master, delivered on schedule.",
      milestone: "Broadcast master",
    },
  ],

  /* ── INDUSTRIES ──────────────────────────────────────────────── */
  industriesLabel: "Industries",
  industries: [
    "Consumer tech",
    "Skincare and DTC",
    "Beverage and FMCG",
    "Fashion and apparel",
    "Wellness and med-spa",
    "Entertainment",
  ],

  /* ── CONTACT ─────────────────────────────────────────────────── */
  contact: {
    title: "Your brand is next on the slate",
    text: "Have a commercial, product launch or generative campaign coming up? Send the brief and I'll reply with next steps.",
    projectTypes: ["Commercial spot", "Generative video", "Creative direction", "Retainer or consulting"],
    directLabel: "Prefer email or a call?",
    // Form submissions are sent through FormSubmit to this address
    formEmail: "baten@optiobyte.com",
  },
};
