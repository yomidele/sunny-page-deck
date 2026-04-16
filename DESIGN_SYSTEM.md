# MEEKAH Premium JAMB CBT Platform - UI/UX Design System

## 🎨 Color Palette (STRICT)

- **Primary Background**: #0B0B0B (Deep Black)
- **Secondary Background**: #111111, #1A1A1A (Dark Grays)
- **Accent**: #FFD700 (Yellow - 5% only)
- **Text Primary**: #FFFFFF (White)
- **Text Secondary**: #B0B0B0 (Light Gray)
- **Ratio**: 80% black/dark, 15% white/gray text, 5% yellow

## 🔤 Typography

- **Headings**: Space Grotesk (bold, confident)
- **Body**: Inter (clean, readable)

## 📐 Layout Components

### Landing Page ✅

- Sticky header with logo + nav
- Full-width hero with large headline + yellow CTA
- 3-column feature cards with hover effects
- Video thumbnail grid (4 cols desktop, 1 col mobile)
- News/Blog section with cards
- Footer with social links

### Dashboard ✅

- Left sidebar (fixed desktop, hamburger mobile)
- Active item: yellow left border + glow
- Welcome card with stats
- Stats cards: tests taken, avg score, best score, questions practiced
- Quick action buttons (large, yellow primary)
- Recent activity section

### Practice Mode

- Full-width question card (centered)
- Large, readable question text
- 4 option buttons (full width)
- Selected: yellow border
- Correct: green highlight
- Wrong: red highlight
- Navigation: Next/Submit buttons
- Summary page with score display

### CBT Exam (CRITICAL)

- **Desktop Layout**:
  - Sticky timer (top-right)
  - Question in center
  - Question grid on right (10x16 grid)
- **Mobile Layout**:
  - Sticky timer at top
  - Question fullwidth
  - Toggle question grid (modal/drawer)
- Grid colors:
  - Answered: yellow
  - Unanswered: dark gray
  - Current: yellow + border
  - Submitted (exam mode): compare with correct

### Result Page

- Large score display (center, yellow)
- Subject-wise breakdown cards
- Performance metrics
- CTA to try again or dashboard

## ✨ Micro-Interactions

- Smooth 300ms transitions
- Hover: subtle scale + glow
- Button feedback: press animation
- Progress bar: smooth fill
- Loading: spinner animation
- Page load: fade-in

## 📱 Responsiveness

- Mobile-first approach
- Large touch targets (min 44px)
- No horizontal scroll
- Proper spacing (6px, 12px, 24px)
- Hamburger menu for navigation

## 🎯 Design Principles

1. **Professional** - exam-focused, not playful
2. **Minimal** - no clutter, focus on content
3. **Fast** - feels responsive, no lag
4. **Intentional** - every element has purpose
5. **Accessible** - good contrast, readable text
