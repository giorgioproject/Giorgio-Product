# Harbor

Clean, professional SaaS. White canvas, one blue, lots of air. Looks like a modern work tool.

`DESIGN.md` is the only look. To change it later, edit hex values here and in `app/globals.css` `:root` (for example `--primary`). Do not add a second design file.

## Apply (once)

After shadcn init, paste the token values from `themes/harbor.css` into the `:root { ... }` block in `app/globals.css`. Keep imports, `@theme`, and the base layer.

Tell Cursor: *Follow `DESIGN.md`. Use theme tokens only (`bg-primary`, `text-muted-foreground`). Do not hardcode colors.*

## Colors
- Background: `#FFFFFF`
- Surface / cards: `#F8FAFC`
- Text: `#0F172A`
- Muted text: `#64748B`
- Border: `#E2E8F0`
- Brand: `#2563EB`
- Brand hover: `#1D4ED8`
- Brand on color: `#FFFFFF`
- Success: `#15803D`
- Danger: `#B91C1C`

## Type
- Font: Inter, system-ui, sans-serif
- Page title: 28–32px, weight 600
- Section title: 20px, weight 600
- Body: 16px, weight 400, line-height 1.5
- Small / meta: 13px, `#64748B`

## Shape and space
- Radius: 10px on cards and inputs, 8px on buttons
- Soft shadow on cards only: `0 1px 2px rgba(15,23,42,0.06)`
- Page padding: 24–32px
- Space between sections: 32px
- Max content width: 1080px, centered

## Components
- **Nav:** top bar, white, thin bottom border, logo left, links right
- **Primary button:** solid brand blue, white text, no gradient
- **Secondary button:** white, gray border
- **Cards:** light gray surface, 1px border, small shadow
- **Forms:** labels above fields, clear focus ring in brand blue

## Do
- Lots of whitespace
- One brand color only
- Left-align body text

## Don’t
- Gradients, glass, neon, or dark mode
- More than one accent color
- Decorative illustrations unless asked
