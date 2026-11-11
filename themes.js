// A theme is a palette, a typeface pairing and one signature detail.
//
// The signature matters more than it sounds: without it every theme is the
// same page in different colours, and an agent choosing between them is
// guessing. With it, "editorial" means a drop cap and "brutalist" means hard
// edges and no radius — something you can describe in one sentence and
// recognise at a glance.

const { FONTS } = require('./blocks');

const THEMES = {
  default: {
    description: 'Clean sans-serif, indigo accent. Signature: none — the neutral baseline.',
    css: ''
  },

  editorial: {
    description: 'Serif headlines, generous measure, cream paper. Signature: drop cap on the first paragraph after a heading.',
    css: `
      --bg: #fbfaf7; --fg: #1c1a17; --muted: #6b645b; --line: #e6e0d6;
      --accent: #9a3412; --accent-fg: #fff8f2; --soft: #f4f0e8;
      --measure: 62ch;
    `,
    extra: `
      body { font-family: ui-serif, Georgia, "Times New Roman", serif; }
      h1, h2, h3 { font-weight: 500; letter-spacing: -0.015em; }
      .block.text > p:first-of-type::first-letter {
        float: left; font-size: 3.1em; line-height: .84; padding: .05em .08em 0 0;
        font-weight: 600; color: var(--accent);
      }
      @media (prefers-color-scheme: dark) {
        :root { --bg: #17150f; --fg: #ece6da; --muted: #a49a89; --line: #2f2a20;
                --accent: #f0a071; --accent-fg: #1a1209; --soft: #201c15; }
      }
    `
  },

  brutalist: {
    description: 'Monospace, black on white, hard borders, no rounded corners. Signature: heavy rules above every block.',
    css: `
      --bg: #ffffff; --fg: #000000; --muted: #444444; --line: #000000;
      --accent: #0000ee; --accent-fg: #ffffff; --soft: #f2f2f2;
    `,
    extra: `
      body { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
      h1, h2, h3 { letter-spacing: -0.03em; text-transform: uppercase; }
      .block { border-top: 4px solid var(--line); border-bottom: 0; }
      .block:first-child { border-top: 0; }
      .btn, .cta-inner, img, pre, code { border-radius: 0; }
      .btn { border-width: 2px; }
      .cta-inner { border-width: 3px; }
      @media (prefers-color-scheme: dark) {
        :root { --bg: #000000; --fg: #ffffff; --muted: #aaaaaa; --line: #ffffff;
                --accent: #7ce3ff; --accent-fg: #000000; --soft: #111111; }
      }
    `
  },

  warm: {
    description: 'Soft terracotta and oat, rounded shapes, friendly. Signature: pill-shaped buttons and a tinted hero.',
    css: `
      --bg: #fffaf5; --fg: #2b1f18; --muted: #7a6659; --line: #efe1d4;
      --accent: #c2410c; --accent-fg: #fff7f1; --soft: #fdf0e4;
    `,
    extra: `
      .btn { border-radius: 999px; padding-inline: 1.6rem; }
      .hero { background: linear-gradient(180deg, var(--soft), transparent); border-radius: 22px; padding-inline: 1.5rem; }
      img, .cta-inner { border-radius: 22px; }
      @media (prefers-color-scheme: dark) {
        :root { --bg: #1a1310; --fg: #f3e6dc; --muted: #b39c8c; --line: #33241c;
                --accent: #fb923c; --accent-fg: #1a1006; --soft: #241811; }
      }
    `
  },

  midnight: {
    description: 'Dark by default, cyan accent, tight type. Signature: a glowing hairline under the hero.',
    css: `
      --bg: #0a0f16; --fg: #dfe7f0; --muted: #8ba0b8; --line: #1d2735;
      --accent: #22d3ee; --accent-fg: #04222a; --soft: #111a24;
    `,
    extra: `
      body { font-family: ui-sans-serif, system-ui, sans-serif; }
      h1, h2 { letter-spacing: -0.035em; }
      .hero { border-bottom: 1px solid var(--accent); box-shadow: 0 1px 24px -8px var(--accent); }
      .btn-primary { box-shadow: 0 0 24px -6px var(--accent); }
      /* Dark-first: the light override is the exception, not the default. */
      @media (prefers-color-scheme: light) {
        :root { --bg: #f4f8fb; --fg: #0d1620; --muted: #4a6076; --line: #d9e3ed;
                --accent: #0e7490; --accent-fg: #ffffff; --soft: #e8eff6; }
      }
    `
  },

  aurora: {
    description: 'Deep violet night in both colour schemes, glowing gradients, glassy cards. Signature: a gradient headline over an aurora-lit hero.',
    css: `
      --bg: #0b0a1a; --fg: #ecebff; --muted: #a9a7cf; --line: #25234a;
      --accent: #a78bfa; --accent-fg: #160b33; --soft: rgba(255,255,255,.045);
    `,
    extra: `
      .hero {
        background:
          radial-gradient(60% 80% at 15% 10%, rgba(167,139,250,.28), transparent 60%),
          radial-gradient(50% 70% at 90% 30%, rgba(45,212,191,.20), transparent 60%);
        border-radius: 28px; padding-inline: clamp(1.25rem, 4vw, 3rem); border-bottom: 0; margin-top: 1.25rem;
      }
      .hero h1 {
        background: linear-gradient(100deg, #fff 10%, #c4b5fd 45%, #5eead4 90%);
        -webkit-background-clip: text; background-clip: text; color: transparent;
      }
      .feature, .tier, .link-card, .testimonial, .card { backdrop-filter: blur(6px); border-color: rgba(255,255,255,.09); }
      .btn { border-radius: 999px; }
      .btn-primary { background: linear-gradient(100deg, #a78bfa, #5eead4); border: 0; color: #120a2a; }
    `
  },

  swiss: {
    description: 'White, black and signal red, grotesque type, strict left alignment. Signature: oversized tight headlines and a red square before every section heading.',
    css: `
      --bg: #ffffff; --fg: #111111; --muted: #555555; --line: #111111;
      --accent: #e10600; --accent-fg: #ffffff; --soft: #f3f3f3;
    `,
    extra: `
      body { font-family: "Helvetica Neue", Helvetica, Arial, "Nimbus Sans", sans-serif; }
      h1 { font-size: clamp(2.6rem, 8vw, 5.4rem); font-weight: 800; letter-spacing: -.055em; line-height: .95; }
      h2 { font-weight: 700; letter-spacing: -.035em; }
      .block > h2::before, .block .split-text > h2::before, .cta-inner > h2::before {
        content: ""; display: inline-block; width: .55em; height: .55em; background: var(--accent);
        margin-right: .45em; vertical-align: .05em;
      }
      .block { border-bottom: 2px solid var(--line); }
      .btn, img, .cta-inner, .tier, .link-card, .testimonial, .feature, .card, .video-frame { border-radius: 0; }
      .btn-primary { background: var(--accent); border-color: var(--accent); }
      @media (prefers-color-scheme: dark) {
        :root { --bg: #0f0f0f; --fg: #f4f4f4; --muted: #a8a8a8; --line: #f4f4f4;
                --accent: #ff3b30; --accent-fg: #ffffff; --soft: #1b1b1b; }
      }
    `
  },

  playful: {
    description: 'Candy pastels, chunky outlines, rounded type. Signature: hard offset shadows that make buttons and cards look like stickers.',
    css: `
      --bg: #fff7fb; --fg: #2a1b3d; --muted: #6c5a80; --line: #2a1b3d;
      --accent: #7c3aed; --accent-fg: #ffffff; --soft: #fde7f3;
    `,
    extra: `
      body { font-family: ui-rounded, "SF Pro Rounded", "Nunito", "Varela Round", system-ui, sans-serif; }
      h1, h2 { letter-spacing: -.025em; }
      .block { border-bottom: 0; }
      .btn, .tier, .link-card, .testimonial, .cta-inner, .card { border: 2px solid var(--line); box-shadow: 5px 5px 0 var(--line); }
      .btn { border-radius: 14px; transition: transform .1s ease, box-shadow .1s ease; }
      .btn:hover { transform: translate(2px, 2px); box-shadow: 3px 3px 0 var(--line); opacity: 1; }
      .btn-ghost { background: #fff; }
      .tier, .link-card, .testimonial, .cta-inner { border-radius: 20px; }
      .tier:nth-child(3n+1), .link-card:nth-child(3n+1), .testimonial:nth-child(3n+1) { background: #e0f2fe; }
      .tier:nth-child(3n+2), .link-card:nth-child(3n+2), .testimonial:nth-child(3n+2) { background: #fef9c3; }
      .tier:nth-child(3n+3), .link-card:nth-child(3n+3), .testimonial:nth-child(3n+3) { background: #dcfce7; }
      .feature-icon { display: inline-grid; place-items: center; width: 3rem; height: 3rem; border-radius: 14px; background: var(--soft); border: 2px solid var(--line); }
      img { border: 2px solid var(--line); border-radius: 20px; }
      @media (prefers-color-scheme: dark) {
        :root { --bg: #1b1326; --fg: #fbeffd; --muted: #c6b3d6; --line: #fbeffd;
                --accent: #c4b5fd; --accent-fg: #1b1326; --soft: #2a1f3a; }
        .btn-ghost { background: transparent; }
        .tier:nth-child(n), .link-card:nth-child(n), .testimonial:nth-child(n) { background: var(--soft); }
      }
    `
  }
};

function themeCss(name) {
  const theme = THEMES[name] || THEMES.default;
  const vars = theme.css ? `:root {${theme.css}}` : '';
  return `${vars}\n${theme.extra || ''}`;
}

function normaliseHex(value) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(value || '').trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split('').map(c => c + c).join('') : m[1];
  return `#${h.toLowerCase()}`;
}

// Text on an accent-coloured button has to stay readable whatever colour an
// agent picks, so the foreground is chosen from the colour's luminance.
function readableOn(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return L > 0.36 ? '#111111' : '#ffffff';
}

// The theme, then the page's own accent and typeface on top. Eight themes times
// any colour times four typefaces is what keeps a hundred campaign pages from
// looking like one page with the words changed.
function siteCss(meta = {}) {
  let css = themeCss(meta.theme);
  const accent = normaliseHex(meta.accent);
  const overrides = [];
  if (accent) overrides.push(`--accent: ${accent}; --accent-fg: ${readableOn(accent)};`);
  // A media query adds no specificity, so this rule, coming last, also beats
  // the accent a theme sets for dark mode.
  if (overrides.length) css += `\n:root { ${overrides.join(' ')} }`;
  const font = FONTS[String(meta.font || '').toLowerCase()];
  if (font) css += `\nbody { font-family: ${font}; }`;
  return css;
}

function listThemes() {
  return Object.entries(THEMES).map(([name, t]) => ({ name, description: t.description }));
}

module.exports = { THEMES, themeCss, siteCss, listThemes, normaliseHex };
