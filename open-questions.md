# Open Questions (for the owner)

Things genuinely needing your input, parked so they don't block the build. I'll bring
these to you at check-ins. Resolved items move to the bottom with the answer.

---

## Open

### Q1 — Clinical review of the safety numbers (important before any real use)
The hard environmental stop (extreme wet-bulb / heat-index thresholds) and the health-
screening rules (which conditions/medications/ages cap or withhold a plan) are my best,
**source-cited** starting points drawn from public guidance (NWS heat-index bands, WBGT
flag systems, heat-illness literature). They are coded as clearly-labeled, tunable
constants. **Before this is ever used by real people, a clinician should sanity-check
them.** Not a blocker for the prototype.

### Q2a — Hosting & domain (now that it's a static site)
**Resolved direction:** public, worldwide, **anonymous, no logins, no data collection** →
rebuilt fully client-side (decisions D21). `pnpm build` emits a static `out/` folder.
**Still needs you:** which host + domain? Cloudflare Pages, Netlify, GitHub Pages, or Vercel
all serve `out/` for free/cheap — I can set up whichever you pick and wire your domain.

### Q2b — Privacy/terms note + legal sanity-check (before launch)
Storing nothing server-side minimizes exposure, but a public health-adjacent tool should
still show a short **privacy note** (we keep the "wellness, not medical advice" framing) and
ideally get a quick **legal/clinician sanity-check**. I can draft the privacy/disclaimer
copy; the legal review is yours to arrange. Not a blocker to keep building.

### Q3 — How should "origin baseline" be captured?
Currently: from the origin location's recent conditions as a proxy for what your body is
used to, with a manual override (cool / temperate / warm / hot-humid). Alternative: ask
the user to self-describe their tolerance directly. Tell me if the proxy feels wrong and
I'll adjust the model.

### Q4 — Units default
Showing °C with a one-tap °F toggle. If your users are mostly US-based, I can default the
toggle to °F. (Trivial to change.)

---

## Resolved

_(none yet)_
