# Design system

The rules every LayerFlow screen follows. They are deliberately strict: consistency here is what
lets a new screen be built quickly and still look like it belongs.

If a rule blocks you, change the rule in this file and in the tokens — do not work around it in a
component.

---

## 1. Tokens only

Every colour comes from `app/globals.css`. There are no exceptions.

```tsx
// Wrong — Tailwind's palette is not our palette
<div className="bg-green-500 text-slate-700">

// Wrong — a hex is a colour nobody can theme or dark-mode
<div style={{ background: "#16a34a" }}>

// Right
<div className="bg-primary text-primary-foreground">
```

`tailwind.config.ts` maps only our tokens. A colour that is not there is not in the system.

**Adding a token means adding its dark-mode value in the same change.** The `.dark` block must
never fall behind `:root`.

**Colour is measured, never eyeballed.** Run it before committing a palette change:

```bash
npm run check:contrast
```

It reads the tokens straight out of `globals.css`, prints the WCAG ratio for every meaningful
foreground/background pair in both themes, and exits non-zero on a failure. It is part of
`npm run verify`.

### Why `primary` and `brand` are two tokens

They pull in opposite directions. `primary` sits behind white text, so it needs to be *dark* enough
for 4.5:1. `brand` is the vivid emerald from the product design, used where nothing sits on top —
the logo, progress fills, chart marks — so it can be *light* enough to look bright.

Collapsing them into one token is how the original palette ended up shipping white-on-green at
3.95:1. **Never put text on `brand`.**

### The palette

| Purpose | Token |
|---|---|
| Page | `bg-background` |
| Panels, inputs | `bg-surface` |
| Body text | `text-foreground` |
| Secondary text | `text-muted-foreground` |
| Brand, primary action, active nav | `primary` |
| Bright emerald, decoration only | `brand` |
| Warnings, "most popular" | `accent` |
| Errors, destructive | `destructive` |
| Status | `good` · `warn` · `bad` |
| Charts | `--chart-1` … `--chart-5`, `--chart-grid` |

### Icon chips — five, and only five

`chip-green` · `chip-amber` · `chip-teal` · `chip-rose` · `chip-violet`, each with a `-fg` pair.

These are the tinted squares on the KPI cards. A screen that needs a sixth tint is a screen that is
doing too much — reconsider the screen.

---

## 1b. Form controls

Every control comes from `components/ui/field.tsx`. Do not style a bare `<input>` or `<select>`.

- **`text-base md:text-sm`** — 16px on mobile is not a preference: iOS zooms the page when a
  focused field is smaller, which is jarring mid-entry. 14px from `md`, where 16px looks oversized.
- **`min-h-11`** — 44px, one-handed, outdoors, sometimes in gloves.
- **`Select` stays native.** `appearance-none` removes the dated OS arrow and a `ChevronDown`
  replaces it, but the element is still a `<select>` so phones get the native picker wheel and
  keyboard plus screen-reader behaviour comes free. Reach for a custom listbox only when a screen
  genuinely needs search or multi-select.
- **`Input` takes an `adornment`** for a leading `₱` or icon. Money fields should use it.
- The input border is the only thing marking a field boundary — surface and background are
  near-identical whites — so it is held to 3:1 and is deliberately stronger than a panel border.

---

## 2. Panels only

Every boxed region is `<Panel>`. Never hand-roll `rounded-lg border bg-surface`, and do not add a
second card component — there used to be a `Card` alongside `Panel`, and screens ended up rendering
both, so the same page had two different box treatments. `Card` has been deleted; if `Panel` cannot
do what you need, extend `Panel`.

```tsx
<Panel title="Egg inventory" action={<Link href="/inventory">View all</Link>}>
  …
</Panel>
```

One implementation means one radius, one border, one shadow, one header rhythm.

An **inset strip** inside a form (the live readout on the production form) is the one exception:
it is filled (`rounded-lg bg-muted p-3`) rather than bordered, so it reads as part of the form
rather than as another panel. Filled, never bordered — a bordered div is a `Panel` wearing a
disguise.

---

## 3. Every number is `.tabular`

Without exception. Figures change constantly on this product, and proportional digits make the
layout twitch on every refresh.

```tsx
<span className="tabular">{formatNumber(eggs)}</span>
```

Use `lib/format.ts` for all formatting — `formatCurrency`, `formatNumber`, `formatPercent`,
`formatKg`, `formatDate`. Never call `toLocaleString` directly in a component.

---

## 4. Status is never colour alone

Red text on its own fails for colour-blind users and in direct sunlight, which is where this app is
used. Always icon **and** words.

```tsx
// Wrong
<span className="text-destructive">-20</span>

// Right
<Delta value={-4.7} label="vs yesterday" />   // arrow glyph + colour + caption
<StatusNote tone="bad" title="A size has gone below zero">…</StatusNote>
```

---

## 5. Touch targets ≥ 44px

On desktop too. `Button` enforces it via `min-h-11`; anything clickable you build by hand must
match. The mobile tab bar's "+" is 56px.

---

## 6. Spacing and radius come from the scale

Spacing: **4 · 8 · 12 · 16 · 20 · 24** (`gap-1` … `gap-6`). Page padding is `px-4` on mobile,
`px-6` from `lg`.

Radius: `sm` 6px (chips, badges) · `md` 8px (buttons, inputs) · `lg` 12px (panels) · `xl` 16px
(modals, drawers).

Shadows: `shadow-card` on panels, `shadow-pop` on overlays. Nothing heavier — panels separate from
the page by their white fill, not by drop shadows.

---

## 7. Charts

- Always inside a `ResponsiveContainer`
- Colours from `--chart-1` … `--chart-5`, in that order, so the same measure keeps the same colour
  everywhere
- Horizontal gridlines only, in `--chart-grid`; no vertical grid, no chart border
- No 3D, no gradients-as-decoration, no legends when the series is obvious
- Charts are **client components**, imported only by the screen that uses them — Recharts is heavy
  and must not land in every page's bundle
- **Import them through `components/charts/lazy.tsx`**, never directly. Recharts is ~110 kB; loading
  it eagerly took the dashboard from 116 kB to 216 kB First Load JS and delayed the figures a
  farmer actually opened the app for. `next/dynamic` with `ssr: false` and a same-height skeleton
  keeps it off the critical path and stops the layout jumping when it arrives.
- Every chart needs a text equivalent nearby (a total, a table) — a chart alone is not accessible

---

## 8. Page structure

Every signed-in screen:

```tsx
<PageShell>
  <PageHeader title="…" description="…" action={…} />
  …panels…
</PageShell>
```

```tsx
<PageShell>                                  {/* max-w-[1600px] */}
  <PageHeader title="Egg inventory" description="…" />
  <Panel title="On hand">…</Panel>
</PageShell>
```

`PageShell` owns the width and padding so no page invents its own — that is how the app ended up
with three different widths. Use `width="reading"` for data entry: a form stretched to 1600px is
miserable to fill in.

A route's `loading.tsx` must use the **same** shell and width as its page, or the skeleton flashes
at a different size than the content replacing it.

Wide tables scroll inside `.scroll-x`, never the page.

---

## 9. Mobile is not an afterthought

This is a phone-in-a-poultry-house product. Build the small screen first.

- The **bottom tab bar is primary navigation** on mobile; the sidebar drawer is secondary
- KPI rows go 2-up on mobile, never a squeezed 5
- Charts shrink to ~180px tall
- Keep `pb-24` clearance above the tab bar
- Never disable zoom; `maximum-scale` stays at 5

Test at **375 · 768 · 1280 · 1536**.

---

## 10. Typography

One family: **Plus Jakarta Sans**, self-hosted via `next/font`. Do not add a second.

| Use | Class |
|---|---|
| Page title | `text-2xl font-bold tracking-tight` |
| Panel title | `text-sm font-semibold` |
| KPI figure | `.stat-figure` |
| Body | `text-sm` |
| Caption, label | `text-xs text-muted-foreground` |

---

## Checklist before calling a screen done

- [ ] No hex, no Tailwind palette classes
- [ ] Every figure `.tabular`, formatted through `lib/format.ts`
- [ ] Every boxed region a `Panel`
- [ ] Status has an icon and words
- [ ] Loading, error and empty states all exist
- [ ] Works at 375px with no horizontal scroll
- [ ] Focus visible on every interactive element
- [ ] Dark mode renders correctly
