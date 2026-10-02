# First-release verification

Checked 2 October 2026.

- Eight Node tests pass. They cover the lunar epoch, new and quarter moons, four-year recurrence, dates before the epoch, festival days, calendar units, combat visibility, weather classification and escaped labels.
- JavaScript syntax checks and `git diff --check` pass.
- Local Foundry 14.360 loads the installed module after a world restart.
- Native settings tabs switch correctly, scroll, save and close. The window inherits Foundry's theme.
- Intercepted time-advance calls produce 60, 3,600 and 86,400 seconds for the three controls, with negative values for rewind. The test does not advance world time.
- A temporary local encounter leaves the bar visible before combat, hides it with a started round, and restores it after reset and deletion. World time is unchanged and the temporary encounter is removed.
- Forge 14.367 loads the module alongside Simple Timekeeping 2.0.3 and D&D 5e 6.0.5. The existing date, time, weather and underlying timestamp match the values recorded before installation.
- The time button opens Simple Timekeeping's date picker. Cancelling leaves the timestamp unchanged.
- All nine Tears are kept inside the inner sky frame. The controls fit the 420-pixel minimum with the narrower clock.

The almanac does not replace Simple Timekeeping's calendar engine. Sky positions are illustrative, and exact moonrise and eclipse predictions remain outside this release.
