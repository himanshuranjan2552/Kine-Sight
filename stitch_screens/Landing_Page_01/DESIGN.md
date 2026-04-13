# Design System Document

## 1. Overview & Creative North Star: "The Kinetic Editorial"

This design system is built to transcend the "utility app" aesthetic. Our Creative North Star is **The Kinetic Editorial**. We treat every workout as a cover story and every data point as a premium infographic. By blending the high-energy "Strava Orange" with an expansive, breathable layout, we create an experience that feels like a high-end cycling or running journal.

To break the "template" look, we move away from rigid, boxed-in grids. We embrace **intentional asymmetry**: large display typography that occasionally bleeds toward the edge, overlapping images that break container boundaries, and a "tonal layering" approach that replaces harsh borders with soft transitions of light.

---

## 2. Colors: Tonal Momentum

Our palette is anchored by the high-performance `primary` (#a73400), but its power is derived from the sophisticated neutral foundation.

### The "No-Line" Rule
**Explicit Instruction:** 1px solid borders are strictly prohibited for sectioning or containment. Boundaries must be defined solely through background color shifts or subtle tonal transitions. Use `surface-container-low` to sit on a `surface` background to define a new area.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of fine, semi-transparent layers. 
- **Base Layer:** `surface` (#f9f9f9) for the global background.
- **Secondary Tier:** `surface-container-low` (#f3f3f3) for large content blocks.
- **Focus Tier:** `surface-container-lowest` (#ffffff) for the most interactive elements, like a primary activity card.
- **The "Glass & Gradient" Rule:** For floating headers or navigation bars, use `surface-container-lowest` at 80% opacity with a `backdrop-filter: blur(20px)`. This "Glassmorphism" ensures the brand colors bleed through the UI, making the app feel alive and integrated.

### Signature Textures
Main Action buttons and Hero Progress charts should utilize a subtle linear gradient: 
*   **From:** `primary` (#a73400) 
*   **To:** `primary-container` (#d14300) 
This 15-degree tilt provides a "visual soul" and a sense of forward motion that flat fills cannot achieve.

---

## 3. Typography: Athletic Sophistication

We utilize a high-contrast pairing: **Lexend** for athletic, bold impact and **Inter** for precision and readability.

*   **Display & Headlines (Lexend):** Used for "Big Data" moments—your mileage, your PRs, your rank. The geometric nature of Lexend at `display-lg` (3.5rem) conveys authority and achievement.
*   **Body & Labels (Inter):** Used for technical specs and social interactions. Inter provides the "editorial" clarity needed when reviewing complex heart-rate graphs or split times.
*   **The Identity Shift:** Always use `on-surface-variant` (#5c4037) for secondary headlines. This warm-toned charcoal keeps the interface from feeling "tech-cold" and maintains the premium, editorial vibe.

---

## 4. Elevation & Depth: Tonal Layering

We reject traditional shadows in favor of **Tonal Layering** and **Ambient Light**.

*   **The Layering Principle:** Depth is achieved by stacking. A `surface-container-lowest` card placed on a `surface-container-low` background creates a natural lift.
*   **Ambient Shadows:** For high-priority floating elements (e.g., "Start Activity" button), use a diffused shadow: `x:0, y:8, blur:24, color: primary (opacity 8%)`. Never use pure black or grey for shadows; always tint them with the `on-surface` or `primary` hue to mimic natural light.
*   **The "Ghost Border" Fallback:** If a layout requires a boundary for accessibility, use the `outline-variant` token at **15% opacity**. It should be felt, not seen.
*   **Interactivity:** When a user presses a card, transition the background from `surface-container-lowest` to `surface-dim` (#dadada) to simulate the card being "pressed" into the surface.

---

## 5. Components: Precision Primitives

### Buttons
*   **Primary:** Gradient fill (`primary` to `primary-container`), `round-xl` (0.75rem), uppercase `label-md` for an athletic feel.
*   **Secondary:** `surface-container-highest` background with `primary` text. No border.
*   **Tertiary:** Ghost style. No background. Use `on-surface` with a `primary` icon.

### Cards & Lists
*   **The Divider Rule:** Forbid the use of divider lines. Separate list items using `spacing-4` (1rem) of vertical white space or by alternating background tones between `surface` and `surface-container-low`.
*   **Activity Card:** Use `surface-container-lowest` with a "Ghost Border." The activity map should bleed to the edges of the card, breaking the internal padding to create a "full-bleed" editorial look.

### Data Visualization (The "Momentum" Chart)
*   Charts must not use hard axes. Use `outline-variant` at 10% for grid lines. The data line itself should be `primary` with a `primary-container` glow (soft shadow) to make the performance feel "electric."

### Achievement Chips
*   Pill-shaped (`round-full`). Use `primary-fixed` (#ffdbd0) backgrounds with `on-primary-fixed` (#390c00) text for a sophisticated, high-contrast "medal" effect.

---

## 6. Do's and Don'ts

### Do
*   **Do** use extreme scale. Pair a `display-lg` number with a `label-sm` unit (e.g., **42.2** km) for a high-end data aesthetic.
*   **Do** allow images of athletes to overlap typography or containers to create a sense of three-dimensional space.
*   **Do** use "Strava Orange" sparingly as a "heat" indicator—the more intense the effort, the more the color appears.

### Don't
*   **Don't** use 100% black (#000000) for text. Use `on-surface` (#1a1c1c) to keep the editorial feel soft and readable.
*   **Don't** use "Standard" shadows. If it looks like a default UI kit, increase the blur and decrease the opacity.
*   **Don't** crowd the interface. If in doubt, increase the spacing by one tier on our scale (e.g., move from `spacing-4` to `spacing-5`).