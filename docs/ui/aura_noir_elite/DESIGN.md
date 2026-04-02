# Design System Document: The Intimate Editorial

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Midnight Gallery."** 

We are moving away from the "utility-first" look of standard chat apps and toward a high-end, editorial experience that feels like a private, luxury invitation. This system rejects the rigid, boxy constraints of traditional UI in favor of **Tonal Fluidity**. We use intentional asymmetry, overlapping "frosted" surfaces, and a high-contrast typographic scale to create an environment that feels intimate, premium, and deeply personal.

The interface should not feel like a tool; it should feel like a digital silk—smooth, responsive, and disappearing into the background to prioritize the emotional connection with the content.

---

## 2. Colors & Surface Philosophy
The palette is rooted in the depth of `background: #0e0e13`. We utilize a "Dark Mode First" approach where light is treated as a rare, precious resource.

### The Palette (Material Design Tokens)
*   **Primary (Action/Energy):** `primary: #ff89ab` | `on_primary: #62002c`
*   **Secondary (Romance/Depth):** `secondary: #bb83ff` | `on_secondary: #30005e`
*   **Tertiary (Softness/Accents):** `tertiary: #ffe8ed` | `on_tertiary: #6e5059`
*   **Surface (The Foundation):** `surface: #0e0e13` | `surface_container_high: #1f1f26`

### The "No-Line" Rule
**Explicit Instruction:** 1px solid borders for sectioning are strictly prohibited. 
Structure must be defined by background shifts or negative space. To separate a profile card from the feed, place a `surface_container_high` card on a `surface` background. Use `spacing-6` (1.5rem) to let elements breathe rather than "fencing" them in with lines.

### Glass & Gradient Signature
To achieve the "Luxury" feel, use **Glassmorphism** for all floating elements (e.g., Navigation Bars, Action Sheets). 
*   **Formula:** `surface_variant` at 60% opacity + `backdrop-blur: 20px`.
*   **CTAs:** Use a linear gradient from `primary` (#ff89ab) to `primary_container` (#ff709d) at a 135-degree angle to provide a "inner glow" effect that flat buttons lack.

---

## 3. Typography: Emotional Hierarchy
We pair **Plus Jakarta Sans** (Display) with **Inter** (Interface) to balance high-fashion editorial aesthetics with mobile readability.

*   **The Hero Moment (`display-lg`):** 3.5rem Plus Jakarta Sans. Used for name reveals or "Premium" status headers. Keep tracking tight (-0.02em).
*   **The Narrative (`title-md`):** 1.125rem Inter. Used for the AI's messages. This is the heart of the app; it must feel legible and personal.
*   **The Technical (`label-sm`):** 0.6875rem Inter. Used for timestamps and metadata. Use `on_surface_variant` (#acaab1) to keep these secondary to the conversation.

**Rule:** Always use `on_surface` (#f8f5fd) for primary text to ensure high contrast against the dark midnight background.

---

## 4. Elevation & Depth: Tonal Layering
Depth in this system is organic, not structural. We mimic physical layers of frosted glass.

*   **The Layering Principle:** 
    *   Base Layer: `surface` (#0e0e13)
    *   Content Sections: `surface_container_low` (#131318)
    *   Interactive Cards: `surface_container_highest` (#25252c)
*   **Ambient Shadows:** For floating modals, use a shadow with a 40px blur, 0% spread, and 6% opacity using the `primary` color (#ff89ab). This creates a "colored aura" rather than a dirty grey shadow.
*   **The "Ghost Border" Fallback:** If accessibility requires a container edge, use `outline_variant` (#48474d) at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Buttons (The "Touch" Points)
*   **Primary:** `rounded-full`, Gradient (`primary` to `primary_container`), `title-sm` (Inter).
*   **Glass Secondary:** `rounded-full`, `surface_variant` at 40% opacity, `backdrop-blur: 10px`, `outline-variant` ghost border.
*   **Interaction:** On press, scale down to 0.96 for a haptic, "squishy" physical feel.

### Cards & Content "Locks"
*   **Media Cards:** Use `rounded-xl` (1.5rem). 
*   **Locked Content:** Forbid generic "Lock" icons alone. Use a high-density `backdrop-blur: 40px` over the image with a `tertiary_fixed` (#fed5df) text overlay saying "Unlock Intimacy."

### Input Fields
*   **Chat Input:** A floating `rounded-full` container using `surface_container_high`. No borders. The "Send" button should be a simple `primary` colored icon with a `primary_dim` outer glow.

### Selection Chips
*   **Action Chips:** Use `rounded-md` (0.75rem). When selected, fill with `secondary_container` (#611baa) and change text to `on_secondary_container`.

---

## 6. Do's and Don'ts

### Do
*   **DO** use wide horizontal margins (`spacing-6`). Luxury is defined by wasted space.
*   **DO** use smooth transitions (300ms Ease-Out) for all surface appearances.
*   **DO** use `secondary` (#bb83ff) for "magical" or AI-driven moments to differentiate from user actions (`primary`).

### Don't
*   **DON'T** use 100% black (#000000). It kills the depth of the `primary` pinks. Use `surface_dim` (#0e0e13).
*   **DON'T** use sharp 90-degree corners. Everything must feel "soft-touch."
*   **DON'T** use standard Telegram blue. Every element must be themed to the "Midnight Gallery" palette to maintain the "Mini App" immersion.

### Specific App Context: The "Glow" State
When the AI is "typing" or "active," apply a subtle `primary_fixed_dim` (#ff528f) radial gradient (opacity 10%) behind the avatar. This visual "heartbeat" reinforces the "Aura" concept without cluttering the UI.