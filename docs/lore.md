# Forgotten Realms calendar design notes

Research checked 2 October 2026. The user requested the Forgotten Realms Wiki. These notes use its lore summaries and trace their cited books below. The icon choices and implementation suggestions are original design proposals.

## Calendar structure

Harptos has twelve 30-day months, each divided into three tendays. Five annual festival days sit outside the months. Shieldmeet adds a sixth festival day every fourth year. Ordinary years therefore have 365 days; leap years have 366. The wiki cites *Forgotten Realms Campaign Setting*, 3rd edition, pages 76–77. [Calendar of Harptos](https://forgottenrealms.fandom.com/wiki/Calendar_of_Harptos)

Use the following month order. Icons are suggested visual shorthand, not official heraldry. The sequence and seasonal associations follow the [calendar article](https://forgottenrealms.fandom.com/wiki/Calendar_of_Harptos).

| Month | Suggested icon |
| --- | --- |
| Hammer | Snowflake |
| Alturiak | Icicles |
| Ches | Setting sun |
| Tarsakh | Lightning cloud |
| Mirtul | Thawing droplet |
| Kythorn | Flower |
| Flamerule | Flame |
| Eleasis | Sunburst |
| Eleint | Fading leaf |
| Marpenoth | Falling leaves |
| Uktar | Bare branch |
| Nightal | Star over a low horizon |

Accept `Eleasias` as an older-edition spelling of Eleasis. The four seasonal markers are Ches 19, Kythorn 20, Eleint 21, and Nightal 20. Do not equate the Greengrass or Midsummer festivals with an equinox or solstice. [Calendar of Harptos](https://forgottenrealms.fandom.com/wiki/Calendar_of_Harptos)

## Festival treatment

Render these as named, unnumbered days with their own badge. Do not label them as day 31 or as the first day of the next month. The placements come from the [calendar article](https://forgottenrealms.fandom.com/wiki/Calendar_of_Harptos).

| Festival | Position | Suggested icon |
| --- | --- | --- |
| Midwinter | After Hammer | Snowflake within a wreath |
| Greengrass | After Tarsakh | Flower wreath |
| Midsummer | After Flamerule | Sun with a small celebratory pennant |
| Shieldmeet | After Midsummer, leap years only | Shield |
| Highharvestide | After Eleint | Wheat sheaf |
| Feast of the Moon | After Uktar | Candle beneath a crescent |

Shieldmeet is a day of public festivities and renewed agreements. Years divisible by four contain it, including 1372 DR. This makes a shield a useful compact badge. [Shieldmeet](https://forgottenrealms.fandom.com/wiki/Shieldmeet)

The Feast of the Moon commemorates ancestors and the honored dead; a candle suits that meaning better than a generic party symbol. The wiki traces this to the 1987 *Cyclopedia of the Realms*, page 6, and the 1993 *A Grand Tour of the Realms*, page 21. [Feast of the Moon](https://forgottenrealms.fandom.com/wiki/Feast_of_the_Moon)

Highharvestide celebrates the harvest through communal feasting. Ed Greenwood's own answer, relayed by The Hooded One in his questions thread, describes feeding travelers as part of it. [Ed Greenwood's 2015 answers](https://candlekeep.com/forum/topic.asp?TOPIC_ID=19841&whichpage=7)

## Selûne and the Tears

The wiki gives a phase cycle of 30 days, 10 hours, 30 minutes, with a full moon at midnight on 1 Hammer 1372 DR. It says 48 cycles fit exactly into four years. Its phase discussion cites *Forgotten Realms Campaign Setting*, 3rd edition, page 230. The exact epoch sentence has no separate inline citation, so retain it as the wiki's calendar convention rather than claiming independent book verification. [Selûne, lunar phases](https://forgottenrealms.fandom.com/wiki/Sel%C3%BBne_%28moon%29#Lunar_Phases)

Selûne appears cratered from Toril. Sources disagree on its distance, and the wiki explicitly discusses the discrepancy. The available references do not establish enough orbital parameters for a precise local sky simulation. [Selûne, geography](https://forgottenrealms.fandom.com/wiki/Sel%C3%BBne_%28moon%29#Geography)

The Tears are hundreds of asteroids; observers commonly distinguish nine star-like points. They trail the moon across a broad part of the sky. The first appears about four hours after moonrise, and the cluster takes about three hours to rise completely. They are visible only at night, and not every night. The wiki attributes the sky description to *A Grand Tour of the Realms* and the physical cluster to *Realmspace*. [Tears of Selûne](https://forgottenrealms.fandom.com/wiki/Tears_of_Sel%C3%BBne)

The current design shows enlarged rocky bodies with individual irregular silhouettes, facets and craters. Their compressed spacing and resolved surfaces are illustrations, not a claim that these details are visible unaided. The phase badge remains available even when Selûne is below the horizon.

For visibility, the module distributes the nine bodies across a four-to-seven-hour rise delay. Each body's illumination uses that angular offset from Selûne, so the rocks need not share the moon's phase. A twelve-hour horizon crossing is an approximation. Bodies fade near that horizon, in daylight and under cloud; fog and storms obscure them. The model does not simulate orbital inclination, eclipses or atmospheric scattering.

## Calculation recommendations

The following arithmetic is derived from the cited calendar convention:

- Cycle length: `30.4375` days or `2_629_800` seconds.
- Full-moon reference: start of 1 Hammer 1372 DR.
- Convert the active game calendar date to elapsed seconds, including festivals and Shieldmeet. Never use the computer's date.
- With `t` seconds since the reference, use `q = ((t % period) + period) % period / period`. Here `q = 0` is full, `0.25` last quarter, `0.5` new, and `0.75` first quarter.
- Illuminated fraction is `(1 + Math.cos(2 * Math.PI * q)) / 2`. The moon wanes for `0 < q < 0.5` and waxes for `0.5 < q < 1`.
- The days between the start of year 1372 and year `y` are `365 * (y - 1372) + Math.floor((y - 1) / 4) - Math.floor(1371 / 4)`. Add the zero-based day within the year and time of day.

Useful checks: 1 Hammer 1372 00:00 is full; 16 Hammer 1372 05:15 is new; 1 Alturiak 1372 00:00 is just past full because Midwinter advances the date by a real day; 1 Hammer 1376 00:00 returns to full. Test both sides of Shieldmeet and dates before the reference to catch modulo errors.

For v1, use the existing sunrise/sunset model for the sun's daily motion. Moon phase and moon position should be separate calculations. Any simplified moonrise model, including full moon rising around sunset, is an astronomical approximation adopted by the module rather than a separately verified Realms rule. Weather should obscure or tint the sky scene without altering lunar phase.

## Source limits

The wiki's cited sourcebooks were identified, but this research did not independently inspect their full text. Official D&D/Wizards searches did not expose a public complete astronomy reference. The creator's Highharvestide answer above is the accessible primary-source material used here. Avoid presenting exact coordinates, lunar inclination, eclipse predictions, or nine fixed named Tears as established facts.
