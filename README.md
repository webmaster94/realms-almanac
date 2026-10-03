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

Settings contain Display, Sky, Calendar, Weather, and Time & Light tabs. The module owns its calendar configuration, clock rate, weather generation, temperature units, latitude and lighting behavior. When Ember is active, Ember retains its specialized calendar and controls time, weather and scene lighting; Almanac does not replace those systems.

The active GM advances the clock while the game is unpaused and outside combat. Foundry handles combat time using the configured seconds per round, avoiding a second combat clock. A browser returning from suspension does not fast-forward the world by the whole suspension.

Click the weather to choose a condition and temperature or generate weather. Optional daily generation follows the chosen climate. Scene weather and darkness synchronization are separate opt-in settings. Time and weather settings apply to the world; display preferences apply to each client.

## Realmspace atlas

The planet-ring button opens a 3D cutaway of the Toril Crystal Sphere. Sphere Exterior shows its solid shell; Visit Passage approaches an opening into the rainbow phlogiston. The classic Realmspace sources guide the model, while passage locations and inscriptions are illustrative. Click a world or its name to approach it, drag to orbit, and use the wheel to zoom. Planet close-ups use detailed surface artwork, baked terrain maps, relief geometry, cloud layers and sunlight from the central star. The overview preserves the published planet order, separates the inner and outer system, and opens at a fitted camera distance. Survey Light can reveal terrain on the night side without changing game lighting.

The Tears of Selune and Rock of Bral can be selected from the star map. **Toril & Moons** isolates the lunar system. The Tears trail Selune around Toril, and Bral occupies an authored slot among them. Bral's close-up includes its city, docks, Lake Bral, Starhaven and underside farms; the layout is an original interpretation.

Toril uses an attributed GIS-derived surface, elevation and geography. The World Map supports panning, zooming, place search and GM party placement. Campaign map packs can add registered raster layers with several resolutions. The atlas loads visible tiles, retains a coarser image while detail arrives, and fades between map scales. Labels remain readable as the map zooms. Zoom stops at the available source detail, with finer local layers extending that limit where present. Sword Coast search anchors use measured printed settlement dots.

The current private campaign pack includes a painted Faerûn mosaic, the detailed Sword Coast map, a snow-free Icewind Dale restoration and the cleaned Thay map with an additional Eltabbar detail layer. Generated terrain follows registered geographic guides in areas without detailed source art. These images are separate campaign assets, not part of the public module download. The Sword Coast retains its original printed labels. Thay and Icewind Dale use separate labels and measured settlement anchors.

The first click on Regional Map opens a Scene UUID form with a scene-browser button. It never chooses a campaign scene automatically. Link a world scene and optionally follow an existing token as the party marker. A regional atlas marker can also be placed without moving any scene token. Open Scene views the linked scene for the current user; it does not activate it for everyone.

A calibrated regional map drives the world and globe party marker from the linked token or atlas marker. Placing the party on the world map moves that same regional marker when the chosen point is inside its calibrated coverage. Uncalibrated scene images keep a separate world anchor. Linking a different scene clears the preceding map calibration.

The globe's starting orbital alignments remain approximate. Diagram distances and sizes are compressed; terrain relief is exaggerated for inspection. Regional scene images stay in the user's installation and are not copied into releases.

## The sky

Selûne uses a 30-day, 10-hour, 30-minute cycle, full at midnight on 1 Hammer 1372 DR. The moon disc remains a phase indicator even when it is below the horizon.

The Tears are enlarged, irregular rocky bodies with shaded faces and craters. Their illumination follows their angular separation from the moon. They fade near the approximate horizon and disappear in daylight, thick fog or storms. Some can be visible while others have set. Their shape, size, compressed spacing and rise/set model are illustrations, not a precise ephemeris.

Anadia, Coliar, Karpri, Chandos, Glyth, Garden and H'Catha appear when the model puts them in the visible sky. Click Selûne for the Realmspace sky table. Published distances and periods drive circular orbits; settings provide campaign-specific starting angles because no canonical dated alignment is known. Month-based orbital periods use a 30-day convention. Garden has stricter visibility requirements.

See [lore notes](docs/lore.md) and [Realmspace sources](docs/realmspace.md) for assumptions and references. The module never silently converts a non-Harptos calendar to the Forgotten Realms.

## Upgrading from 0.1

Version 0.2 replaces the former interface-only implementation. A one-time importer preserves the active calendar, displayed year, weather, clock preferences and events journal. It adds readable dates to imported event pages. After the import, disable the former timekeeping module and reload so only the almanac runs the clock. The old settings and event flags are retained for rollback; no event pages are deleted. All normal controls are independent after import.

## Development

The released module includes its renderer and assets. Development uses pinned Three.js and esbuild versions; `npm run build:vendor` rebuilds the bundled renderer. `tools/build-planets.py` bakes the original seamless planetary color, relief and roughness maps. `tools/build-toril.py` renders the atlas from Toril GIS snapshot files in `qa/gis` and requires Pillow, NumPy and Shapely. `npm test` checks the astronomy, visibility and clock logic. `npm run check` checks every JavaScript module. Live verification also covers journal saves, edits, ownership, Harptos holidays and native windows.

Package `module.json`, `scripts`, `styles`, `assets` and `LICENSE` at the ZIP root. Publish `module.json` and `module.zip` with each version tag.

Original code and procedural planetary artwork are MIT licensed. Three.js retains its MIT notice. Derived Toril map assets have separate noncommercial fan-content terms in `assets/toril/NOTICE.md`. No protected calendar/adventure code or the user's regional map is redistributed. Forgotten Realms names and lore belong to their respective owners.

The nebula background was generated with the built-in image tool. Its prompt and saved asset are recorded in [art notes](docs/atlas-art.md). Official and fan maps were inspected as references; their images are not bundled.

Rebuild the illustrated atlas with `npm run build:cartography`. Its offline build requires Pillow, NumPy, SciPy, Shapely and ContourPy. The generated assets ship with the module, so players need no Python dependencies.

Private raster packs are built with `tools/build-raster-pack.py`. It keeps source art and generated tiles under the ignored `qa` directory. See [raster pack format and calibration](docs/raster-packs.md) for setup and accuracy limits.
