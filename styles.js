// One stylesheet, inlined into every page. No build step, no external request,
//
// The base colours are the default theme's, taken from themes.js rather than
// written out again, so the palette an agent is told about over MCP cannot
// drift from the one in the page.
const { THEMES, paletteCss } = require('./themes');

module.exports = `
${paletteCss(THEMES.default)}
:root { --measure: 68ch; --wide: 1080px; }
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0; background: var(--bg); color: var(--fg);
  font: 17px/1.65 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
main { max-width: var(--wide); margin: 0 auto; padding: 0 1.25rem; }
.block { padding: 3.5rem 0; border-bottom: 1px solid var(--line); }
.block:last-child { border-bottom: 0; }
h1, h2, h3 { line-height: 1.15; letter-spacing: -0.02em; margin: 0 0 .6em; }
h1 { font-size: clamp(2.1rem, 5.5vw, 3.6rem); }
h2 { font-size: clamp(1.5rem, 3vw, 2.1rem); }
p, ul, ol { max-width: var(--measure); }
p { margin: 0 0 1.1em; }
a { color: var(--accent); }
img { max-width: 100%; height: auto; display: block; border-radius: 12px; }
code { background: var(--soft); padding: .15em .4em; border-radius: 5px; font-size: .9em; }
pre { background: var(--soft); padding: 1rem; border-radius: 10px; overflow-x: auto; }
pre code { background: none; padding: 0; }
blockquote { margin: 0 0 1.1em; padding-left: 1rem; border-left: 3px solid var(--line); color: var(--muted); }

.eyebrow {
  text-transform: uppercase; letter-spacing: .12em; font-size: .74rem;
  font-weight: 600; color: var(--muted); margin: 0 0 1rem;
}
.hero { padding: 5rem 0 4rem; }
.hero h2 { font-size: clamp(1.05rem, 2.2vw, 1.35rem); font-weight: 400; color: var(--muted); letter-spacing: 0; }

.split { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: center; }
.split-reverse .split-text { order: 2; }
@media (max-width: 760px) { .split { grid-template-columns: 1fr; gap: 2rem; } .split-reverse .split-text { order: 0; } }

.cta { text-align: center; }
.cta-inner { background: var(--soft); border: 1px solid var(--line); border-radius: 18px; padding: 3rem 1.5rem; }
.cta p, .cta h2 { margin-left: auto; margin-right: auto; }

.actions { display: flex; flex-wrap: wrap; gap: .75rem; margin: 1.6rem 0 0; }
.cta .actions { justify-content: center; }
.btn {
  display: inline-block; padding: .7rem 1.3rem; border-radius: 10px;
  text-decoration: none; font-weight: 600; font-size: .95rem;
  border: 1px solid var(--accent);
}
.btn-primary { background: var(--accent); color: var(--accent-fg); }
.btn-ghost, .btn-secondary { background: transparent; color: var(--accent); }
.btn:hover { opacity: .88; }

.site-nav { border-bottom: 1px solid var(--line); position: sticky; top: 0; background: var(--bg); z-index: 8; }
.nav-inner { max-width: var(--wide); margin: 0 auto; padding: .85rem 1.25rem; display: flex; align-items: center; gap: 1.25rem; }
.nav-brand { font-weight: 700; text-decoration: none; color: var(--fg); letter-spacing: -.01em; }
.nav-links { margin-left: auto; display: flex; gap: 1.1rem; flex-wrap: wrap; }
.nav-links a { text-decoration: none; font-size: .92rem; color: var(--muted); }
.nav-links a:hover { color: var(--fg); }

.feature-grid { display: grid; grid-template-columns: repeat(var(--cols, 3), 1fr); gap: 1.5rem; margin-top: 1.5rem; }
@media (max-width: 820px) { .feature-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 560px) { .feature-grid { grid-template-columns: 1fr; } }
.feature h3 { font-size: 1.02rem; margin: 0 0 .35rem; }
.feature p { color: var(--muted); margin: 0; max-width: none; }
.feature-icon { font-size: 1.6rem; line-height: 1; margin-bottom: .55rem; }

.stat-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1.25rem; margin-top: 1.4rem; }
.stat-value { font-size: clamp(1.9rem, 4vw, 2.7rem); font-weight: 700; letter-spacing: -.03em; line-height: 1.05; }
.stat-label { color: var(--muted); font-size: .86rem; margin-top: .15rem; }

.quote blockquote { border-left: 0; padding: 0; margin: 0; font-size: clamp(1.15rem, 2.4vw, 1.5rem); line-height: 1.45; color: var(--fg); }
.quote blockquote p { max-width: 46ch; }
.quote-by { color: var(--muted); font-size: .88rem; margin-top: .8rem; }

.tier-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 1.1rem; margin-top: 1.6rem; align-items: start; }
.tier { border: 1px solid var(--line); border-radius: 16px; padding: 1.4rem 1.35rem; background: var(--soft); }
.tier-featured { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
.tier h3 { font-size: 1rem; margin: 0 0 .5rem; }
.tier-price { font-size: 1.9rem; font-weight: 700; letter-spacing: -.03em; margin: 0 0 .4rem; max-width: none; }
.tier-price span { font-size: .85rem; font-weight: 400; color: var(--muted); letter-spacing: 0; margin-left: .25rem; }
.tier-body { color: var(--muted); font-size: .9rem; margin: 0 0 .8rem; max-width: none; }
.tier-feats { list-style: none; padding: 0; margin: 0 0 .3rem; }
.tier-feats li { padding: .3rem 0 .3rem 1.3rem; position: relative; font-size: .92rem; }
.tier-feats li::before { content: "✓"; position: absolute; left: 0; color: var(--accent); font-weight: 700; }
.tier .actions { margin-top: 1rem; }

.faq-list { margin-top: 1.2rem; max-width: var(--measure); }
.faq-list details { border-bottom: 1px solid var(--line); padding: .2rem 0; }
.faq-list summary { cursor: pointer; padding: .85rem 0; font-weight: 600; list-style: none; }
.faq-list summary::-webkit-details-marker { display: none; }
.faq-list summary::before { content: "+"; color: var(--accent); font-weight: 700; margin-right: .6rem; }
.faq-list details[open] summary::before { content: "–"; }
.faq-a { padding: 0 0 .9rem 1.35rem; color: var(--muted); }
.faq-a p { margin: 0 0 .6em; }

.site-footer { color: var(--muted); font-size: .88rem; }
.footer-links { display: flex; flex-wrap: wrap; gap: 1.2rem; }
.footer-links a { text-decoration: none; }
.footer-note { margin: 1rem 0 0; max-width: none; }

.card-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 1rem; margin-top: 1.75rem;
}
.card {
  position: relative; border: 1px solid var(--line); border-radius: 14px;
  padding: 1.15rem 1.2rem 1rem; background: var(--soft);
  display: flex; flex-direction: column; gap: .2rem;
}
.card-link { text-decoration: none; color: inherit; }
.card-link[aria-disabled="true"] { pointer-events: none; opacity: .65; }
.card h3 { font-size: 1.02rem; margin: 0 0 .2rem; letter-spacing: -.01em; }
.card-host { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: .8rem; color: var(--accent); margin: 0 0 .5rem; max-width: none; }
.card-meta { font-size: .76rem; color: var(--muted); margin: auto 0 0; max-width: none; }
.card-edit { font-size: .78rem; margin-top: .55rem; font-weight: 600; }
.card-del { position: absolute; top: .5rem; right: .55rem; margin: 0; }
.card-del button {
  background: transparent; border: 1px solid var(--line); color: var(--muted);
  width: 26px; height: 26px; border-radius: 8px; cursor: pointer; line-height: 1; font-size: 1rem;
}
.card-del button:hover { border-color: #ef4444; color: #ef4444; }
.note { color: var(--muted); }

footer { max-width: var(--wide); margin: 0 auto; padding: 2.5rem 1.25rem 4rem; color: var(--muted); font-size: .85rem; }

/* tone= paints a band across the whole window while the content keeps the
   page's measure: the shadow and clip-path reach past main's max-width. The
   colours are re-declared on the band, so every block inside reads right. */
.tone-soft, .tone-accent, .tone-dark {
  background: var(--bg); color: var(--fg); border-bottom-color: transparent;
  box-shadow: 0 0 0 100vmax var(--bg); clip-path: inset(0 -100vmax);
}
.tone-soft { --bg: var(--soft); }
.tone-dark {
  --bg: #0d0f14; --fg: #eef1f5; --muted: #a4adbb; --line: #2a303b; --soft: #171b23;
}
.tone-accent {
  --bg: var(--accent); --fg: var(--accent-fg); --line: color-mix(in srgb, var(--accent-fg) 25%, transparent);
  --muted: color-mix(in srgb, var(--accent-fg) 78%, transparent); --soft: color-mix(in srgb, var(--accent-fg) 10%, transparent);
}
.tone-accent a { color: inherit; }
.tone-accent .btn-primary { background: var(--accent-fg); color: var(--accent); border-color: var(--accent-fg); }
.tone-accent .btn-ghost, .tone-accent .btn-secondary { color: var(--accent-fg); border-color: var(--accent-fg); }
.tone-accent .mark-yes, .tone-accent .feature-icon, .tone-accent .step-n { color: inherit; }
.tone-dark .cta-inner, .tone-accent .cta-inner { background: var(--soft); }

.align-center { text-align: center; }
.align-center p, .align-center ul, .align-center ol, .align-center h1, .align-center h2 { margin-left: auto; margin-right: auto; }
.align-center .actions, .align-center .logo-row { justify-content: center; }

.hero-media { display: grid; grid-template-columns: 1.1fr .9fr; gap: 3rem; align-items: center; }
.hero-media .hero-picture img { border-radius: 18px; box-shadow: 0 24px 60px -30px rgba(0,0,0,.45); }
@media (max-width: 820px) { .hero-media { grid-template-columns: 1fr; gap: 2rem; } }

.banner { padding: .75rem 0; font-size: .92rem; text-align: center; }
.banner p { margin: 0 auto; max-width: none; }
.banner .btn { padding: .3rem .8rem; font-size: .82rem; margin-left: .7rem; vertical-align: middle; }

.link-card-grid { display: grid; grid-template-columns: repeat(var(--cols, 3), 1fr); gap: 1.25rem; margin-top: 1.5rem; }
@media (max-width: 820px) { .link-card-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 560px) { .link-card-grid { grid-template-columns: 1fr; } }
.link-card {
  display: flex; flex-direction: column; border: 1px solid var(--line); border-radius: 16px;
  background: var(--soft); overflow: hidden; color: inherit; text-decoration: none; text-align: left;
}
a.link-card { transition: transform .15s ease, border-color .15s ease; }
a.link-card:hover { transform: translateY(-2px); border-color: var(--accent); }
.card-img { border-radius: 0; aspect-ratio: 16 / 9; object-fit: cover; width: 100%; }
.card-body { padding: 1.15rem 1.25rem 1.25rem; display: flex; flex-direction: column; gap: .35rem; flex: 1; }
.card-body h3 { font-size: 1.05rem; margin: 0; }
.card-body p { margin: 0; color: var(--muted); font-size: .93rem; max-width: none; }
.card-tag { text-transform: uppercase; letter-spacing: .1em; font-size: .7rem !important; font-weight: 700; color: var(--accent) !important; }
.card-cta { margin-top: auto !important; padding-top: .6rem; font-weight: 600; color: var(--accent) !important; }

.step-list { list-style: none; padding: 0; margin: 1.6rem 0 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.6rem; max-width: none; counter-reset: none; text-align: left; }
.step { display: flex; gap: .9rem; align-items: flex-start; }
.step-n {
  flex: none; width: 2.3rem; height: 2.3rem; border-radius: 50%; display: grid; place-items: center;
  border: 2px solid var(--accent); color: var(--accent); font-weight: 700;
}
.step h3 { font-size: 1.02rem; margin: .35rem 0 .3rem; }
.step p { margin: 0; color: var(--muted); }

.logos { padding: 2.2rem 0; }
.logos-title { text-transform: uppercase; letter-spacing: .12em; font-size: .72rem; font-weight: 600; color: var(--muted); margin: 0 0 1rem; max-width: none; }
.logo-row { display: flex; flex-wrap: wrap; align-items: center; gap: 1rem 2.4rem; }
.logo { color: var(--muted); text-decoration: none; }
.logo-name { font-weight: 800; font-size: 1.15rem; letter-spacing: -.02em; opacity: .8; }
.logo-img { height: 30px; width: auto; border-radius: 0; filter: grayscale(1); opacity: .75; }

.testimonial-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem; margin-top: 1.5rem; text-align: left; }
.testimonial { margin: 0; border: 1px solid var(--line); border-radius: 16px; padding: 1.4rem; background: var(--soft); display: flex; flex-direction: column; gap: 1rem; }
.testimonial blockquote { margin: 0; padding: 0; border: 0; color: var(--fg); font-size: 1.02rem; line-height: 1.55; }
.testimonial blockquote::before { content: "“"; display: block; font-size: 2.4rem; line-height: .6; color: var(--accent); margin-bottom: .3rem; }
.testimonial figcaption { display: flex; align-items: center; gap: .6rem; color: var(--muted); font-size: .86rem; margin-top: auto; }
.avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }

.compare-wrap { overflow-x: auto; margin-top: 1.4rem; }
.compare-table { width: 100%; border-collapse: collapse; font-size: .95rem; min-width: 480px; }
.compare-table th, .compare-table td { padding: .8rem .9rem; border-bottom: 1px solid var(--line); text-align: center; }
.compare-table th[scope="row"] { text-align: left; font-weight: 500; }
.compare-table thead th { font-weight: 700; font-size: .9rem; }
.compare-table .col-hl { background: color-mix(in srgb, var(--accent) 9%, transparent); }
.compare-table thead .col-hl { color: var(--accent); }
.mark-yes { color: var(--accent); font-weight: 800; font-size: 1.1rem; }
.mark-no { color: var(--muted); opacity: .7; }
.mark-partial { color: var(--muted); font-size: .85rem; }

.gallery-grid { display: grid; grid-template-columns: repeat(var(--cols, 3), 1fr); gap: 1rem; margin-top: 1.4rem; }
@media (max-width: 680px) { .gallery-grid { grid-template-columns: 1fr 1fr; } }
.gallery-grid figure { margin: 0; }
.gallery-grid img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }
.gallery-grid figcaption { color: var(--muted); font-size: .85rem; margin-top: .45rem; }

.video-frame { position: relative; aspect-ratio: 16 / 9; border-radius: 16px; overflow: hidden; background: #000; }
.video-frame iframe, .video-frame video { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
.video-caption { margin-top: 1rem; color: var(--muted); }
`;
