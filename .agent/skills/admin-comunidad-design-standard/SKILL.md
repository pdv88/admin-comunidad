---
name: admin-comunidad-design-standard
description: Design standards and UI patterns for the Habiio Admin Comunidad application.
---

# Admin Comunidad Design Standard

This skill establishes the visual language and implementation patterns for the Habiio Admin Comunidad web application. Follow these guidelines to maintain consistency across all components and pages.

## Core Visual Theme: "Modern Glass"
The application uses a "Glassmorphism" aesthetic characterized by translucent backgrounds, subtle borders, and vibrant gradient accents.

### Color Palette
- **Base Backgrounds**: 
  - Light: `bg-slate-300` with overlay `bg-gradient-to-br from-blue-100/40 via-purple-100/40 to-pink-100/40`
  - Dark: `bg-slate-950` with overlay `dark:from-blue-900/10 dark:via-purple-900/10 dark:to-pink-900/10`
- **Primary Accents**: 
  - Gradients: `from-blue-600 via-indigo-600 to-blue-600` (Light) or `from-blue-400 dark:to-violet-400` (Dark/Text)
- **Status Colors**:
  - Success: Emerald/Green
  - Warning: Amber/Yellow
  - Danger: Red/Rose

### Tailwind Components (index.css)
Always use these pre-defined classes instead of ad-hoc utilities when possible:

- `.glass-card`: Main containers with blur and shadows.
- `.glass-panel`: Animated dropdowns or floating sections.
- `.glass-input`: Rounded-full inputs with subtle borders.
- `.glass-button`: Primary gradient buttons with hover scaling.
- `.glass-button-secondary`: White/Neutral rounded buttons.
- `.glass-button-danger`: Red gradient buttons for destructive actions.
- `.glass-table`: Consistent table headers and hover effects.

### Animations (tailwind.config.js)
The app feels "alive" through micro-interactions:
- `animate-blob`: Floating background shapes.
- `animate-fade-in-up`: Smooth entry for page content.
- `animate-slide-down`: Entrance for panels and modals.
- `animate-gradient-x`: Flowing backgrounds for primary buttons/loading.

## Component Patterns

### Layout
Every authenticated page should be wrapped in `DashboardLayout`.
- Use `GlassLoader` for loading states.
- Use `StatusBadge` for state indicators (Pending, Paid, Rejected).

### Modals & Forms
- **Standard Modal Structure**:
  - Always use the `Modal` component for custom overlays.
  - Always use the `FormModal` component for form-based overlays.
  - Content Wrapper: `glass-card w-full max-w-lg overflow-hidden transform transition-all animate-in zoom-in-95`.
  - Layout:
    - Header: Padding `p-6`, Title `text-xl font-bold`.
    - Body: Padding `p-6`, scrollable with `overflow-y-auto`.
    - Footer: Padding `px-6 py-4 flex justify-end gap-3 bg-gray-50/50 dark:bg-white/5`.

#### Standard Modal
```jsx
import Modal from './Modal';

<Modal isOpen={isOpen} onClose={onClose} title="Custom Modal">
  <div>Custom Content</div>
</Modal>
```

#### Standard Form Modal
```jsx
import FormModal from './FormModal';

<FormModal 
  isOpen={isOpen} 
  onClose={onClose} 
  onSubmit={handleSubmit}
  title="Edit Property"
  isLoading={loading}
>
  <div className="space-y-4">
    {/* Form Fields */}
  </div>
</FormModal>
```

### Button Loaders
To ensure consistency and prevent layout shifts, **always** use the `Button` component:

```jsx
import Button from './Button';

<Button 
  variant="primary" 
  isLoading={isLoading} 
  onClick={handleAction}
>
  Confirm Action
</Button>
```

The `Button` component handles variants (`primary`, `secondary`, `danger`, `ghost`), integrated loaders, and ensures the button width doesn't change when switching to the loading state.

## Best Practices
1. **Interactive Elements**: Add `active:scale-95` and `transition-all duration-300` to all buttons.
2. **Spacing**: Use `p-4` or `p-6` for card padding. Maintain consistent vertical margins (`space-y-4`).
3. **Typography**: Use standard Tailwind text sizes. Primary headers should be `text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600`.
4. **Icons**: Use Lucide-React or similar consistent icon sets with `size={20}` or `size={24}`.
