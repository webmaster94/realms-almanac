# Realmspace planets for the Toril sky

Research checked 2 October 2026. This note separates published descriptions from the simulation choices needed to draw a useful calendar sky.

## Names and scope

Realmspace is the system containing Toril, traditionally enclosed by the crystal sphere of the same name. Abeir-Toril is an older name for Toril, not the sphere. Later lore describes Abeir as Toril's twin in a displaced dimension. Do not add Abeir as an ordinary planet visible beside Toril. [Realmspace](https://forgottenrealms.fandom.com/wiki/Realmspace), [Toril](https://forgottenrealms.fandom.com/wiki/Toril), [Abeir](https://forgottenrealms.fandom.com/wiki/Abeir)

The current Spelljammer presentation calls Realmspace a Wildspace system and describes travel beyond it through the Astral Plane. The older crystal-sphere terminology remains useful when discussing the 1991 sourcebook, but the UI can simply say "Realmspace." [D&D Beyond's official Wildspace guide](https://www.dndbeyond.com/posts/1238-the-spelljammers-guide-to-wildspace-in-dungeons)

There are seven other planets to draw from Toril. Selûne is its moon, the Tears are asteroids, and neither belongs in the planet list. Anadia and Coliar are the Dawn Heralds. The five planets beyond Toril are the Five Wanderers. Garden is a cluster rather than a sphere, but the setting still classifies it as a planet. [Realmspace](https://forgottenrealms.fandom.com/wiki/Realmspace), [Garden](https://forgottenrealms.fandom.com/wiki/Garden)

## Published data

Distance means distance from the sun, in millions of miles. The period is a year on that body, not the cycle of its apparent motion as seen from Toril.

| Body | Distance | Published orbital period | Appearance from Toril |
| --- | ---: | --- | --- |
| [Anadia](https://forgottenrealms.fandom.com/wiki/Anadia) | 50 | 30 days | Amber with green polar regions; stays near the sun |
| [Coliar](https://forgottenrealms.fandom.com/wiki/Coliar) | 100 | 8 months | Gray and white; stays near the sun |
| Toril, observer | 200 | 365 days in the older planet entry | Not a sky object viewed from its own surface |
| [Karpri](https://forgottenrealms.fandom.com/wiki/Karpri) | 300 | 650 days | Sapphire blue with white caps |
| [Chandos](https://forgottenrealms.fandom.com/wiki/Chandos) | 400 | 67 months | Brown-green with markings that change over several nights |
| [Glyth](https://forgottenrealms.fandom.com/wiki/Glyth) | 1,000 | 360 months | Dull gray with a prominent ring |
| [Garden](https://forgottenrealms.fandom.com/wiki/Garden) | 1,200 | 1,022 months | Tiny green glimmer, rarely seen |
| [H'Catha](https://forgottenrealms.fandom.com/wiki/H%27Catha) | 1,600 | 2,004 months | Diamond-white glimmer; some accounts report emerald green |

The public preview of Dale Henson's *Realmspace*, SJR2, directly confirms the distance sequence in its sun table. [Realmspace publisher/store preview, printed page 5](https://d1vzi28wh99zvq.cloudfront.net/pdf_previews/17259-sample.pdf)

The individual wiki articles attribute orbital periods to *Realmspace*, 1991. Anadia cites pages 7–11, Coliar pages 12–17, and Karpri pages 32–35. Several appearance descriptions cite *Forgotten Realms Campaign Setting*, 3rd edition, page 231. Those planet chapters were not independently available in the public six-page preview, so the periods and colors above are verified wiki reports of those books, not a claim that the full primary text was inspected.

H'Catha is a flat water world with a central mountain. Garden consists of rocks held by an enormous tree. Their small sky markers should not imply that every planet is a conventional rocky sphere. Rings, caps, and texture in a several-pixel icon are illustrations, not an assertion of what an unaided observer can resolve. [H'Catha](https://forgottenrealms.fandom.com/wiki/H%27Catha), [Garden](https://forgottenrealms.fandom.com/wiki/Garden)

## What remains unknown

This research did not find a dated orbital longitude, conjunction, or complete set of orbital elements that fixes any of these planets' positions on a particular Harptos date. A period alone cannot establish that position. Do not use Selûne's full-moon reference to assert a simultaneous planetary alignment.

The sources report several periods in "months" without a conversion established by the material inspected. A 30-day month is a reasonable module convention, but it needs to be identified as that. It yields 240, 2,010, 10,800, 30,660, and 60,120 days for Coliar, Chandos, Glyth, Garden, and H'Catha. Do not silently substitute real Solar System periods. Do not derive periods with Kepler's laws and replace the published fantasy values.

There is no verified magnitude scale or visibility threshold in these sources. Garden being rarely seen is a useful qualitative distinction. Exact rise/set times, eclipse predictions, phases, and brightness require assumptions beyond the retrieved lore.

## Recommended deterministic model

Use the known periods and distances with a simple circular-orbit model. Mark its output "Approximate sky positions" in the sky help or tooltip. This is enough to keep the Dawn Heralds near sunrise or sunset and let the outer planets drift over campaign time.

1. Count elapsed game days, including holidays, from a fixed campaign reference such as 1 Hammer 1372 DR. The reference date is a calculation origin; it asserts no historical conjunction.
2. Store a configurable initial orbital angle for each planet and Toril. Choose spread-out defaults once. Persist them for all clients rather than randomizing on render.
3. Advance each angle by `2 * Math.PI * elapsedDays / periodDays`. Use positive modulo so rewinding time behaves correctly.
4. Calculate each heliocentric position as `[radius * cos(angle), radius * sin(angle)]`.
5. Subtract Toril's position to obtain each planet's direction from Toril. The sun's direction is the negative of Toril's position. This automatically constrains the inner planets' elongations and can produce apparent retrograde motion.
6. Project those directions into the existing daily sky model. If it has no latitude or orbital inclination, use an explicitly schematic horizon rather than claiming precise altitude and azimuth.

For Toril, use 365.25 days as the module's averaged solar cycle to agree with the four-year Harptos calendar. The older planet entry rounds its year to 365 days. State the averaged-cycle choice in the implementation documentation.

The geometry above is an original proposed approximation, not a recovered canonical ephemeris. Keep period, reference date, initial angles, and month-length conversion easy to override. A future campaign-specific alignment can then be configured without rewriting the sky.

## Phase and visibility design

At the bar's scale, colored points with names on hover will read better than seven tiny lunar-phase diagrams. Reserve textured discs and a ring for a larger sky view. Keep the moon visually dominant.

If phase shading is desired, derive the illuminated fraction from the sun–planet–observer angle in the same geometry: `(1 + cosinePhaseAngle) / 2`. Inner planets can have crescent phases in this model; distant outer planets stay close to full. Treat shading of flat H'Catha and irregular Garden as illustration or omit it.

Fade points when below the model's horizon, in daylight, close to solar glare, or behind thick cloud. Give Garden a stricter darkness/clear-sky threshold than the others. These thresholds are display rules, not established Realms astronomy. Never change the orbital position because weather changes, and never force every planet to appear each night.

Useful checks include deterministic output after reload, smooth motion across midnight and festivals, sensible rewind behavior, Dawn Heralds remaining near the sun, and no visible Toril/Abeir marker from Toril's surface. Advancing one planet's period repeats its heliocentric angle, but does not generally repeat its position in Toril's sky because Toril also moves.
