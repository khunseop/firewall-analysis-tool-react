---
name: Enterprise Sleek Design System
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#424656'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#737687'
  outline-variant: '#c2c6d9'
  surface-tint: '#0053da'
  primary: '#004cca'
  on-primary: '#ffffff'
  primary-container: '#0062ff'
  on-primary-container: '#f3f3ff'
  inverse-primary: '#b4c5ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#4f576d'
  on-tertiary: '#ffffff'
  tertiary-container: '#676f86'
  on-tertiary-container: '#f2f3ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  h1:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: 0em
  label-bold:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0em
  data-num:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 24px
  margin: 32px
  card-padding: 24px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

This design system is engineered for high-stakes enterprise environments where clarity, speed of cognition, and professional "weight" are paramount. The aesthetic is **Enterprise Sleek**—a refined blend of minimalism and modern corporate standards. It evokes a sense of "expensive" precision through generous whitespace, high-contrast typography, and a restrained but punchy accent palette. 

The target audience consists of data analysts, system administrators, and executive stakeholders who require a tool that feels both utilitarian and premium. The UI avoids unnecessary ornamentation, relying instead on structural integrity and subtle depth to guide the user's focus toward critical data points and actionable insights.

## Colors

The palette is anchored by **Deep Navy (Slate)** for text and structural navigation to provide a grounded, authoritative feel. **Bright Blue** is reserved for primary actions and interactive states, while **Emerald Green** serves as a high-visibility indicator for positive growth or "healthy" status. 

Backgrounds utilize a tiered system of soft grays to create logical separation without the use of heavy borders. For critical system feedback, a **Clear Error Red** is used sparingly but with high saturation to ensure alerts are impossible to miss. All colors must maintain a 4.5:1 contrast ratio against their respective backgrounds to ensure accessibility in data-dense views.

## Typography

The design system utilizes **Inter** exclusively to ensure a utilitarian yet modern feel across all data visualizations. Visual hierarchy is established through extreme weight variance—pairing heavy, tight-tracked headlines with light, well-spaced body text. 

Key performance indicators (KPIs) should use the `data-num` style to pop against the interface. Labels for table headers and small captions use all-caps with increased letter-spacing to distinguish them from interactive body content.

## Layout & Spacing

The system follows a **12-column fluid grid** with fixed gutters to ensure consistency across various screen sizes. A base unit of **8px** dictates all spatial relationships, creating a predictable and rhythmic layout. 

The dashboard layout is characterized by a "Top-Down" hierarchy: Global navigation resides in a slim, fixed top bar, while contextual sub-navigation or filters are positioned immediately above the primary data grid. Content is grouped into logical modules with consistent padding to prevent visual clutter in data-heavy views.

## Elevation & Depth

Depth is communicated through **Tonal Layers** and **Ambient Shadows**. The interface uses three primary elevations:
1.  **Level 0 (Background):** Soft gray surfaces (`#F1F5F9`) representing the base canvas.
2.  **Level 1 (Cards/Surface):** Pure white containers with a very subtle, diffused shadow (0px 4px 20px rgba(0, 0, 0, 0.05)).
3.  **Level 2 (Modals/Popovers):** Standard white surfaces with a more pronounced, "lifted" shadow (0px 10px 30px rgba(0, 0, 0, 0.12)).

Avoid heavy borders; instead, use 1px strokes in a slightly darker gray than the background only when elements require distinct separation on the same elevation level.

## Shapes

The shape language is defined by **Rounded (Level 2)** geometry. Standard components like cards, input fields, and buttons utilize a 0.5rem (8px) radius. Larger layout containers may scale up to 1rem (16px) for a softer, more modern appearance. This roundedness balances the "hard" data within the dashboard, making the overall experience feel more approachable and polished.

## Components

### Buttons & Inputs
Buttons feature high-contrast fills (Primary Blue or Secondary Green) with white text. Ghost buttons use the Slate text color with no border until hover. Input fields are flat with a light gray background and a 1px focus ring in Primary Blue.

### Cards & Modules
All data is housed in cards. Each card must include a clear header and 24px internal padding. Cards used for KPIs should feature a "Flat Icon" in a low-opacity colored circle (e.g., light blue background for a blue icon) to maintain the "expensive" look.

### Data Tables
Tables are clean and minimalist. Use subtle horizontal dividers (`#E2E8F0`) and avoid vertical lines. Headers are bolded with a light gray background. Row hover states should be a very subtle tint of blue to indicate interactivity.

### Progress Bars
Progress bars are slim (4px - 8px height) and fully rounded. They utilize the Primary Blue or Emerald Green accents for the "fill" and a light gray for the "track."

### Status Chips
Use small, rounded-pill shapes for status indicators (e.g., "Live," "Pending," "Critical"). These should use low-opacity backgrounds with high-opacity text of the same color family for a sophisticated, layered look.