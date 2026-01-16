# components/ui

## OVERVIEW
shadcn/ui-based component library with Radix UI primitives, featuring an extremely complex sidebar component with 30+ exports and cookie-based state management.

## WHERE TO LOOK

### Core State Management
- **sidebar.tsx** (758 lines): Primary complexity hotspot with 30+ exports including `SidebarProvider`, `Sidebar`, `SidebarContent`, `SidebarMenu`, etc. Uses cookie-based persistence (`sidebar_state`) with 7-day expiry. Context-driven state with mobile/desktop toggle logic.

### Primitives (Radix UI Wrappers)
- **sheet.tsx**: Dialog-based drawer/sheet component with slide animations and variant positioning
- **dialog.tsx**: Modal dialogs with overlay and portal support
- **dropdown-menu.tsx**: Radix dropdown with trigger/content/submenu structure
- **tooltip.tsx**: Tooltip with provider/trigger/content separation

### Input Components
- **button.tsx**: CVA-based variants (default/ghost/link/destructive/outline/secondary) and sizes (default/sm/lg/icon)
- **input.tsx**: Standard text input field
- **textarea.tsx**: Multi-line text area

### Display Components
- **avatar.tsx**: User avatar with image fallback support
- **separator.tsx**: Horizontal/visual dividers
- **skeleton.tsx**: Loading placeholder states

## CONVENTIONS

### Component Structure
- All components follow shadcn/ui pattern: `import { cn } from "@/lib/utils"` for className merging
- Use Radix UI primitives as base (`@radix-ui/react-*`) wrapped with custom styling
- Export components as named exports (default: no `export default`)

### Styling Approach
- Tailwind CSS with `cn()` utility for conditional class merging
- CVA (class-variance-authority) for variant management (see button.tsx)
- Data attributes for state tracking (e.g., `data-state="open"`, `data-slot="sheet"`)

### State Management Patterns
- Cookie-based persistence for layout state (sidebar uses `document.cookie`)
- Context providers for complex state (`SidebarContext`, `TooltipProvider`)
- Keyboard shortcuts registered via `useEffect` (sidebar uses `b` key)

## ANTI-PATTERNS

### NEVER DO
- **Modify cookie state outside SidebarProvider**: Cookie operations are encapsulated within sidebar.tsx
- **Bypass Context providers**: Components like `useSidebar()` throw if used outside provider
- **Ignore responsive behavior**: Sidebar has separate desktop/mobile state (`open` vs `openMobile`)
- **Hardcode variant classes**: Use CVA or maintain existing variant object patterns
- **Export as default**: Components use named exports for tree-shaking

### Component Complexity
- **Don't add complexity to sidebar.tsx**: Already at 758 lines with 30+ exports; extract new features into separate components
- **Avoid inline variant definitions**: Keep CVA patterns consistent (see button.tsx for reference)
