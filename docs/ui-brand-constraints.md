# BelovedOps UI Brand Constraints

This document defines the visual design constraints for the BelovedOps internal Client Operations System.

The application should feel clean, professional, minimal, and suitable for Beloved John Dev's internal operations workflow. It should prioritize clarity, consistency, and usability over decoration.

## Approved Colors

Only these two brand colors may be used throughout the application:

| Token | Hex | Usage |
| --- | --- | --- |
| Primary mint | `#99ffcc` | Primary actions, highlights, active navigation states, badges, success accents, focus states, and important UI accents |
| Dark | `#1e1e1e` | Text, dark backgrounds, borders, structural UI elements, icons, and error messaging |

No other brand, semantic, or decorative colors should be introduced.

## Opacity Variations

Lighter or darker variations must be created using opacity only.

Examples:

```css
rgba(153, 255, 204, 0.12)
rgba(153, 255, 204, 0.24)
rgba(30, 30, 30, 0.08)
rgba(30, 30, 30, 0.16)
rgba(30, 30, 30, 0.64)
```

Do not create new hex colors by manually lightening or darkening the brand colors.

## Prohibited Colors

Do not use:

- Blue
- Purple
- Red
- Orange
- Yellow
- Alternate greens
- Gray palettes as independent brand colors

Neutral variation must come from `#1e1e1e` with opacity.

## Usage Rules

Use `#99ffcc` for:

- Primary buttons
- Active navigation states
- Selected tabs or filters
- Important badges
- Success accents
- Focus rings
- Key dashboard highlights
- Small UI accents that need emphasis

Use `#1e1e1e` for:

- Primary text
- Icons
- Borders
- Dark panels or headers
- Structural UI elements
- Error state text
- Empty state text
- Secondary actions

## Status Indicators

Status indicators must not rely on extra colors.

Use these instead:

- Text labels
- Icons
- Borders
- Opacity
- Layout grouping
- Typography weight
- Mint accent for the most important active or successful state

Examples:

- A `Sent` invoice can use a bordered badge with dark text.
- A `Paid` invoice can use a mint-accented badge.
- An `Overdue` invoice should use dark text, a stronger border, and clear messaging instead of red.

## Error States

Error states must not use red.

Use:

- `#1e1e1e` text
- Strong dark borders
- Clear inline messaging
- Slightly emphasized background using dark opacity

Example:

```css
.field-error {
  border-color: #1e1e1e;
  background: rgba(30, 30, 30, 0.08);
  color: #1e1e1e;
}
```

## Success States

Success states should use the primary mint color.

Example:

```css
.success-badge {
  background: rgba(153, 255, 204, 0.24);
  border: 1px solid #99ffcc;
  color: #1e1e1e;
}
```

## Gradients

Avoid gradients by default.

If a gradient is necessary, it may only use `#99ffcc` and `#1e1e1e` with opacity.

Do not use decorative multi-color gradients.

## Implementation Guidance

Define the palette once in the frontend theme or CSS variables.

Recommended CSS variables:

```css
:root {
  --color-mint: #99ffcc;
  --color-dark: #1e1e1e;
  --color-mint-12: rgba(153, 255, 204, 0.12);
  --color-mint-24: rgba(153, 255, 204, 0.24);
  --color-dark-08: rgba(30, 30, 30, 0.08);
  --color-dark-16: rgba(30, 30, 30, 0.16);
  --color-dark-64: rgba(30, 30, 30, 0.64);
}
```

All components should consume these variables instead of hardcoding colors repeatedly.

## Product Feel

BelovedOps should feel like a focused internal operations system:

- Minimal
- Calm
- Businesslike
- Efficient for repeated daily use
- Easy to scan
- Clear about state and next action

Avoid:

- Marketing-style hero sections
- Decorative color splashes
- Overly playful visuals
- Large card-heavy layouts where dense operational views are needed
- Color-coded dashboards that introduce unauthorized colors

