# StudyBuddy Design Guidelines

## 🎨 Design System

### Color Palette

#### Primary Colors

- **Blue**: `#2563eb` (hover: `#1d4ed8`)
- **Purple**: `#7c3aed` (hover: `#6d28d9`)
- **Pink**: `#ec4899` (hover: `#db2777`)

#### Accent Colors

- **Cyan**: `#06b6d4`
- **Green**: `#10b981`
- **Amber**: `#f59e0b`
- **Red**: `#ef4444`

#### Neutral Colors

- **White**: `#ffffff`
- **Gray 50**: `#f9fafb`
- **Gray 100**: `#f3f4f6`
- **Gray 600**: `#4b5563`
- **Gray 900**: `#111827`

### Dark Mode

- **Background**: `#0f172a` to `#1e293b`
- **Foreground**: `#f1f5f9`
- **Cards**: `#1e293b`

---

## 📐 Typography

### Font Scale

```
H1: 2.25rem (36px) - Bold
H2: 1.875rem (30px) - Bold
H3: 1.5rem (24px) - Bold
Body: 1rem (16px) - Regular
Small: 0.875rem (14px) - Regular
Tiny: 0.75rem (12px) - Regular
```

### Font Weights

- **Bold**: 700 (Headings)
- **Semibold**: 600 (Subheadings, labels)
- **Medium**: 500 (Buttons, important text)
- **Regular**: 400 (Body text)

---

## 🎯 Component Spacing

### Padding Scale (Tailwind)

- **p-2**: 0.5rem (8px)
- **p-3**: 0.75rem (12px)
- **p-4**: 1rem (16px)
- **p-6**: 1.5rem (24px)
- **p-8**: 2rem (32px)

### Margin Scale

- **mb-2**: 0.5rem gap
- **mb-4**: 1rem gap
- **mb-6**: 1.5rem gap
- **mb-8**: 2rem gap

### Border Radius

- **rounded-lg**: 0.5rem (8px) - Standard
- **rounded-xl**: 0.75rem (12px) - Forms, cards
- **rounded-2xl**: 1rem (16px) - Large cards, modals
- **rounded-full**: 9999px - Pills, badges

---

## ✨ Animation Guidelines

### Timing Functions

```
Standard ease: 300-500ms
Loading/Pulse: Infinite
Entrance: slide-up (500ms) or fade-in (300ms)
Hover: 200ms
```

### Animation Classes

```
animate-slide-up       - Entrance animation (slide + fade)
animate-slide-down     - Reverse entrance
animate-fade-in        - Fade entrance
animate-pulse          - Loading states
animate-pulse-glow     - Glowing pulse effect
animate-float          - Decorative floating
animate-shimmer        - Shimmer effect
```

### Usage Examples

```jsx
// Entrance animation
<div className="animate-slide-up">Content</div>

// Loading state
<div className="animate-pulse">Loading...</div>

// Hover effect
<button className="hover:scale-105 transition-transform">
  Click me
</button>

// With delay
<div className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
  Delayed content
</div>
```

---

## 🎨 Button Styles

### Primary Button

```jsx
<Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold">
  Primary Action
</Button>
```

### Secondary Button

```jsx
<Button variant="outline" className="hover:bg-gray-100">
  Secondary Action
</Button>
```

### Danger Button

```jsx
<Button className="bg-red-600 hover:bg-red-700 text-white">Delete</Button>
```

---

## 🃏 Card Styles

### Standard Card

```jsx
<div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-md hover:shadow-lg transition-shadow">
  Card content
</div>
```

### Gradient Card

```jsx
<div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 p-1">
  <div className="rounded-2xl bg-white dark:bg-slate-800 p-6">Content</div>
</div>
```

### Colored Card

```jsx
<div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
  Colored content
</div>
```

---

## 📝 Input Styles

### Text Input

```jsx
<div className="relative">
  <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
  <Input
    type="email"
    placeholder="you@example.com"
    className="pl-12 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 focus:bg-white dark:focus:bg-slate-700 transition-colors"
  />
</div>
```

---

## 🎭 Interactive States

### Hover State

```jsx
className = "hover:shadow-lg hover:scale-105 transition-all";
```

### Focus State

```jsx
className =
  "focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 dark:focus:ring-offset-slate-800";
```

### Disabled State

```jsx
className = "disabled:opacity-50 disabled:cursor-not-allowed";
```

### Active State

```jsx
className = "active:scale-95";
```

---

## 🎯 Responsive Breakpoints

```
Mobile: < 640px
Tablet: 640px - 1024px
Desktop: > 1024px
```

### Responsive Classes Usage

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* 1 column on mobile, 2 on tablet, 3 on desktop */}
</div>
```

---

## 🌙 Dark Mode Implementation

### Markup Example

```jsx
<div className="bg-white dark:bg-slate-800">
  <h1 className="text-gray-900 dark:text-white">Title</h1>
  <p className="text-gray-600 dark:text-gray-400">Subtitle</p>
</div>
```

### Toggling Dark Mode

```jsx
const toggleDarkMode = () => {
  setIsDark(!isDark);
  document.documentElement.classList.toggle("dark");
};
```

---

## ♿ Accessibility Guidelines

1. **Color Contrast**: Ensure WCAG AA compliance (4.5:1 for text)
2. **Alt Text**: Provide alt text for all images
3. **Semantic HTML**: Use proper heading hierarchy (h1, h2, h3)
4. **Keyboard Navigation**: All interactions must be keyboard accessible
5. **ARIA Labels**: Use for screen readers where needed
6. **Focus Indicators**: Always visible and obvious
7. **Icon + Text**: Combine icons with text for clarity

---

## 📱 Mobile-First Design

1. **Start with mobile**: Design for small screens first
2. **Progressive Enhancement**: Add complexity for larger screens
3. **Touch Targets**: Min 44x44px for buttons
4. **Readable Text**: Min 16px font size on mobile
5. **Simplified Layouts**: Single column on mobile
6. **Hamburger Menus**: For navigation on mobile
7. **Full-Width Forms**: On mobile devices

---

## 🚀 Performance Tips

1. **Lazy Load Images**: Use `loading="lazy"` attribute
2. **CSS Over JS**: Use Tailwind instead of JavaScript animations
3. **Minimize Animations**: Respect `prefers-reduced-motion`
4. **Optimize SVGs**: Inline critical SVGs
5. **Code Split**: Load components on demand
6. **Tree Shake**: Remove unused Tailwind classes

---

## 📋 Common Patterns

### Loading State

```jsx
<div className="flex items-center justify-center gap-2">
  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
  <div
    className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
    style={{ animationDelay: "0.1s" }}
  ></div>
  <div
    className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
    style={{ animationDelay: "0.2s" }}
  ></div>
</div>
```

### Empty State

```jsx
<div className="text-center py-12">
  <div className="text-6xl mb-4">📭</div>
  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
    No results
  </h3>
  <p className="text-gray-600 dark:text-gray-400">Try adjusting your filters</p>
</div>
```

### Error State

```jsx
<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-400">
  ⚠️ Something went wrong
</div>
```

### Success State

```jsx
<div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-green-700 dark:text-green-400">
  ✅ Success! Your changes have been saved
</div>
```

---

## 🎨 Design Tokens

### Shadows

- `shadow-sm`: Subtle shadow
- `shadow-md`: Medium shadow (default)
- `shadow-lg`: Large shadow (hover)
- `shadow-xl`: Extra large (modal)

### Transitions

- `transition`: Default 150ms
- `transition-all`: All properties
- `transition-colors`: Color changes
- `transition-transform`: Scale/position changes
- `transition-shadow`: Shadow changes

### Gradients

```jsx
// Text gradient
className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"

// Background gradient
className="bg-gradient-to-br from-blue-600 to-purple-600"

// Border gradient (using p-1 wrapper)
<div className="bg-gradient-to-r from-blue-600 to-purple-600 p-1 rounded-xl">
  <div className="bg-white rounded-xl p-4">Content</div>
</div>
```

---

## ✅ Quality Checklist

- [ ] Component works on mobile, tablet, desktop
- [ ] Dark mode is properly implemented
- [ ] Hover states are visible and responsive
- [ ] Loading states are animated
- [ ] Error states are clear and helpful
- [ ] Success confirmations are visible
- [ ] Accessibility standards are met
- [ ] Performance is optimal
- [ ] Code is clean and maintainable

---

**Version**: 1.0  
**Last Updated**: November 6, 2025  
**Status**: Active ✅
