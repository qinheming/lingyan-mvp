# LingYan MVP

**LingYan is a mobile-first AI oracle for intent, place, and native navigation handoff.**

It turns a short human intention into a safe, reachable city coordinate, then hands the destination to Amap for the real navigation experience. On iPhone, LingYan is designed to run as a PWA: open it in Safari, add it to the Home Screen, and use it like a lightweight app without App Store distribution.

## Why It Exists

Most navigation apps start with a destination. LingYan starts with a thought.

```text
"I need inspiration."
"I want a quiet place."
"Take me somewhere that fits this moment."
```

LingYan interprets the intent, picks a public and approachable location nearby, creates a short "micro-action" prompt, and opens Amap for native navigation. LingYan does not try to clone a full navigation app in the browser.

## Core Experience

```mermaid
flowchart TD
    A["User enters an intention"] --> B["Browser location"]
    B --> C["Intent classification"]
    C --> D["Safe coordinate generation"]
    D --> E["Oracle result card"]
    E --> F["Amap route preview"]
    E --> G["Start navigation"]
    G --> H{"Amap app opens?"}
    H -->|Yes| I["Native Amap navigation"]
    H -->|No| J["Install Amap / copy coordinate"]
```

## Features

| Area | Status | Notes |
|---|---:|---|
| Intent input | ✅ | Short intention-based interaction |
| Location access | ✅ | Browser geolocation with demo fallback |
| Coordinate generation | ✅ | Deterministic safe-public-location style MVP |
| Map display | ✅ | Leaflet fallback and Amap route view |
| Amap route planning | ✅ | Walking, driving, and transit route modes |
| Native Amap handoff | ✅ | iOS deeplink attempt |
| Amap install fallback | ✅ | If Amap is missing, show install and copy-coordinate fallback |
| PWA install support | ✅ | Manifest, icon, iOS meta tags, service worker |
| Background navigation | ❌ | Not promised in PWA mode |
| App Store distribution | ❌ | Intentionally not required for MVP |

## Architecture

```mermaid
flowchart LR
    UI["React UI"] --> App["App state"]
    App --> Intent["Intent logic"]
    App --> Oracle["Oracle generation"]
    App --> Map["Map components"]
    Map --> Amap["Amap JS API"]
    App --> Nav["Navigation launcher"]
    Nav --> Native["Amap iOS deeplink"]
    Nav --> Fallback["Install/copy fallback"]
```

## Tech Stack

| Layer | Choice |
|---|---|
| Language | TypeScript |
| UI | React 18 |
| Build | Vite |
| Map fallback | Leaflet |
| Route provider | Amap JS API |
| PWA | Web App Manifest + Service Worker |
| Native navigation | Amap app deeplink |

## Local Development

```bash
npm install
npm run dev
```

Build production assets:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Amap Configuration

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Then configure:

```env
VITE_AMAP_JS_KEY=
VITE_AMAP_SECURITY_JSCODE=
```

Without an Amap key, LingYan still runs with its built-in map fallback, but Amap route preview is disabled. The primary navigation action still attempts to open the Amap app.

## iPhone PWA Usage

1. Open the deployed LingYan URL in Safari.
2. Tap the Share button.
3. Choose **Add to Home Screen**.
4. Launch LingYan from the Home Screen.

For the full navigation experience, install Amap on the phone. LingYan is responsible for intent and destination handoff; Amap is responsible for voice navigation, background navigation, lock-screen behavior, rerouting, and traffic-aware guidance.

## Product Boundaries

LingYan is an MVP. It does not replace professional navigation apps.

| Boundary | Reason |
|---|---|
| No guaranteed background GPS | iOS PWA background execution is limited |
| No lock-screen voice navigation promise | Native apps are better suited for that |
| No safety-critical routing promise | Users must follow real-world traffic and safety conditions |
| No private-area guidance | Generated points should remain public and approachable |
| No browser-based Amap clone | Full navigation UX is delegated to the Amap app |

## Roadmap

| Priority | Item |
|---:|---|
| P0 | Test Amap app handoff on real iPhone Safari |
| P0 | Move production hosting away from GitHub Pages to an owned domain/server |
| P1 | Add clearer Add-to-Home-Screen onboarding |
| P1 | Add location candidate confirmation |
| P1 | Add Amap install detection guidance |
| P2 | Add account/history support |
| P2 | Add backend AI intent resolver |
| P3 | Native iOS shell with Amap Navigation SDK if App Store/TestFlight becomes acceptable |

## Repository

This repository is the LingYan MVP frontend:

```text
qinheming/lingyan-mvp
```

It is currently optimized for fast iteration by an independent builder: small surface area, mobile-first UI, and no App Store dependency. For production use without GitHub dependency, deploy the same build to an owned domain, VPS, Cloudflare Pages, or another controlled hosting target.
