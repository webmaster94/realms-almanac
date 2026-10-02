# Release verification

Checked 2 October 2026, through the standalone 0.2 release.

- Eighteen automated checks pass for lunar reference dates, the Tears' visibility, planetary geometry, month palettes, clock authority, pauses, darkness and leap-year boundaries.
- Every JavaScript module passes syntax checks. `git diff --check` passes.
- Local Foundry 14.360 round-tripped 3,287 dates through the calendar engine across ordinary and leap years. Shieldmeet is unnumbered, annual Shieldmeet events skip ordinary years, and monthly events skip festival days.
- Native calendar, event and settings windows were inspected. The month view uses ten-day weeks for Harptos and the active calendar's week length elsewhere.
- A local event was created through the actual form, then edited and removed. Its journal page contained a readable date, recurrence and description. World time did not change.
- Sharing a new event in a temporary private local journal made the journal browsable while leaving the existing private page private. Test documents were removed.
- Independent local weather controls saved rain and rendered precipitation, generated new weather, then restored the prior weather. No world-time change occurred.
- Forge 14.367 imported the existing calendar, displayed year, clock preferences, weather and events journal. The saved world timestamp and date components were identical immediately before and after import.
- The old timekeeping module was disabled. Forge then loaded `AlmanacCalendarData` with no old UI instance and resumed the configured one-second-per-second clock.
- Forge's month view and Realmspace sky window were opened and inspected. The settings UI contains no references to another calendar module.
- The lunar labels sit inside the dial, the Tears have textured rock silhouettes, and the frame follows the active month palette.

Sky visibility remains approximate. The orbital model uses published periods and distances with configurable initial angles; it does not claim a canonical dated planetary alignment or predict eclipses.
