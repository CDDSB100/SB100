# Curation Page - Visual Responsive Design Guide

## Complete Responsive Architecture

### Device Breakpoints Overview

```
Extra Small     Small Devices    Tablets        Large Tablets   Desktop
Mobile          (481-767px)      (768-991px)    (992-1199px)   (1200px+)
≤480px          

[Mobile]        [Tablet Portrait] [Tablet]       [Large Tablet]  [Desktop/Laptop]
┌─────┐         ┌──────────┐      ┌────────────┐ ┌────────────┐ ┌──────────────┐
│     │         │          │      │            │ │            │ │              │
│ 4:1 │   →     │   2:1    │  →   │    2:1     │ → │   3:1     │ → │    3-4:1     │
│     │         │          │      │            │ │            │ │              │
└─────┘         └──────────┘      └────────────┘ └────────────┘ └──────────────┘
100% width      100% width        100% width      1200px max    Full width
```

---

## Layout Transformations by Device

### 📱 Mobile (≤480px)
```
┌────────────────────────┐
│ ← Title                │
├────────────────────────┤
│  [Analyze]  [Delete]   │
│  (stacked)              │
├────────────────────────┤
│ [Approved]  [Pending]  │
│ [Rejected]  [Unavable] │
│ (2-column grid)        │
├────────────────────────┤
│ Status:                │
│ [B1][B2][B3][B4][B5]  │
│ [B6]                   │
│ (wrapped buttons)       │
├────────────────────────┤
│ Category:              │
│ [Dropdown]             │
│ Search:                │
│ [Input]                │
│ Order:                 │
│ [Dropdown]             │
├────────────────────────┤
│      [Card 1]          │
│    (Single Column)     │
│      [Card 2]          │
│      [Card 3]          │
├────────────────────────┤
│ Pagination (centered)  │
└────────────────────────┘

Spacing: 8px (--curation-spacing-xs)
Font Size: 0.65-0.75rem
Button Width: 100%
```

### 📊 Tablet Portrait (481-767px)
```
┌──────────────────────────────┐
│ ← Title       [Analyze][Del] │
├──────────────────────────────┤
│ [Approved]    [Pending]      │
│ [Rejected]   [Unavailable]   │
│ (2-column grid)              │
├──────────────────────────────┤
│ Status: [B1][B2][B3][B4]    │
│ [B5][B6]                      │
├──────────────────────────────┤
│ Category:     │ Search:      │
│ [Dropdown]    │ [Input]      │
│ Order:        │              │
│ [Dropdown]    │              │
├──────────────────────────────┤
│       [Card 1]  │  [Card 2]  │
│ (Double column) │            │
│       [Card 3]  │  [Card 4]  │
├──────────────────────────────┤
│       Pagination              │
└──────────────────────────────┘

Spacing: 12-16px (--curation-spacing-sm)
Font Size: 0.7-0.875rem
Button Width: 100% (flex layout)
```

### 💻 Tablet Landscape (768-991px)
```
┌────────────────────────────────────────┐
│ ← Title                [Analyze][Delete]│
├────────────────────────────────────────┤
│ [Approved] [Pending] [Rejected] [Unav] │
│ (2-column summary)                     │
├────────────────────────────────────────┤
│ Status: [B1][B2][B3][B4][B5][B6]      │
├────────────────────────────────────────┤
│ Category:[Drop] Search:[Input] Order:[D]│
├────────────────────────────────────────┤
│  [Card 1]  │  [Card 2]  │  [Card 3]   │
│ (Double    │           │             │
│  columns)  │  [Card 4]  │  [Card 5]   │
│            │           │  (2 col)     │
├────────────────────────────────────────┤
│            Pagination (centered)       │
└────────────────────────────────────────┘

Spacing: 16-24px (--curation-spacing-sm/md)
Font Size: 0.875-1rem
Cards: 2-column grid
```

### 🖥️ Desktop (1200px+)
```
┌──────────────────────────────────────────────────────────┐
│ ← Title Title          [Analyze Pending] [Delete Unavail] │
├──────────────────────────────────────────────────────────┤
│ [Approved] [Pending] [Rejected] [Unavailable]             │
│ (4-column auto-fit grid)                                  │
├──────────────────────────────────────────────────────────┤
│ Status:                                                   │
│ [Approved Man] [Approved AI] [Pending] [Rejected] [Unav] │
├──────────────────────────────────────────────────────────┤
│ Category:[Dropdown] Search:[Input Search] Order:[Dropdown]│
├──────────────────────────────────────────────────────────┤
│  [Card 1]   [Card 2]   [Card 3]  │  [Card 4]   [Card 5]  │
│ (Triple     (responsive │          (Triple column)      │
│  column     columns)     │          CSS Grid,           │
│  grid)                   │          auto-fill)          │
│  [Card 6]   [Card 7]   [Card 8]  │  [Card 9]   [Card 10]│
├──────────────────────────────────────────────────────────┤
│                    Pagination (centered)                 │
└──────────────────────────────────────────────────────────┘

Spacing: 24-32px (--curation-spacing-md/lg)
Font Size: 0.875-1rem
Cards: 3-column grid (320px min-width each)
Max Container: 1200px
```

---

## Component Responsiveness Details

### Summary Cards
- **Desktop**: 4 cards per row (200px minimum width each)
- **Large Tablet**: 4 cards per row (responsive)
- **Tablet**: 2 cards per row
- **Mobile**: 2 cards per row (stacked on very small screens)

```css
Desktop:     [Card][Card][Card][Card]
Tablet:      [Card][Card]
             [Card][Card]
Mobile:      [Card][Card]
             [Card][Card]
```

### Filter Status Buttons
- **Desktop**: All buttons in one row, flex-wrap enabled
- **Mobile**: Buttons wrap with minimum 120px width, can stack to multiple rows

```
Desktop:  [All] [Approved Manual] [Approved IA] [Pending] [Rejected] [Unavailable]

Mobile:   [All] [Approved Man] [Approved IA]
          [Pending] [Rejected] [Unavailable]
```

### Filter Controls Row
- **Desktop**: 3-column layout
  ```
  [Category] [Search] [Order]
  ```
- **Tablet**: 2-column layout
  ```
  [Category] [Search]
  [Order]
  ```
- **Mobile**: 1-column layout
  ```
  [Category]
  [Search]
  [Order]
  ```

### Cards Grid
| Device | Columns | Card Width | Min Width |
|--------|---------|-----------|-----------|
| Desktop | 3 | ~320px | auto-fill |
| Large Tab | 3 | ~280px | auto-fill |
| Tablet | 2 | 50% | (2 col) |
| Mobile | 1 | 100% | (1 col) |

---

## Spacing System

### Page Level
```
Desktop:     32px padding (--curation-spacing-lg)
Tablet:      24px padding (--curation-spacing-md)
Mobile:      16px padding (--curation-spacing-sm)
Small Mobile: 8px padding (--curation-spacing-xs)
```

### Component Gaps
```
Summary Grid Gap:    16px (--curation-spacing-sm)
Filter Groups Gap:   24px (--curation-spacing-md)
Cards Grid Gap:      24px (--curation-spacing-md)
Field Gaps:          8px (default)
```

### Padding Inside Components
- **Cards**: 16-24px depending on device
- **Headers**: 16-24px horizontal, 12px vertical (mobile)
- **Content**: 16-24px with adjusted line heights
- **Actions**: 8-16px with flexible layout

---

## Color & Visual Adjustments

### Button Sizes
```
Desktop:     Full Material-UI size
Tablet:      Slightly reduced
Mobile:      Optimized for touch (min 44x44px recommended)
Small Mobile: Compact with 6-8px padding
```

### Font Size Adjustments
```
Desktop:      0.875rem - 1rem
Tablet:       0.85rem - 0.95rem
Mobile:       0.8rem - 0.85rem
Small Mobile: 0.65rem - 0.75rem (very compact)
```

### Touch Targets
- Buttons: Minimum 44x44px (WCAG AA compliant)
- Links: Touch-friendly spacing
- Mobile optimizations: Increased tap areas where possible

---

## Interactive States

### Hover Effects
```
Desktop:        Full transitions with shadows
Tablet:         Same as desktop
Mobile:         Reduced to prevent lag
Small Mobile:   Simple transitions only
```

### Animations
```
All Devices:    0.3s cubic-bezier transitions
Shimmer Effect: 0.5s left movement on toggle buttons
Transform:      translateY(-4px) on card hover
Shadow:         Smooth elevation changes
```

---

## Focus & Accessibility

### Focus States
- All interactive elements have visible `:focus-visible` states
- Outline: 2px solid primary color
- Outline offset: 2px
- High contrast for visibility on all backgrounds

### Mobile Optimizations
- Increased touch target sizes
- Larger tap areas
- Clearer visual feedback
- Reduced hover-dependent interactions

---

## Print Styles

### Printable Layout
```css
Hidden Elements:
- .curation-filters (filter section)
- .curation-actions (action buttons)
- .curation-pagination (pagination)

Card Behavior:
- page-break-inside: avoid (keeps cards intact)
- Full width layout
- No hover effects
- Simplified colors for print
```

---

## Performance Optimizations

### CSS Grid Benefits
- Automatic responsive columns with `auto-fit`
- No floats or positioning hacks
- Native browser optimization
- Reduced layout recalculations

### Flexbox Benefits
- Efficient button group layout
- Flexible spacing
- Automatic alignment
- Responsive wrapping

### Transform Optimizations
- Hardware acceleration on `translateY`
- Smooth 60fps animations
- No repaints during transitions
- Efficient on mobile devices

---

## Testing Checklist

- [ ] Desktop (1920px) - All features visible, 3-column cards
- [ ] Large Desktop (1440px) - Optimal spacing
- [ ] Large Tablet (1024px) - 3-column cards adapting
- [ ] Tablet (768px) - 2-column cards, stacked filters
- [ ] Small Tablet (600px) - 2-column cards, single filters
- [ ] Mobile (480px) - 1-column cards, wrapped buttons
- [ ] Small Mobile (360px) - Compact layout, readable text
- [ ] Touch devices - Hover not required, touch targets adequate
- [ ] Print preview - No filters/pagination, cards intact
- [ ] Accessibility - Focus states visible, ARIA labels work

---

## Summary

The Curation Page now has a **professional, fully responsive CSS architecture** that elegantly adapts from small mobile devices to large desktop screens, with:

✅ 5 responsive breakpoints
✅ Adaptive grid layouts (CSS Grid + Flexbox)
✅ Professional shadows and transitions
✅ Touch-friendly on mobile
✅ Accessibility compliant
✅ Print-optimized
✅ Performance optimized
✅ Material-UI design aligned
