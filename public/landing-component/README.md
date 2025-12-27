# CSE CRM Screenshot Carousel Components

Ready-to-use React components for displaying CRM screenshots on the WebSlingerLanding page.

## Quick Setup

### Step 1: Copy Screenshots
Copy all PNG files from `/screenshots/` to your WebSlingerLanding app's assets folder.

### Step 2: Choose a Component

**Option A: ScreenshotCarousel.tsx** - Classic carousel with left/right arrows
- Full navigation controls
- 17 curated screenshots
- Category badges
- Dot navigation

**Option B: StackedCarousel.tsx** - Stacked cards effect (recommended)
- Click left/right to navigate
- 3D stacking visual
- 9 best screenshots
- Smooth animations

### Step 3: Update Image Paths

In the component, update the `src` paths to match your asset location:

```tsx
// Before (current paths)
src: "/screenshots/01_admin_dashboard.png"

// After (for WebSlingerLanding)
import adminDashboard from "@assets/screenshots/01_admin_dashboard.png";
// Then use: src: adminDashboard
```

### Step 4: Add to Your Page

```tsx
import StackedCarousel from "@/components/StackedCarousel";

export default function LandingPage() {
  return (
    <section className="py-20 bg-gray-950">
      <div className="container mx-auto">
        <h2 className="text-4xl font-bold text-center text-white mb-12">
          See It In Action
        </h2>
        <StackedCarousel />
      </div>
    </section>
  );
}
```

## Screenshot Files Included

| File | Description |
|------|-------------|
| 00_login.png | Login page |
| 01_admin_dashboard.png | Admin KPI dashboard |
| 02_admin_leads.png | Multi-source lead management |
| 06_admin_pricebook.png | Service pricebook |
| 07_admin_marketing.png | Marketing ROI tracking |
| 10_dispatcher_dashboard.png | Dispatch center |
| 14_dispatcher_map.png | Live GPS tracking map |
| 18_tech_quote_builder.png | On-site quote builder |
| 20_sales_dashboard.png | Sales commission dashboard |

## Dependencies

- React 18+
- Tailwind CSS (for styling)
- lucide-react (only for ScreenshotCarousel arrows)

## Customization

Edit the `screenshots` array in either component to:
- Change order
- Update descriptions
- Add/remove screenshots
- Modify category colors
