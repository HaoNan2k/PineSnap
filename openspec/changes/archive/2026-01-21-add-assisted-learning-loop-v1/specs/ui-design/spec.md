# UI Design Spec: Nordic Forest Theme

## Overview

PineSnap uses a "Nordic Forest" design language inspired by Scandinavian minimalism and natural forest aesthetics.

## Color Palette

```css
/* Primary Colors */
--primary: #2c4e37;           /* Forest green - main brand color */
--forest: #2D4F38;            /* Deep forest green */
--forest-muted: #6e7c73;      /* Muted green for secondary text */

/* Background Colors */
--background: #FAFAF9;        /* Light cream/off-white */
--background-dark: #161c18;   /* Dark mode background */
--card: #FFFFFF;              /* Card/surface color */

/* Accent Colors */
--sand: #D4C5A9;              /* Warm sand accent */
--success: #3E6B4D;           /* Success/positive green */

/* Text Colors */
--text-main: #1C1C1E;         /* Primary text */
--text-secondary: #575757;    /* Secondary/muted text */
```

## Typography

### Font Families
- **Display/Sans**: Inter (weights: 300, 400, 500, 600, 700)
- **Serif**: Merriweather (for headings and emphasis)

### Usage
- Page titles: `font-serif text-5xl` (Merriweather)
- Section headings: `font-serif text-2xl font-bold`
- Body text: `font-sans text-sm` (Inter)
- Labels: `text-xs font-bold uppercase tracking-wider`

## Border Radius

```css
--radius-default: 0.5rem;     /* 8px */
--radius-lg: 1rem;            /* 16px */
--radius-xl: 1.5rem;          /* 24px */
--radius-2xl: 2rem;           /* 32px */
--radius-3xl: 1.5rem;         /* 24px */
--radius-full: 9999px;        /* Pills/circles */
```

## Component Patterns

### Sidebar
- Width: 288px (w-72)
- Sticky, full height
- Contains: Logo, navigation, collections, user profile
- Active state: `bg-primary/10 text-primary`
- Hover state: `hover:bg-sand/10`

### Cards
- Background: white with subtle border
- Border: `border-gray-100`
- Hover: `hover:border-sand`
- Rounded: `rounded-2xl`
- Shadow: `shadow-sm hover:shadow-md`

### Buttons
- Primary: `bg-primary text-white rounded-xl`
- Secondary: `border border-sand/50 text-forest-muted hover:bg-sand/10`
- Icon button: `size-12 rounded-xl`

### Focus Mode Header
- Minimal: Logo + breadcrumb
- Height: 56px (h-14)
- Border bottom: `border-b border-sand/20`
- Close button: top-left, `rounded-full hover:bg-sand/20`

### Learning Cards
- Max width: 600px
- Rounded: `rounded-2xl` or `rounded-3xl`
- Shadow: `shadow-xl`
- Border: `border border-gray-100`
- Padding: `p-8 sm:p-10`

## Icons

Use Material Symbols with these settings:
```css
font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
```

For active/filled icons:
```css
font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
```

## Transitions

- Default: `transition-colors` or `transition-all`
- Duration: 200ms
- Easing: `cubic-bezier(0.2, 0.0, 0.0, 1.0)` for interactive elements

## Spacing

- Container padding: `px-12 py-12` (48px)
- Card padding: `p-8` (32px)
- Gap between cards: `gap-4` or `gap-8`
- Section margin: `mt-8` or `mt-12`

## Reference Prototypes (Stitch)

The following HTML prototypes from the Stitch design tool serve as the visual reference for implementation:

| File | Description |
|------|-------------|
| `reference/stitch-library.html` | Notes page with card grid layout |
| `reference/stitch-question.html` | Focus mode - Question/Quiz card state |
| `reference/stitch-feedback.html` | Focus mode - Feedback/Insight card state |
| `reference/stitch-full-app.html` | Full interactive React prototype with routing |

### Key Design Elements from Prototypes

#### Sidebar (Main Layout)
- Logo: Mountain icon (`filter_hdr`) in primary color
- Branding: "PineSnap" with product subtitle
- Navigation: Sources, Learning, Notes
- User profile at bottom

#### Sources ("The Nursery")
- Serif heading with item count
- Horizontal card layout with thumbnail
- Source badge ("FROM BILIBILI") and capture date
- "Prune" (secondary) and "Plant" (primary) actions
- "End of Nursery" footer text

#### Focus Mode Header
- Logo icon (`spa`) in bordered container
- Brand name "PineSnap"
- Fire streak counter with flame icon
- User avatar

#### Question Card
- Context badge ("CONCEPT CONTEXT")
- Blockquote with left border
- Serif question heading
- Radio button options with hover effects
- "Report issue" and "Skip Question" actions
- Esc key hint at bottom

#### Feedback Card
- Success gradient header
- Check circle icon with "Insight Gained" label
- Serif heading for the insight
- "The Nuance" explanation box
- Correct answer indicator
- "Share Insight" and "Continue Journey" actions

## ADDED Requirements

### Requirement: UI design tokens SHALL match the PineSnap theme
The UI implementation SHALL use the design tokens defined in this spec for
colors, typography, radius, and spacing.

#### Scenario: Implementing UI components with theme tokens
Given a UI implementation that uses the PineSnap theme  
When colors, typography, radius, and spacing tokens are applied  
Then the implementation SHALL follow the values defined in this spec for
colors, fonts, radius, and spacing

### Requirement: Reference prototypes SHALL be used for layout alignment
The UI implementation SHALL align core layouts and focus mode cards with the
reference prototypes listed in this spec.

#### Scenario: Implementing core layouts and focus mode cards
Given the Stitch reference prototypes listed in this spec  
When building the Sidebar, Sources/Notes layouts, and Focus mode cards  
Then the implementation SHALL align with the key design elements described
in the reference prototypes section
