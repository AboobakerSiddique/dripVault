```markdown
# dripVault

> **AI-powered personal wardrobe & outfit intelligence platform.**

dripVault is a full-stack AI fashion assistant that turns your personal wardrobe into an intelligent styling system.

Upload your clothing, let AI analyze each item, generate outfits based on your wardrobe, weather, aesthetics and occasions, save and organize looks, plan outfits, and continuously build a personalized understanding of your style.

The project is currently under active development, with the UI being redesigned around a **cyberpunk / retro-futuristic wardrobe intelligence interface**.

---

## ✦ Current Status

**Phase 10 completed and verified.**

- ✅ AI clothing analysis
- ✅ AI outfit generation
- ✅ Outfit modification
- ✅ Weather-aware recommendations
- ✅ Wardrobe management
- ✅ Clothing edit/delete
- ✅ Duplicate clothing prevention
- ✅ Image validation
- ✅ Profile photo validation
- ✅ Gender-based onboarding
- ✅ Gym styling
- ✅ Saved outfit categories
- ✅ Outfit favourites
- ✅ Clothing favourites
- ✅ Saved outfit notes
- ✅ Outfit calendar
- ✅ Weekly outfit planner
- ✅ Outfit history
- ✅ Feedback-learning foundation
- ✅ Advanced color intelligence
- ✅ Color-aware outfit diversity
- ✅ Responsive/mobile interface
- 🚧 Phase 11 — Complete UI redesign

---

# ✦ What is dripVault?

Most wardrobe apps simply store pictures of clothes.

**dripVault is designed to understand them.**

Each clothing item is analyzed and structured into useful attributes such as:

- Category
- Color
- Material
- Fit
- Formality
- Style/aesthetic
- Clothing characteristics

The system then uses this information to create combinations from the user's **actual wardrobe** rather than recommending imaginary products.

### Core concept

```text
YOUR CLOSET
     │
     ▼
┌─────────────────────┐
│   AI CLOTHING       │
│     ANALYSIS        │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ STRUCTURED WARDROBE │
│       DATA          │
└─────────┬───────────┘
          │
     ┌────┴────┐
     ▼         ▼
 WEATHER    USER STYLE
     │         │
     └────┬────┘
          ▼
┌─────────────────────┐
│ COMPATIBILITY ENGINE│
└─────────┬───────────┘
          │
          ▼
   OUTFIT GENERATION
          │
     ┌────┼────┐
     ▼    ▼    ▼
   SAVE  EDIT  PLAN

```

## ✦ Main Features

### 👕 AI Wardrobe

Upload clothing images and let AI analyze them.
Each item can contain information such as:

* Clothing name
* Category
* Color
* Material
* Fit
* Formality
* Aesthetic/style
* Image
* Favourite status

**Supported wardrobe categories:**

* Tops
* Bottoms
* Shoes
* Accessories
* Bags
* Outerwear

### 🧠 AI Clothing Analysis

dripVault uses Google's Gemini API to analyze uploaded clothing images.
The system also validates that uploaded images actually contain clothing before adding them to the wardrobe.
Non-clothing images are rejected.

### 🔒 Duplicate Clothing Protection

dripVault prevents the same clothing image from being uploaded multiple times.
The system uses:

```text
Image
  ↓
SHA-256 Hash
  ↓
User-specific duplicate check
  ↓
Database unique constraint

```

Duplicate detection happens server-side and is backed by a database constraint to prevent race conditions.

### 🧥 AI Outfit Generator

Generate outfits using clothing that already exists in your wardrobe.
The compatibility engine considers factors such as:

* Color harmony
* Aesthetic
* Formality
* Occasion
* Weather
* Layering
* Material
* Fit
* Clothing compatibility

The system produces a compatibility score for each generated outfit.

### ✦ Outfit Intelligence Engine

The core outfit-generation system is built around a custom compatibility engine.

**Current scoring dimensions:**

* COLOR
* WEATHER
* AESTHETIC
* OCCASION
* LAYERING

These are combined into an overall outfit score. The engine is designed to be deterministic and testable rather than relying entirely on another AI generation call.

### 🎨 Advanced Color Intelligence

Phase 10 introduced a more sophisticated color system.
The engine now understands relationships such as:

* Monochromatic
* Analogous
* Complementary
* Triadic
* Neutral combinations
* Warm/cool relationships
* Saturation characteristics

Different aesthetics can also influence how aggressively color contrast is rewarded.
For example:

* **Streetwear** → Higher tolerance for strong contrast
* **Minimal** → Strong preference for controlled palettes
* **Old Money** → More conservative color relationships
* **Monochrome** → Strong same-family preference

Color diversity is also incorporated into outfit ranking to prevent generated outfits from repeatedly using nearly identical combinations.

### ✦ Outfit MODIFY

Generated outfits aren't completely locked.
The user can modify individual outfit slots using alternative wardrobe items.
The system then re-scores the modified composition.

```text
Generated Outfit
       │
       ▼
   MODIFY ITEM
       │
       ▼
Choose wardrobe alternative
       │
       ▼
Re-score composition
       │
       ▼
Updated Outfit

```

The existing compatibility engine is reused rather than creating a second generation system.

### ❤️ Favourites

Users can mark clothing items and saved outfits as favourites.

**Wardrobe**

* ♡  →  Favourite
* ♥  →  Unfavourite

**Saved outfits**
Favourite outfits can be separated from normal saved outfits for easier access.
Favourite status is intentionally separate from outfit feedback because:

* Favourite = persistent preference
* Feedback = rating signal

### 📝 Saved Outfit Notes

Saved outfits can have personal notes.

* **Maximum length:** 100 characters
* **Example:** "Perfect for Friday dinner"

The limit is enforced both at application level and database level.

### 📅 Outfit Calendar

Users can assign outfits to specific dates.
This creates an outfit history/calendar system for organizing previous and upcoming looks.

### 📆 Weekly Outfit Planner

Plan outfits throughout the week.
**Example:**

* MON  → College
* TUE  → Gym
* WED  → Dinner
* THU  → Meeting
* FRI  → Hangout
* SAT  → Casual
* SUN  → Relax

Saved outfits can be directly added to the planner.
Notes can also be attached to planned outfits.
The calendar and weekly planner share the same underlying planning architecture.

### 🌦 Weather-Aware Styling

dripVault integrates weather information into outfit generation.
Current implementation uses Open-Meteo, allowing weather data without requiring an API key.
Weather conditions are mapped into the existing styling system:

* Hot
* Warm
* Cool
* Cold
* Rainy

This allows outfit generation to take the current weather into account.
**Example:**

```text
25°C + Warm
        ↓
Lightweight clothing
        ↓
Reduced layering
        ↓
Weather-compatible outfit

```

### 👤 Profile System

Users have their own profile containing:

* Username
* Gender preference
* Profile photo
* Wardrobe statistics
* Saved outfit statistics
* Style preferences
* Feedback-derived style information

### 📸 Profile Photo

Only one profile photo can exist at a time.
The user can:

* Upload
* Replace
* Delete

Profile images are also validated to ensure the uploaded image contains a human portrait rather than arbitrary content.

### 🧠 Feedback Learning Foundation

dripVault already contains the foundation for long-term personalization.
The system can analyze actual user feedback such as:

* LOVE
* LIKE
* DISLIKE

and identify patterns in the user's preferences.
For example:
*You tend to love: Vintage outfits, Minimal outfits, Dark neutral palettes.*

The long-term goal is to use these signals to progressively improve outfit recommendations.

### 👨‍🦱 Gender Onboarding

During registration, users select their wardrobe direction:

* Men
* Women

This information is stored in the user's profile and provides a foundation for future personalization.

### 🏋️ Gym Style

Gym is supported as a dedicated aesthetic/style.
The compatibility engine recognizes performance-oriented clothing characteristics and can favor combinations appropriate for gym styling.

### 🗂 Saved Outfit Categories

Saved outfits can be organized using their aesthetic/style category.
**Examples:**

* Minimal
* Smart Casual
* Streetwear
* Vintage
* Old Money
* Gym

### 🕘 Outfit History

The history system brings together existing outfit information to provide a record of:

* Saved outfits
* Worn outfits
* Loved outfits
* Planned outfits

This creates the foundation for future wardrobe analytics.

### 🔎 Wardrobe Search & Filtering

The wardrobe supports:

* **Search:** Search clothing by name.
* **Category filters:** ALL, TOP, BOTTOM, SHOES, ACCESSORIES, BAG, OUTERWEAR

This allows the wardrobe to quickly scale beyond a small collection.

### ✏️ Clothing Management

Users can:

* Add clothing
* Edit clothing
* Delete clothing
* Favourite clothing
* Search clothing
* Filter clothing
* View clothing details

Deletion also protects saved outfits from accidental data corruption.

### 🛡 Security

Security is treated as a core part of the architecture.
Current protections include:

* Supabase authentication
* Row Level Security
* Explicit user ownership checks
* User-scoped Storage paths
* Server-side duplicate validation
* Database-level duplicate constraint
* Whitelisted update fields
* Profile image validation
* Clothing image validation
* Storage cleanup
* Signed URLs for private profile photos

### 🧪 Testing

The compatibility engine currently has:
**21 / 21 tests passing**

Tests cover areas including:

* Outfit compatibility
* Color intelligence
* Color relationships
* Color diversity
* Gym styling
* Composition scoring
* Existing engine behavior
* Explanation generation

The project is also regularly checked with:

```bash
npm run build

```

and:

```bash
npx eslint .

```

---

## 🛠 Tech Stack

**Frontend**

* Next.js 16
* React
* TypeScript
* Tailwind CSS
* App Router
* React Compiler
* Lucide React
* Recharts

**Backend**

* Next.js API Routes
* Supabase
* PostgreSQL
* Supabase Storage
* Supabase Auth
* Row Level Security

**AI**

* Google Gemini API (Used for: Clothing analysis, Image validation, Fashion-related image understanding)

**Weather**

* Open-Meteo

**Testing**

* Vitest / project engine test suite
* ESLint
* Next.js production build

---

## 🗄 Database Architecture

**Current migrations:**

* `0001_init.sql`
* `0006_gender_and_wardrobe_management.sql`
* `0007_single_photo_and_dedup.sql`
* `0008_weather_location.sql`
* `0009_dedup_and_validation.sql`
* `0010_favourites_notes_planner.sql`

**Core entities include:**

* `profiles`
* `clothing_items`
* `outfits`
* `outfit_items`
* `outfit_feedback`
* `wear_history`
* `profile_photos`
* `user_preferences`
* `outfit_plans`

The architecture intentionally avoids unnecessary duplication.
For example, the planner references:
`outfits.id`
instead of copying the clothing composition into another table.

### 📁 High-Level Architecture

```text
dripVault/
│
├── app/
│   ├── (auth)/
│   ├── (main)/
│   │   ├── home/
│   │   ├── wardrobe/
│   │   ├── generate/
│   │   ├── outfits/
│   │   ├── history/
│   │   ├── planner/
│   │   ├── profile/
│   │   └── add/
│   │
│   └── api/
│       ├── analyze-clothing/
│       ├── validate-photo/
│       ├── wardrobe/
│       ├── profile-photos/
│       ├── preferences/
│       ├── weather/
│       └── outfit-plans/
│
├── components/
│
├── lib/
│   ├── compatibility-engine.ts
│   ├── gemini-client.ts
│   └── __tests__/
│
├── supabase/
│   └── migrations/
│
└── public/

```

---

## 🚀 Getting Started

**1. Clone the repository**

```bash
git clone [https://github.com/AboobakerSiddique/dripVault.git](https://github.com/AboobakerSiddique/dripVault.git)
cd dripVault

```

**2. Install dependencies**

```bash
npm install

```

**3. Create environment variables**
Create `.env.local` and add the required Supabase and Gemini credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key

```

*Never commit .env.local or expose API secrets in client-side code.*

**4. Configure Supabase**
Create a Supabase project and configure:

* Authentication
* PostgreSQL database
* Storage
* Required migrations
* RLS policies

Run the project migrations in order.

**5. Start development server**

```bash
npm run dev

```

Then open: `http://localhost:3000`

---

## 📱 Mobile-First Design

Although dripVault is a web application, the interface is designed primarily around a mobile website experience.
The target interaction model is:

```text
┌─────────────────────┐
│       HEADER        │
├─────────────────────┤
│                     │
│      CONTENT        │
│                     │
│                     │
├─────────────────────┤
│ HOME WARDROBE + ... │
└─────────────────────┘

```

The upcoming UI redesign will move the entire application toward a unified retro-futuristic / cyberpunk wardrobe intelligence interface.

---

## 🎨 UI Direction — Phase 11

The next major phase focuses on completely redesigning the interface.

**Design inspiration**
The new interface combines:

* Retro-futuristic HUDs
* Cyberpunk interfaces
* CRT/terminal aesthetics
* Tactical intelligence dashboards
* Pixel typography
* Thin technical borders
* Blueprint/grid textures
* Neon lavender/blue highlights
* Dark black backgrounds
* Data visualization
* Futuristic cards
* Mobile-first layouts

The dashboard will become the central wardrobe command center.
**Conceptually:**

```text
┌───────────────────────────┐
│ ☰       dripVault      ♧  │
├───────────────────────────┤
│                           │
│ GOOD TO SEE YOU           │
│ ABUSIDDIQUE               │
│                           │
├───────────────────────────┤
│ WEATHER / ENVIRONMENT     │
│ 25°C   ☀  WARM            │
├───────────────────────────┤
│ ✦  GENERATE OUTFIT     →  │
├───────────────────────────┤
│ WARDROBE │ SAVED OUTFITS  │
├───────────────────────────┤
│ QUICK ACCESS              │
│                           │
│ [WARDROBE] [START ITEM]   │
│ [SAVED]    [PLANNER]      │
├───────────────────────────┤
│ MOST RECENT LOOK          │
│                           │
│  OUTFIT       SCORE       │
│  PREVIEW      81/100      │
│                           │
├───────────────────────────┤
│ CALENDAR │ WEEKLY PLANNER │
├───────────────────────────┤
│ HOME WARDROBE + PLANNER 👤│
└───────────────────────────┘

```

---

## 🔮 Future Roadmap

The project is being developed toward a much deeper personal styling system.
Potential future capabilities include:

**Phase 11 — UI/UX**

* Complete interface redesign
* Unified design system
* Retro-futuristic HUD aesthetic
* Mobile-first dashboard
* New wardrobe interface
* New outfit-generation interface
* New saved-outfit interface
* New planner interface
* New profile interface
* Animated interactions
* Data visualization

**Future Intelligence**

* Deeper feedback-driven outfit ranking
* Long-term style profile
* Personal color profile
* Outfit repetition detection
* Wardrobe utilization analytics
* Most-worn clothing analysis
* Style evolution tracking
* Personalized aesthetic recommendations
* Context-aware outfit generation
* Event/occasion intelligence

**Future Smart Features**

* "What should I wear today?"
* "Build me a gym outfit."
* "I have a date tonight."
* "Use this shirt."
* "Make this outfit more minimal."
* "Make this outfit more streetwear."
* "I haven't worn this in a while."
* "Build outfits around my favourite pieces."

---

## ✦ Vision

dripVault is being built around a simple idea:

*Your wardrobe shouldn't just store clothes. It should understand your style.*

The long-term goal is to transform a static digital closet into a personal fashion intelligence system that learns from:

```text
YOUR CLOTHES
     +
YOUR STYLE
     +
YOUR WEATHER
     +
YOUR OCCASIONS
     +
YOUR FEEDBACK
     +
YOUR HISTORY
     ↓
PERSONAL STYLE INTELLIGENCE

```

---

## 👨‍💻 Project

**dripVault**
AI-powered personal wardrobe intelligence.
Built with: **Next.js · TypeScript · Supabase · PostgreSQL · Gemini AI · Tailwind CSS**

**Development Philosophy:**

* Build incrementally
* Prefer reusable architecture
* Avoid unnecessary duplicate systems
* Keep AI calls purposeful
* Validate at both application and database levels
* Protect user data
* Test before expanding functionality
* Keep the interface mobile-first
* Let real user feedback drive future intelligence

```

```