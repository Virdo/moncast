---
name: Pacta
colors:
  surface: '#121415'
  surface-dim: '#121415'
  surface-bright: '#38393a'
  surface-container-lowest: '#0c0e0f'
  surface-container-low: '#1a1c1d'
  surface-container: '#1e2021'
  surface-container-high: '#282a2b'
  surface-container-highest: '#333536'
  on-surface: '#e2e2e3'
  on-surface-variant: '#c6c9ab'
  inverse-surface: '#e2e2e3'
  inverse-on-surface: '#2f3132'
  outline: '#909378'
  outline-variant: '#454932'
  surface-tint: '#b8d300'
  primary: '#ffffff'
  on-primary: '#2c3400'
  primary-container: '#d2f000'
  on-primary-container: '#5d6b00'
  inverse-primary: '#576500'
  secondary: '#b8c3ff'
  on-secondary: '#002388'
  secondary-container: '#0043eb'
  on-secondary-container: '#c6ceff'
  tertiary: '#ffffff'
  on-tertiary: '#313031'
  tertiary-container: '#e5e2e3'
  on-tertiary-container: '#656465'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d2f000'
  primary-fixed-dim: '#b8d300'
  on-primary-fixed: '#191e00'
  on-primary-fixed-variant: '#414c00'
  secondary-fixed: '#dde1ff'
  secondary-fixed-dim: '#b8c3ff'
  on-secondary-fixed: '#001356'
  on-secondary-fixed-variant: '#0035be'
  tertiary-fixed: '#e5e2e3'
  tertiary-fixed-dim: '#c8c6c7'
  on-tertiary-fixed: '#1c1b1c'
  on-tertiary-fixed-variant: '#474647'
  background: '#121415'
  on-background: '#e2e2e3'
  surface-variant: '#333536'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.02em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.0'
    letterSpacing: 0.1em
spacing:
  base: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  container-max: 1280px
---

## Brand & Style
The design system embodies a "Modern Monolithic" aesthetic fused with "Bio-Tech" precision. It is built for a protocol where discipline and technological high-fidelity are paramount. The UI evokes the feeling of a sophisticated, encrypted terminal—stable, unyielding, and trustless.

The visual direction rejects common Web3 tropes in favor of a dark, high-contrast environment. It utilizes structural glassmorphism, where surfaces feel like engineered obsidian plates rather than soft glass. Elements appear precision-machined with razor-sharp edges and micro-glows, suggesting an "always-on" state of verification and ZK-proof generation.

## Colors
The palette is rooted in **Deep Obsidian (#0A0A0B)**, providing a void-like background that emphasizes content hierarchy. 

- **Acid Lime (#DFFF00):** The primary signal color. Used for commitments, successful proofs, and critical primary actions. It represents the "biological" spark within the machine.
- **Electric Cobalt (#2E5BFF):** Reserved for technical infrastructure, ZK-TLS processes, and data-routing indicators. It provides a cold, high-tech contrast to the lime.
- **Surface Tints:** Use low-opacity variants of Cobalt for glass blurs and border glows to simulate "active" energy.
- **Data States:** Critical errors should utilize a high-saturation Vermillion, though Acid Lime remains the hero for all positive reinforcement.

## Typography
Typography is split between the systematic clarity of **Inter** and the technical rigor of **JetBrains Mono**. 

Headlines should be set with tight tracking to feel "monolithic" and heavy. Body text prioritizes legibility within dark interfaces. **JetBrains Mono** is mandatory for all protocol addresses, transaction hashes, ZK-proof logs, and commitment parameters. Use the `label-caps` style for section headers and status badges to reinforce the "terminal" aesthetic.

## Layout & Spacing
The layout follows a strict 12-column grid for desktop with 24px gutters. The rhythm is mathematical, based on a 4px baseline shift. 

- **Desktop:** Wide margins (64px) create a sense of scale and focus.
- **Mobile:** Elements collapse into a single-column stack with 16px safe zones.
- **Alignment:** All containers must align to the grid edges. Padding within glass components should be generous (typically 24px or 32px) to allow the background blurs to breathe without crowding the content.

## Elevation & Depth
Depth is achieved through **Structural Glassmorphism**. Instead of shadows, use "Light Leak" borders and backdrop filters.

1.  **Base Layer:** Deep Obsidian (#0A0A0B) solid.
2.  **Mid Layer (Containers):** Semi-transparent Obsidian (80% opacity) with a 20px backdrop blur.
3.  **Active Edge:** Use a 1px solid border at 10-15% opacity of the Primary or Secondary color to create a "glowing wireframe" effect.
4.  **Top Layer (Modals/Popovers):** Higher transparency (60% opacity) with a stronger blur (40px) and a subtle inner glow from the top-left corner to simulate a physical light source hitting a glass edge.

## Shapes
The shape language is strictly **Sharp (0px roundedness)**. Every button, input, card, and modal must feature 90-degree angles. This reinforces the "Disciplined" and "Monolithic" brand pillar. 

Avoid all radii. Visual interest is generated through border thickness variations and clipping corners (45-degree chamfers) on decorative elements or specific "Action" buttons, but never through rounding.

## Components
- **Buttons:** 
  - *Primary:* Solid Acid Lime background with black Inter Bold text. No rounding.
  - *Secondary:* Ghost style with 1px Electric Cobalt border. On hover, the border glows with a 4px outer blur.
- **Input Fields:** Dark background (darker than the container), sharp edges, with a JetBrains Mono cursor. The bottom border should "activate" by turning Acid Lime when focused.
- **Commitment Cards:** High-contrast containers with a 1px border. The top-right corner should feature a status tag in JetBrains Mono (e.g., "VERIFIED" or "PROVING").
- **ZK-Proof Logs:** Use a scrollable area with JetBrains Mono text. Key-value pairs should be color-coded: Keys in Neutral, Values in Electric Cobalt.
- **Iconography:** Use 1.5px stroke weight geometric icons. All icons should be bounded by a square or diamond frame to maintain the rigid structural theme.
- **Progress Bars:** Thin 2px lines. The background is a dim Cobalt; the progress fill is a vibrant, glowing Acid Lime.