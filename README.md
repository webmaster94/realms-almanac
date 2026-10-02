# Realms Almanac

A compact Foundry VTT calendar with a brass control rail, seasonal date ribbon and an enamel celestial dial. Weather sits inside the dial. Selûne uses a shaded lunar disc, with nine trailing stars representing her Tears.

Version 0.1 is an original replacement interface for Simple Timekeeping, not a redistribution of its source. Keep Simple Timekeeping enabled for its calendar selection, date picker, weather generation, events, real-time clock and scene lighting. The almanac reads those existing settings and hides its old bar. Ember is a visual reference only and is not required.

## Install

Foundry or Forge manifest:

`https://github.com/webmaster94/realms-almanac/releases/latest/download/module.json`

Enable **Realms Almanac** alongside **Simple Timekeeping & Calendar**. The new bar appears at the top center. Installation does not change the world date or any calendar, weather, lighting or automation settings. Disable the almanac to restore the original bar.

## Controls

- Use the interval dropdown to choose one minute, hour or day, then advance or rewind with the end buttons. No modifier keys are required.
- Click the time to open Simple Timekeeping's date picker.
- Click the weather to open its calendar and weather settings.
- The pause button pauses or resumes Simple Timekeeping's clock. Foundry's game pause still takes precedence.
- The book or date ribbon opens the Harptos reference, including month and festival icons.
- The calendar button opens the existing events journal.
- The chevron collapses the celestial dial. The gear opens almanac settings.

Players see the date, weather and phase, without GM time controls. Size, position and visibility preferences are per client. The moon phase offset is a world setting available to GMs.

## Calendar and sky

All dates and time advances use the active Foundry calendar. Harptos festival days appear without a day number. Shieldmeet comes from the configured calendar and remains an intercalary day.

Selûne uses the wiki convention of a 30-day, 10-hour, 30-minute cycle, full at midnight on 1 Hammer 1372 DR. The date conversion includes festival days and leap years. Set Moon Phase Offset if the campaign uses a different reference.

The dial is an illustration. The moon disc always shows its phase, including when the moon would be below the horizon. The Tears' spacing is compressed; they appear at night and fade under cloud. This release does not predict moonrise, eclipses or exact local sky visibility. See [lore notes](docs/lore.md) for sources and assumptions.

Other calendars display their own date and a neutral celestial emblem. They are never silently converted to Harptos. Without Simple Timekeeping, the almanac can display and advance the core calendar, but the date picker, weather generation and event controls require that module.

## Combat

Hide During Combat is enabled by default. It follows Foundry's currently selected combat's `started` state, responds to combat creation, start, updates and deletion, and requires no Carousel integration. Preparing an unstarted encounter leaves the bar visible.

## Development

No build step or runtime dependencies. `npm test` checks lunar reference dates, four-year recurrence, festivals, calendar units, visibility and safe labels. `npm run check` checks JavaScript syntax.

Package `module.json`, `scripts`, `styles` and `LICENSE` at the root of `module.zip`. Publish `module.json` and `module.zip` on the version tag. Keep the manifest's version and download URL in sync.

All included code and vector artwork are original and MIT licensed. No protected Simple Timekeeping or Ember code, art or campaign data is included. Forgotten Realms lore and names belong to their respective owners.
