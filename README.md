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

## The sky

Selûne uses a 30-day, 10-hour, 30-minute cycle, full at midnight on 1 Hammer 1372 DR. The moon disc remains a phase indicator even when it is below the horizon.

The Tears are enlarged, irregular rocky bodies with shaded faces and craters. Their illumination follows their angular separation from the moon. They fade near the approximate horizon and disappear in daylight, thick fog or storms. Some can be visible while others have set. Their shape, size, compressed spacing and rise/set model are illustrations, not a precise ephemeris.

Anadia, Coliar, Karpri, Chandos, Glyth, Garden and H'Catha appear when the model puts them in the visible sky. Click Selûne for the Realmspace sky table. Published distances and periods drive circular orbits; settings provide campaign-specific starting angles because no canonical dated alignment is known. Month-based orbital periods use a 30-day convention. Garden has stricter visibility requirements.

See [lore notes](docs/lore.md) and [Realmspace sources](docs/realmspace.md) for assumptions and references. The module never silently converts a non-Harptos calendar to the Forgotten Realms.

## Upgrading from 0.1

Version 0.2 replaces the former interface-only implementation. A one-time importer preserves the active calendar, displayed year, weather, clock preferences and events journal. It adds readable dates to imported event pages. After the import, disable the former timekeeping module and reload so only the almanac runs the clock. The old settings and event flags are retained for rollback; no event pages are deleted. All normal controls are independent after import.

## Development

No build step or runtime package dependencies. `npm test` checks the astronomy, visibility and clock logic. `npm run check` checks every JavaScript module. Live verification also covers journal saves, edits, ownership, Harptos holidays and native windows.

Package `module.json`, `scripts`, `styles` and `LICENSE` at the ZIP root. Publish `module.json` and `module.zip` with each version tag.

All included code and vector artwork are original and MIT licensed. No protected calendar or adventure source or art is included. Forgotten Realms names and lore belong to their respective owners.
