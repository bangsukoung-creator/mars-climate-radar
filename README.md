# Mars Climate Radar v2.0

> Dynamic data overlay on original Martian telemetry feed.

## Key Features
- **Original Integrity:** Video pixels are untouched. All data is rendered as a DOM/CSS overlay.
- **Precision Mapping:** Telemetry values are mapped exactly over the original video's static text regions.
- **Dynamic Interpolation:** Values update every 5 seconds with a 250ms smooth transition.
- **Responsive:** Overlay coordinates are percentage-based, scaling perfectly from desktop to mobile.

## Tech Specs
- **Video:** Original 1080p H.264 loop.
- **Overlay:** HTML/CSS with `requestAnimationFrame` for value interpolation.
- **Font:** Share Tech Mono (matches original technical aesthetic).
- **Colors:** 
  - Text: `#7094B3` (Original matching)
  - Highlight: `#00E5FF` (Update flash)

## Data Source
Currently using **Mock Data** (Option B) for stability.
- Format: JSON-like state management in `app.js`.
- Update Cycle: 5000ms.

## How to Modify
- **Coordinates:** Edit `CONFIG.coordinates` in `app.js`.
- **Styling:** Edit `style.css` CSS variables.
- **Endpoint:** Change `updateValues()` to fetch from a real API.

---
*Created by Manus for Mars Climate Monitoring Project.*
