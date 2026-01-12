# Frontend Design Guide

**RULE: NEVER use purple/pink/indigo gradients. Use existing Scaffold-ETH theme tokens (base-100, base-200, base-300, primary, secondary, accent) for all colors.**

This guide ensures AI agents create professional, context-appropriate frontends instead of generic "vibe coded" purple gradient SaaS apps.

---

## CRITICAL: Design Anti-Patterns

**NEVER use these patterns unless explicitly requested by the user:**

### Banned Colors
- ❌ Purple, violet, lavender, indigo, or any blue-purple hues
- ❌ Neon colors (hot pink, electric blue, lime green)
- ❌ Pastel rainbow combinations

### Banned Effects
- ❌ Gradient backgrounds
- ❌ Glassmorphism (frosted glass effects)
- ❌ Blur effects (backdrop-blur, filter: blur)
- ❌ Glow effects (box-shadow with spread > 4px)
- ❌ Shadows larger than `shadow-md` (4px)
- ❌ Animated gradients or color transitions

### Banned Aesthetics
- ❌ "SaaS landing page" styling
- ❌ Floating cards with heavy shadows on gradient backgrounds
- ❌ Hero sections with gradient mesh backgrounds
- ❌ "Modern", "sleek", "futuristic" interpretations (these trigger purple)

**Why?** Purple gradients reduce perceived seriousness and make apps feel generic. The goal is trust, durability, and technical credibility.

---

## Material Descriptions (Use Instead of Color Words)

When describing visual style, use these terms instead of abstract words like "modern" or "sleek":

| Instead of... | Say... |
|---------------|--------|
| Modern | Industrial, utilitarian |
| Sleek | Print-like, newspaper |
| Futuristic | Terminal-inspired |
| Clean | Paper & ink |
| Minimal | Brutalist |
| Professional | Government form |
| Beautiful | Early 2000s OSS tool |

**Example prompt addition:**
```
Visual style:
- Industrial, utilitarian
- Flat UI, print-like
- No glow, no blur, no neon
- Looks acceptable when printed in grayscale
```

---

## DaisyUI Theme Selection

**ALWAYS use a DaisyUI theme. NEVER create custom color schemes.**

Scaffold-ETH 2 includes DaisyUI. Select themes based on project context:

### Theme Selection by Project Type

| Project Type | Primary Theme | Alternative | Rationale |
|--------------|---------------|-------------|-----------|
| DeFi / Finance | `corporate` | `business` | Trust, seriousness, professional |
| Yield Vaults | `corporate` | `lofi` | Financial credibility |
| Token Swaps | `corporate` | `emerald` | Clean, transactional |
| Developer Tools | `dracula` | `black` | Terminal-like, technical |
| NFT Marketplace | `retro` | `garden` | Friendly but not garish |
| Gaming / Social | `retro` | `bumblebee` | Approachable, fun |
| Data Dashboards | `lofi` | `wireframe` | Readable, information-dense |
| Admin Panels | `corporate` | `lofi` | Utilitarian, functional |

### Setting the Theme

In `packages/nextjs/tailwind.config.js`:

```javascript
module.exports = {
  // ... other config
  daisyui: {
    themes: ["corporate"], // Use ONE theme
  },
}
```

**NEVER mix themes or add multiple themes unless building a theme switcher.**

### Good Non-Purple Themes (Safe Defaults)

These themes will NOT produce purple UIs:
- `corporate` - Blue/gray, professional (RECOMMENDED DEFAULT)
- `business` - Similar to corporate, slightly warmer
- `lofi` - Grayscale, minimal
- `retro` - Warm browns and oranges
- `bumblebee` - Yellow/amber accent
- `emerald` - Green accent
- `garden` - Green/natural tones
- `dracula` - Dark theme, no purple if constrained
- `black` - Pure dark mode

### Themes to AVOID (Purple-Adjacent)

- `synthwave` - Purple/pink neon
- `cyberpunk` - Can drift purple
- `valentine` - Pink/purple
- `night` - Can have purple tints

---

## Color System Templates

If you must define custom colors, use a **closed palette** - not ad-hoc hex values.

### Template: Financial/DeFi App

```css
:root {
  --color-primary: #111827;    /* Near-black - headings, primary actions */
  --color-secondary: #374151;  /* Dark gray - secondary text */
  --color-accent: #10B981;     /* Emerald - success, positive values */
  --color-warning: #F59E0B;    /* Amber - warnings, pending states */
  --color-error: #EF4444;      /* Red - errors, negative values */
  --color-background: #FAFAFA; /* Off-white - page background */
  --color-surface: #FFFFFF;    /* White - cards, inputs */
  --color-border: #E5E7EB;     /* Light gray - borders, dividers */
}
```

### Template: Developer Tool

```css
:root {
  --color-primary: #F8F8F2;    /* Off-white - primary text */
  --color-secondary: #6272A4;  /* Muted blue - secondary text */
  --color-accent: #50FA7B;     /* Green - success, active */
  --color-warning: #FFB86C;    /* Orange - warnings */
  --color-error: #FF5555;      /* Red - errors */
  --color-background: #282A36; /* Dark - page background */
  --color-surface: #44475A;    /* Lighter dark - cards */
  --color-border: #44475A;     /* Same as surface */
}
```

### Template: Consumer/Friendly App

```css
:root {
  --color-primary: #1F2937;    /* Dark gray - headings */
  --color-secondary: #4B5563;  /* Medium gray - body text */
  --color-accent: #F59E0B;     /* Amber - CTAs, highlights */
  --color-success: #10B981;    /* Emerald - success states */
  --color-error: #EF4444;      /* Red - errors */
  --color-background: #FFFBEB; /* Warm white - background */
  --color-surface: #FFFFFF;    /* White - cards */
  --color-border: #FDE68A;     /* Light amber - borders */
}
```

**Rule: Pick ONE template. Use ONLY those colors. No exceptions.**

---

## Design Lint Checklist

Before generating any UI code, verify ALL rules pass:

```
DESIGN LINT CHECKLIST
=====================

Colors:
[ ] No purple, violet, lavender, or indigo anywhere
[ ] No gradient backgrounds (bg-gradient-*)
[ ] All colors come from DaisyUI theme tokens OR closed palette
[ ] Works acceptably in grayscale

Effects:
[ ] No glassmorphism (backdrop-blur, bg-opacity with blur)
[ ] No glow effects (shadow-glow, large colored shadows)
[ ] Shadows are shadow-sm or shadow-md maximum
[ ] No animated color transitions

Layout:
[ ] No floating cards on gradient backgrounds
[ ] No hero sections with mesh gradients
[ ] Information hierarchy is clear
[ ] Spacing is consistent (use Tailwind scale)

Components:
[ ] Using DaisyUI components (btn, card, input, etc.)
[ ] Not overriding DaisyUI theme colors with custom values
[ ] Form inputs have clear borders, not just underlines

If ANY check fails, revise before responding.
```

---

## Real-World Reference Anchors

When designing, mentally reference these tools - NOT consumer SaaS marketing sites:

### Financial/DeFi Apps → Reference:
- **Etherscan** (light mode) - Dense information, utilitarian
- **Uniswap** (the app, not marketing) - Clean, functional
- **Aave Dashboard** - Data-focused, professional

### Developer Tools → Reference:
- **GitHub Settings pages** - Not the marketing site
- **Stripe Dashboard** - Clean, lots of white space
- **AWS Console** (old style) - Utilitarian, information-dense

### Data/Admin → Reference:
- **Bloomberg Terminal** - Information density
- **GOV.UK Design System** - Accessible, clear hierarchy
- **Basecamp Classic** - Functional, no-nonsense

### General Principle:
These tools are TRUSTED because they look serious. Purple gradients look like "yet another AI startup."

---

## Component Patterns

### Cards

```tsx
// GOOD - Uses theme, subtle shadow
<div className="card bg-base-100 shadow-sm border border-base-300">
  <div className="card-body">
    <h2 className="card-title">Vault Balance</h2>
    <p className="text-2xl font-mono">$12,345.67</p>
  </div>
</div>

// BAD - Gradient, glow, too much shadow
<div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-2xl shadow-purple-500/50 p-6">
  ...
</div>
```

### Buttons

```tsx
// GOOD - DaisyUI theme button
<button className="btn btn-primary">Deposit</button>
<button className="btn btn-outline">Cancel</button>

// BAD - Custom gradient button
<button className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-purple-500/50">
  ...
</button>
```

### Stats/Metrics

```tsx
// GOOD - Clean, readable
<div className="stats bg-base-200 shadow-sm">
  <div className="stat">
    <div className="stat-title">Total Value Locked</div>
    <div className="stat-value">$4.2M</div>
    <div className="stat-desc text-success">↑ 12% from last week</div>
  </div>
</div>

// BAD - Flashy, distracting
<div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl p-6 shadow-2xl">
  <span className="text-purple-300 text-sm">TVL</span>
  <span className="text-4xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
    $4.2M
  </span>
</div>
```

### Form Inputs

```tsx
// GOOD - Clear, accessible
<div className="form-control">
  <label className="label">
    <span className="label-text">Amount</span>
  </label>
  <input 
    type="text" 
    className="input input-bordered w-full" 
    placeholder="0.00"
  />
</div>

// BAD - Underline-only, low contrast
<input 
  className="bg-transparent border-b border-purple-500/50 focus:border-purple-400 outline-none"
  ...
/>
```

---

## Handling User Requests

### If user says "make it look modern/sleek/beautiful":

Interpret as: "Make it professional and polished"
- Use `corporate` theme
- Add appropriate whitespace
- Ensure clear visual hierarchy
- DO NOT add gradients or purple

### If user says "make it pop" or "add some flair":

Interpret as: "Add visual interest within constraints"
- Use accent color strategically (buttons, highlights)
- Add subtle hover states
- Use iconography
- DO NOT add gradients or glow effects

### If user explicitly requests purple/gradients:

Then and ONLY then, use them. User intent overrides these guidelines.
But first, confirm: "I can add purple gradients. Just to check - is this for a specific brand requirement, or would you prefer a more unique look?"

---

## Why This Matters

1. **Trust**: Purple gradients signal "generic AI app" - users are skeptical
2. **Credibility**: Financial apps need to look serious
3. **Usability**: Flat colors and clear hierarchy are more readable
4. **Differentiation**: NOT looking like every other AI-generated app is a feature
5. **Professionalism**: Restraint in design signals competence

The goal is to build apps that look like they were designed by someone who cares about the craft, not generated by an AI with default settings.

---

## Transaction Flow UX Patterns

**CRITICAL: Getting transaction flows wrong is the #1 cause of broken mainnet UX.**

### The Approve-Then-Action Pattern

Most DeFi interactions require two transactions: approve token spending, then perform the action (deposit, swap, stake). This flow MUST handle transaction confirmation timing correctly.

#### Button State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│  IDLE          →  SIGNING       →  CONFIRMING    →  READY      │
│  "Approve"        "Approve..."     "Confirming..."   "Deposit"  │
│  (clickable)      (disabled)       (disabled)        (clickable)│
└─────────────────────────────────────────────────────────────────┘
```

**NEVER skip the "Confirming" state.** On mainnet, transactions take ~12 seconds to mine. If you enable the action button after wallet signature, the action will fail because approval isn't confirmed yet.

#### Correct Button Implementation

```tsx
// State tracks the full transaction lifecycle
const [txState, setTxState] = useState<
  "idle" | "signing" | "confirming" | "ready" | "executing"
>("idle");

// Button shows appropriate state
<button
  onClick={needsApproval ? handleApprove : handleDeposit}
  disabled={txState === "signing" || txState === "confirming"}
  className={`btn btn-primary ${
    (txState === "signing" || txState === "confirming") ? "loading" : ""
  }`}
>
  {txState === "idle" && needsApproval && "Approve"}
  {txState === "signing" && "Approve in Wallet..."}
  {txState === "confirming" && "Confirming..."}
  {txState === "ready" && "Deposit"}
  {txState === "executing" && "Depositing..."}
</button>
```

#### Visual Feedback Rules

| State | Button Text | Button Style | Spinner |
|-------|-------------|--------------|---------|
| Needs approval | "Approve [TOKEN]" | `btn-primary` | No |
| Waiting for wallet | "Approve in Wallet..." | `btn-primary loading` | Yes |
| Waiting for mining | "Confirming..." | `btn-primary loading` | Yes |
| Ready to deposit | "Deposit" | `btn-primary` | No |
| Depositing | "Depositing..." | `btn-primary loading` | Yes |

### Error States

Always provide clear feedback when transactions fail:

```tsx
// Error display
{error && (
  <div className="alert alert-error mt-4">
    <span>{error.message || "Transaction failed"}</span>
  </div>
)}

// Retry capability - return to idle state
const handleError = (e: Error) => {
  setError(e);
  setTxState("idle"); // Allow retry
};
```

### Why This Matters for Mainnet

| Environment | Block Time | What Happens |
|-------------|------------|--------------|
| Local Fork | ~0ms | Tx confirms instantly, bugs are hidden |
| Mainnet | ~12s | Tx takes time, premature button enable = failure |

**Test on a real mainnet (or slow fork) before launch.** The local fork auto-mines, hiding timing bugs.

---

## Quick Reference

```
DEFAULT THEME: corporate
FALLBACK THEME: lofi

SAFE ACCENT COLORS:
- Emerald (#10B981) - success, positive
- Amber (#F59E0B) - warning, highlight
- Red (#EF4444) - error, negative

BANNED:
- Purple/violet/indigo
- Gradients
- Glassmorphism
- Glow effects
- Shadows > 4px

REFERENCE SITES:
- Etherscan
- GitHub Settings
- Stripe Dashboard
- GOV.UK
```
