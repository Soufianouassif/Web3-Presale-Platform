# PEPEWIFE - Complete Project Guide

## Project Info
- **Name**: PEPEWIFE – The Lady of Memes
- **Token**: $PWIFE
- **Blockchain**: Solana
- **Type**: Single-page React + Vite presale platform (no backend)
- **Style**: Bold satirical cartoon meme aesthetic

---

## Color Palette

| Name       | HEX Code   | Usage                                      |
|------------|------------|---------------------------------------------|
| Green      | `#4CAF50`  | Primary CTA buttons, presale, success states |
| Dark Green | `#2E7D32`  | Green shadows, borders                       |
| Pink       | `#FF4D9D`  | Secondary accent, highlights, $PWIFE badge   |
| Dark Pink  | `#C2185B`  | Pink shadows                                 |
| Yellow     | `#FFD54F`  | Stickers, warnings, accents                  |
| Dark Yellow| `#F9A825`  | Yellow shadows                               |
| Blue       | `#42A5F5`  | Phase 3, chart color                         |
| Purple     | `#AB47BC`  | Phase 4, chart color                         |
| Dark BG    | `#1a1a2e`  | Text color, borders, navbar border           |
| SOL Green  | `#14F195`  | Solana brand color                           |
| Tether     | `#26A17B`  | USDT brand color                             |
| Gold       | `#b8860b`  | Listing price, gold text                     |

### Section Background Gradients

| Section          | Gradient                                              |
|------------------|-------------------------------------------------------|
| Navbar           | `linear-gradient(90deg, #FFFDE7, #E8F5E9)`           |
| Body (global)    | `linear-gradient(180deg, #FFFDE7, #E8F5E9, #FFF9C4, #F3E5F5)` |
| Partners Ticker  | `linear-gradient(90deg, #FFF9C4, #E8F5E9)`           |
| Presale          | `linear-gradient(180deg, #FFFDE7, #E8F5E9)`          |
| Why Buy          | `linear-gradient(180deg, #F3E5F5, #FFFDE7)`          |
| How to Buy       | `linear-gradient(180deg, #E8F5E9, #E3F2FD)`          |
| Tokenomics       | `linear-gradient(180deg, #FFFDE7, #FCE4EC)`          |
| Roadmap          | `linear-gradient(180deg, #E3F2FD, #E8F5E9)`          |
| Social Feed      | `linear-gradient(180deg, #FFF9C4, #F3E5F5)`          |
| Risk Warning     | `#FFF9C4` (solid)                                     |
| Footer           | `linear-gradient(135deg, #1a1a2e, #311B92)`           |

---

## Fonts

| Type     | Font Name     | CSS Class        | Usage                    |
|----------|---------------|------------------|--------------------------|
| Display  | `Bangers`     | `font-display`   | All headings, buttons, labels |
| Body     | `Comic Neue`  | `font-sans`      | Body text, descriptions  |
| Fallback | `Space Grotesk` | —              | System fallback          |

Google Fonts import (in index.css):
```
@import url('https://fonts.googleapis.com/css2?family=Bangers&family=Comic+Neue:wght@400;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');
```

---

## CSS Utility Classes (index.css)

### `.meme-card`
Thick black border + offset shadow. Hover lifts card up.
```css
border: 3px solid #1a1a2e;
box-shadow: 6px 6px 0px #1a1a2e;
/* hover: translate(-3px, -3px), shadow: 9px 9px */
```

### `.btn-meme`
Meme-style button with thick border and shadow.
```css
border: 3px solid #1a1a2e;
box-shadow: 4px 4px 0px #1a1a2e;
font-family: 'Bangers', cursive;
/* hover: lift up, active: press down */
```

### `.sticker`
Rounded pill badge with rotation.
```css
display: inline-block;
padding: 0.3em 0.8em;
border: 2px solid #1a1a2e;
border-radius: 9999px;
font-family: 'Bangers', cursive;
transform: rotate(-2deg);
box-shadow: 2px 2px 0px #1a1a2e;
```

### `.speech-bubble`
White box with triangle pointer at bottom-left.

### `.zigzag-border`
Rainbow colored horizontal divider (green, yellow, pink, blue repeating). Height: 6px.

### `.pattern-dots`
Subtle dot pattern overlay for sections.

### `.comic-shadow`
Text shadow: `3px 3px 0px rgba(0,0,0,0.15)`

### `.rainbow-text`
Animated gradient text (green → yellow → pink → blue → purple).

### `.wiggle-hover`
Wiggle animation on hover.

### `.float-animation`
Floating up/down animation (currently removed from tokenomics image).

---

## Animations

| Name          | Description                              | Duration |
|---------------|------------------------------------------|----------|
| `ticker`      | Horizontal scroll for partners           | 20s      |
| `float`       | Vertical float with slight rotation      | 4s       |
| `wiggle`      | Left-right rotation wiggle               | 0.5s     |
| `bounce-in`   | Scale up bounce entrance                 | —        |
| `rainbow-bg`  | Background position shift for gradients  | 3s       |
| `shake`       | Horizontal shake                         | —        |
| `pulse-glow`  | Glowing box-shadow pulse (green/pink)    | 2s       |

---

## File Structure

```
artifacts/pepewife/
├── public/
│   ├── logo.png                  # PEPEWIFE logo (navbar, footer, social avatars)
│   ├── pepewife-bg.png           # Hero section background (Pepe on rocket)
│   ├── tokenomics-girl.png       # Female Pepe in private jet (tokenomics section)
│   ├── roadmap-phase1.png        # Phase 1: PEPEWIFE at trading desk
│   ├── roadmap-phase2.png        # Phase 2: Community celebrating chart
│   ├── roadmap-phase3.png        # Phase 3: Pepe launching Solana rocket
│   ├── roadmap-phase4.png        # Phase 4: PEPEWIFE with stacks of money
│   ├── favicon.svg               # Site favicon
│   └── opengraph.jpg             # OG image for social sharing
├── src/
│   ├── pages/
│   │   └── home.tsx              # Main page (ALL sections in one file)
│   ├── components/ui/            # shadcn/ui components (Button, Input, Dialog, etc.)
│   ├── index.css                 # Global styles, animations, meme utilities
│   ├── main.tsx                  # React entry point
│   └── App.tsx                   # Router setup
├── index.html
├── package.json
├── vite.config.ts
└── tailwind.config.ts
```

---

## Page Sections (in order, top to bottom)

### 1. Navbar (fixed top)
- Logo + "PEPEWIFE" text + `$PWIFE` pink badge (left)
- Nav links: Presale, Why Buy, Tokenomics, Roadmap (left, visible on md+)
- Connect Wallet button (right, green)
- Hamburger menu on mobile

### 2. Hero Section
- Background image: `pepewife-bg.png` (right center)
- Sticker: "STAGE 1 — 85% SOLD OUT"
- Heading: "Be Early... Or Cry Later"
- Speech bubble with description
- Stats cards: Total Raised, Diamond Hands, Stage Price
- CTA buttons: "APE IN NOW" (green), "Join The Fam" (white)

### 3. Partners Ticker
- Scrolling logos: CoinMarketCap, CoinGecko, Solana, Raydium, Binance
- Text: "AS SEEN IN (trust us bro)"

### 4. Presale + Referral (2-column)
**Left column - Buy Box:**
- Countdown timer (DAYS, HRS, MIN, SEC)
- Progress bar (85% filled)
- Price stages: NOW $0.0002, NEXT $0.0004, LIST $0.001
- Currency selector: SOL / USDT
- Amount input + output display
- "APE IN NOW" gradient button

**Right column - Referral:**
- Referral link with copy button
- Stats: Shilled count, Pending rewards, Rate (5%)
- Top Shillers leaderboard (3 entries)

### 5. Why Buy (4 cards)
Cards: EARLY = RICH (green), COMMUNITY VIBES (pink), UTILITY INCOMING (yellow), MEME POWER (purple)

### 6. How to Buy (5 steps)
Steps: Get Wallet → Pick Currency → Enter Amount → SEND IT → WAGMI

### 7. Tokenomics (2-column)
- Left: Large image (`tokenomics-girl.png`, static, no animation)
- Right: Title "Tokenomics" + Total Supply + distribution list

**Token Distribution:**
| Name              | Percentage | Amount     | Color     |
|-------------------|-----------|------------|-----------|
| Presale           | 40%       | 400M PWIFE | `#4CAF50` |
| Liquidity         | 20%       | 200M PWIFE | `#FF4D9D` |
| Team & Advisors   | 15%       | 150M PWIFE | `#FFD54F` |
| Marketing         | 15%       | 150M PWIFE | `#42A5F5` |
| Reserve           | 10%       | 100M PWIFE | `#AB47BC` |

### 8. Roadmap (4 phases)
| Phase   | Title         | Color     | Image              | Status    |
|---------|---------------|-----------|---------------------|-----------|
| Phase 1 | Foundation    | `#4CAF50` | roadmap-phase1.png  | Active    |
| Phase 2 | Growth        | `#FF4D9D` | roadmap-phase2.png  | Upcoming  |
| Phase 3 | Launch        | `#42A5F5` | roadmap-phase3.png  | Upcoming  |
| Phase 4 | Expansion     | `#AB47BC` | roadmap-phase4.png  | Upcoming  |

### 9. Social Feed (3 posts)
Mock tweets from @PepeWifeCoin with logo avatar

### 10. Risk Warning
Yellow warning card with disclaimer text

### 11. Footer
- Logo + PEPEWIFE + tagline
- Links: Whitepaper, Roadmap, FAQ
- Social icons: Twitter, Telegram
- Copyright line

### 12. Investor Dashboard (Dialog)
Opens on wallet connect. Tabs:
- **Overview**: Balance (250,000 PWIFE), Claimable (0), Stage, Raised
- **Transactions**: Table with Date, Amount, PWIFE, Status
- **Claim**: Locked state with "soon" button

---

## Static Data (Mocked)

| Data Point       | Value          |
|------------------|----------------|
| Total Raised     | $1,247,500     |
| Diamond Hands    | 8,420+         |
| Stage Price      | $0.0002        |
| Next Price       | $0.0004        |
| Listing Price    | $0.001         |
| Presale Filled   | 85%            |
| Sold Amount      | 127.5M PWIFE   |
| Goal             | 150M PWIFE     |
| Total Supply     | 1,000,000,000  |
| Referral Rate    | 5%             |
| Countdown Start  | 3d 14h 0m 0s   |
| Wallet Address   | 7xKp...4mNr    |
| Balance          | 250,000 PWIFE  |
| Referral URL     | https://pepewife.io/ref/7xKp4mNr |

---

## Dependencies

```json
"dependencies": {
  "react": "^19",
  "react-dom": "^19",
  "react-router-dom": "^7",
  "recharts": "^2",
  "react-icons": "^5",
  "lucide-react": "^0.468",
  "@radix-ui/*": "shadcn/ui components",
  "tailwind-merge": "^3",
  "class-variance-authority": "^0.7",
  "clsx": "^2"
}
```

---

## Quick Reference for Common Edits

### Change a color
Search for the hex code in `home.tsx` and `index.css`. Example: replace all `#4CAF50` with new green.

### Change a section background
Find the `<section>` tag with the section's `id` in `home.tsx`. Edit the `style={{ background: "..." }}` prop.

### Change text/copy
All text is inline in `home.tsx`. Search for the text you want to change.

### Add/remove a nav link
Edit the nav links array around line 61 in `home.tsx`:
```js
[{ id: "presale", label: "Presale", icon: "🛒" }, ...]
```

### Change tokenomics data
Edit the `tokenomicsData` array around line 23 in `home.tsx`:
```js
{ name: "Presale", value: 40, color: "#4CAF50" }
```

### Change roadmap phases
Edit the roadmap array around line 382 in `home.tsx`.

### Change countdown timer
Edit `timeLeft` initial state around line 16:
```js
useState({ days: 3, hours: 14, minutes: 0, seconds: 0 })
```

### Change presale stats
Edit the stats cards around line 118, progress bar value (`presaleFilled` line 21), and price stages around line 196.

### Replace an image
Copy new image to `artifacts/pepewife/public/` with the same filename. Hard refresh browser to bypass cache.

### Change fonts
Edit the Google Fonts import URL at top of `index.css` and update `--app-font-*` CSS variables.
