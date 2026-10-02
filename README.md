# Realms Almanac

A standalone calendar, event planner, weather and time engine for Foundry VTT 14. The compact sky dial shows Selûne, her rocky Tears and the planets of Realmspace. Month and festival palettes color the whole frame.

## Install

Use this manifest in Foundry or Forge:

`https://github.com/webmaster94/realms-almanac/releases/latest/download/module.json`

Enable **Realms Almanac**. No other calendar module is required.

## Calendar and events

Click the calendar button or date ribbon for the month view. Select a day and choose **Add Event**. Events can repeat daily, by a fixed week interval, monthly or yearly. Monthly events skip festival days; annual Shieldmeet events appear only in leap years.

Each event is an ordinary journal page with its date, optional end time, repetition and description written into the page. **Open Event Journal** opens the same data through Foundry. It remains readable with the module disabled. The calendar respects journal-page ownership. GMs can choose whether each event is visible to players. Archiving hides an event from the calendar but retains its page; Show Archived Events exposes the restore control.

The clock opens **Set Date & Time**. Use the visible minute/hour/day selector with the forward or back button for smaller changes. Players see the calendar and permitted events but cannot advance world time.

## Time, weather and lighting

Settings contain Display, Sky, Calendar, Weather, and Time & Light tabs. The module owns its calendar configuration, clock rate, weather generation, temperature units, latitude and lighting behavior.

The active GM advances the clock while the game is unpaused and outside combat. Foundry handles combat time using the configured seconds per round, avoiding a second combat clock. A browser returning from suspension does not fast-forward the world by the whole suspension.

Click the weather to choose a condition and temperature or generate weather. Optional daily generation follows the chosen climate. Scene weather and darkness synchronization are separate opt-in settings. Time and weather settings apply to the world; display preferences apply to each client.

## Realmspace atlas

The planet-ring button opens a 3D star map centered on Amaunator. Click a world or its name to approach it, drag to orbit, and use the wheel to zoom. Terrain is sculpted and illumination faces the central sun. Survey Light can reveal terrain on the night side without changing game lighting.

Toril uses an attributed GIS-derived surface, elevation and geography. The World Map tab supports panning, zooming, settlement/region search and GM party placement. Detailed vector shorelines, lakes, forests and rivers appear at close zooms. The dataset includes 1,024 named settlements.

The first click on Regional Map opens a Scene UUID form with a scene-browser button. It never chooses a campaign scene automatically. Link a world scene and optionally follow an existing token as the party marker. A regional atlas marker can also be placed without moving any scene token. Open Scene views the linked scene for the current user; it does not activate it for everyone.

World/globe coordinates and regional scene coordinates are separate. The world marker is an editable geographic anchor; the regional view follows the linked token's actual position. The module does not silently pretend an arbitrary scene image is georeferenced.

The globe's starting orbital alignments remain approximate. Diagram distances and sizes are compressed; terrain relief is exaggerated for inspection. Regional scene images stay in the user's installation and are not copied into releases.

## The sky

Selûne uses a 30-day, 10-hour, 30-minute cycle, full at midnight on 1 Hammer 1372 DR. The moon disc remains a phase indicator even when it is below the horizon.

The Tears are enlarged, irregular rocky bodies with shaded faces and craters. Their illumination follows their angular separation from the moon. They fade near the approximate horizon and disappear in daylight, thick fog or storms. Some can be visible while others have set. Their shape, size, compressed spacing and rise/set model are illustrations, not a precise ephemeris.

Anadia, Coliar, Karpri, Chandos, Glyth, Garden and H'Catha appear when the model puts them in the visible sky. Click Selûne for the Realmspace sky table. Published distances and periods drive circular orbits; settings provide campaign-specific starting angles because no canonical dated alignment is known. Month-based orbital periods use a 30-day convention. Garden has stricter visibility requirements.

See [lore notes](docs/lore.md) and [Realmspace sources](docs/realmspace.md) for assumptions and references. The module never silently converts a non-Harptos calendar to the Forgotten Realms.

## Upgrading from 0.1

Version 0.2 replaces the former interface-only implementation. A one-time importer preserves the active calendar, displayed year, weather, clock preferences and events journal. It adds readable dates to imported event pages. After the import, disable the former timekeeping module and reload so only the almanac runs the clock. The old settings and event flags are retained for rollback; no event pages are deleted. All normal controls are independent after import.

## Development

The released module includes its renderer and assets. Development uses pinned Three.js and esbuild versions; `npm run build:vendor` rebuilds the bundled renderer. `tools/build-toril.py` renders the atlas from Toril GIS snapshot files in `qa/gis` and requires Pillow, NumPy and Shapely. `npm test` checks the astronomy, visibility and clock logic. `npm run check` checks every JavaScript module. Live verification also covers journal saves, edits, ownership, Harptos holidays and native windows.

Package `module.json`, `scripts`, `styles`, `assets` and `LICENSE` at the ZIP root. Publish `module.json` and `module.zip` with each version tag.

Original code and procedural planetary artwork are MIT licensed. Three.js retains its MIT notice. Derived Toril map assets have separate noncommercial fan-content terms in `assets/toril/NOTICE.md`. No protected calendar/adventure code or the user's regional map is redistributed. Forgotten Realms names and lore belong to their respective owners.
