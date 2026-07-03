---
name: "Hi App"
description: "A warm, trustworthy Vietnamese reproductive health and relationship-care product UI."
colors:
  primary: "#eb477e"
  primary-soft: "#fdf2f6"
  secondary: "#88636f"
  surface-pink: "#fdf2f8"
  rose-soft: "#fff1f2"
  rose-border: "#ffe4e6"
  rose-accent: "#f43f5e"
  ink: "#0f172a"
  body: "#1f2937"
  muted: "#64748b"
  border: "#fce7f3"
  white: "#ffffff"
typography:
  display:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontWeight: 900
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontWeight: 800
    lineHeight: 1.2
  body:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.6
  label:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 800
    lineHeight: 1.2
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    rounded: "{rounded.lg}"
    padding: "12px 20px"
  card:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "20px"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.body}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
---

# Design System: Hi App

## 1. Overview

**Creative North Star: "The Gentle Health Companion"**

Hi uses a product-first visual system: familiar controls, soft surfaces, and careful hierarchy. The interface should feel like a trusted care companion in Vietnamese, not a decorative wellness poster. Warmth comes from restrained pink accents, rounded but disciplined components, supportive copy, and enough whitespace for sensitive health information to breathe.

The current codebase uses Tailwind CSS, system UI fonts, pink/rose brand accents, white cards, pastel gradients, Material Symbols, Phosphor icons, and Iconify emoji-style anniversary visuals. Future UI work should preserve warmth while reducing common AI tells: gradient text, gray text on colored surfaces, purple/cyan gradient dependence, bouncy motion, and overly soft card shadows.

**Key Characteristics:**
- Warm product UI with pink as an action and selection accent.
- Familiar app patterns for dashboards, settings, calendars, forms, and admin panels.
- White or lightly tinted surfaces with clear borders and restrained shadows.
- Strong labels and readable body copy for private health contexts.

## 2. Colors

The palette is pink-led and product-restrained: accent color guides action, while surfaces stay quiet enough for repeated use.

### Primary
- **Care Pink**: The primary action and selected-state color. Use it for main CTAs, active tabs, key calendar markers, and focused relationship moments.
- **Soft Care Pink**: A light background tint for gentle emphasis. It must not carry low-contrast gray copy.

### Secondary
- **Mauve Companion**: A secondary relationship tone used sparingly for supporting accents and partner-facing surfaces.

### Neutral
- **Ink Slate**: Primary headings and important labels.
- **Body Slate**: Default text color for prose and controls.
- **Muted Slate**: Secondary metadata only, and only on white or sufficiently high-contrast backgrounds.
- **White Surface**: Default card and panel surface.
- **Rose Border**: Low-emphasis borders and dividers.

### Named Rules

**The Pink Has a Job Rule.** Pink marks action, selection, or meaningful relationship/health state. It is not filler decoration.

**The No Gray On Tint Rule.** Gray text on pink, rose, violet, sky, emerald, or red tints is prohibited unless contrast is verified. Use the darker hue family or ink instead.

## 3. Typography

**Display Font:** system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif  
**Body Font:** system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif  
**Label/Mono Font:** system-ui stack

**Character:** The type system is familiar, compact, and utilitarian. It should support scanning and trust more than editorial drama.

### Hierarchy
- **Display** (900, large page titles, tight but not cramped): Use only for major page headings and dashboard hero numbers.
- **Headline** (800, section titles): Use for dashboard panels, modal titles, and page sections.
- **Title** (700-800, compact headings): Use inside cards and repeated list items.
- **Body** (500-600, 1rem, 1.5-1.7 line-height): Use for explanations and secondary content; cap longer prose around 65-75ch.
- **Label** (700-900, 0.75rem-0.875rem): Use for tabs, chips, form labels, metadata, and admin controls.

### Named Rules

**The Product Type Rule.** No display fonts or decorative letterforms in controls, data, health labels, or admin UI.

**The Solid Text Rule.** Gradient text is prohibited for product headings, metrics, prices, and labels. Use a solid brand or ink color.

## 4. Elevation

Hi uses tonal layering plus soft shadows. Cards and panels may lift gently, but the product should not feel like a stack of floating glass bubbles. Borders often do more trustworthy work than large shadows.

### Shadow Vocabulary
- **Soft Panel** (`shadow-sm` or a short, tinted shadow): Use on cards that need separation from tinted backgrounds.
- **Lifted CTA** (`0 10px 30px -8px rgba(...)`): Use on primary CTAs only when the button needs emphasis.
- **Hover Lift** (`translateY(-2px)` to `translateY(-4px)`): Use for clickable cards and buttons, never as page-load choreography.

### Named Rules

**The Border Or Shadow Rule.** Avoid pairing a visible 1px border with a wide decorative shadow unless the component needs strong interaction emphasis.

## 5. Components

### Buttons
- **Shape:** Soft rounded rectangles, usually 12-16px. Full pills are allowed for chips and compact actions.
- **Primary:** Pink or approved gradient only for main actions. Text must be white and bold.
- **Hover / Focus:** Short state transitions, visible focus rings, and no bounce easing.
- **Secondary:** White or pale surface with a clear border and solid text.

### Chips
- **Style:** Small rounded tokens for filters, tags, and state labels.
- **State:** Selected chips use a clear accent border/background and stronger text; inactive chips must not look disabled.

### Cards / Containers
- **Corner Style:** 12-16px for most product cards; larger radii only for hero panels or existing dashboard surfaces.
- **Background:** White or very soft pink/rose tint.
- **Shadow Strategy:** Minimal at rest, slightly lifted on hover if clickable.
- **Border:** Rose or slate-tinted border for separation.
- **Internal Padding:** 16-24px depending on density.

### Inputs / Fields
- **Style:** White background, clear border, 12px radius, bold readable text.
- **Focus:** Border or ring shifts to pink/rose with sufficient contrast.
- **Error / Disabled:** Error copy uses solid red/rose with explicit message; disabled states reduce opacity but remain legible.

### Navigation
- **Style:** Familiar top/sidebar navigation with icon + label, clear active state, and predictable hover.
- **Mobile:** Controls must wrap or collapse without text clipping.

### Signature Components
- **Cycle and anniversary calendars:** Calendar cells must keep stable dimensions; hover/click details should reveal full content without resizing the grid.
- **Dashboard panels:** Panels should prioritize the current state and next action, not decorative summaries.
- **Admin tables and panels:** Dense, restrained, and scan-first.

## 6. Do's and Don'ts

### Do:
- **Do** use Care Pink for primary actions, selected states, and meaningful health/relationship markers.
- **Do** keep product UI familiar and stable across dashboards, forms, modals, calendars, and admin pages.
- **Do** verify WCAG AA contrast for labels, metadata, placeholders, and tinted panels.
- **Do** honor reduced motion and keep transitions around 150-250ms for product surfaces.
- **Do** use consistent icon families within each component group.

### Don't:
- **Don't** use generic AI SaaS dashboards, neon purple/cyan gradients as a default identity, excessive glassmorphism, decorative gradient text, washed-out gray text on tinted backgrounds, over-rounded nested cards, bouncy motion, or greeting-card UI for serious health tasks.
- **Don't** use gray text on colored backgrounds without checking contrast.
- **Don't** use gradient text for headings, prices, metrics, or labels.
- **Don't** rely on bounce/elastic easing for loaders, success states, or navigation.
- **Don't** add nested cards or large blank gaps between dashboard components.
