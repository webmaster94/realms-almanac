# Realmspace body sizes and atlas scale

Checked 4 October 2026 for the 0.8 atlas changes. Orbital distance, physical body diameter, and displayed mesh radius are separate quantities. Multiplying the existing orbital radii by four improves spacing without making the diagram physically proportional.

## Published size evidence

The publisher-hosted SJR2 preview directly identifies the Sun as size H. It stops before the planet chapters. `Amaunator` remains the campaign's label for this body. [*Realmspace*, printed page 5](https://d1vzi28wh99zvq.cloudfront.net/pdf_previews/17259-sample.pdf)

The other classes below were read directly in the original TSR *Lorebook of the Void*, pages 93–95, and converted with the *Concordance of Arcane Space* size-class table. The available text is original-book OCR on a third-party host, not a publisher-hosted preview. The classes define ranges, not exact diameters. [*Spelljammer: AD&D Adventures in Space*, original book text](https://www.scribd.com/document/516991007/Adventures-in-Space-Boxed-Set-TSR1049)

| Body | Class | Published diameter range, miles |
| --- | --- | ---: |
| Sun / Amaunator | H | 100,000 to 1,000,000 |
| Anadia | B | 10 to 100 |
| Coliar | G | 40,000 to 100,000 |
| Toril | E | 4,000 to 10,000 |
| Karpri | D | 1,000 to 4,000 |
| Chandos | F | 10,000 to 40,000 |
| Glyth | E | 4,000 to 10,000 |
| Garden | A, cluster | A means under 10 miles; the entry describes linked asteroids, so do not assign this as a verified overall canopy diameter |
| H'Catha | C, disc | 100 to 1,000 across |
| Selûne | Not independently verified in readable primary text during this pass | No exact diameter established |

SJR2 page 29 is the outstanding source to inspect for Selûne's detailed statistics. Search results report class D, but this pass did not recover a readable primary size entry. Keep that distinction in the metadata. Do not copy exact sizes from fan simulations, which often enlarge these bodies or add invented moons.

The checked local classic and official Realmspace charts establish orbital order and distances. Their drawn planet symbols do not establish physical diameter ratios.

## Concrete display recommendation

Use the existing Toril mesh radius of 5.4 as the anchor. For ordinary bodies, a useful starting rule is `displayRadius = 5.4 * sqrt(representativeDiameter / 8000)`. The representative diameter is an authored value within the published range, not a recovered exact measurement. Geometric midpoints work for most classes. Toril and Glyth can both use 8,000 miles as convenient E-class representatives. Apply a minimum mesh radius to very small bodies and keep a separate screen-sized selection target.

| Body | Proposed display radius | Basis |
| --- | ---: | --- |
| Amaunator | 34 | H midpoint, rounded |
| Anadia | 0.65 | B midpoint with visibility floor |
| Coliar | 15.2 | G midpoint |
| Toril | 5.4 | Existing anchor |
| Karpri | 2.7 | D midpoint |
| Chandos | 8.5 | F midpoint |
| Glyth | 5.4 | Same representative diameter as Toril, rings extra |
| Garden | 1.0 | Authored cluster extent; detail camera reveals branches and rocks |
| H'Catha | 1.1 | C midpoint; radius describes the water disc |
| Selûne | 1.5 | Preserve existing visual radius pending primary verification |

All numbers in this table are diagram choices. They compress the huge physical differences while making the main hierarchy obvious. The sun's radius becomes about 6.3 times Toril's, versus the current 2.2. Keep the corona separate from the physical solar disc, and avoid a large opaque glow hiding Anadia.

Multiply only the solar orbit layout values by four: `[220, 360, 540, 712, 892, 1260, 1520, 1780]`. Preserve existing orbital angles and periods. Multiply the shell and its attached exterior effects by the same factor. This retains the existing nonlinear distance mapping; do not call it true scale. Local moon and Tears offsets need their own readability decision rather than inheriting the solar factor automatically.

For the overview, small bodies need persistent labels or selection markers. Zooming in should reveal their actual mesh without increasing that mesh just to meet an overview pixel target. Use the mesh's full bounding extent for detail-camera fitting, especially Glyth's rings, Garden's branches, and H'Catha's Spindle.

## Toril ruler circumference

The current atlas ruler uses 24,000 miles. No inspected primary source establishes that exact circumference. The atlas's own geographic asset source gives an equatorial semiaxis of 6,410 km and polar semiaxis of 6,370 km. These are the Toril GIS creator's coordinate-model parameters, not an independently verified canonical survey. [Geospatial Grimoire, coordinate-system article](https://www.geospatial-grimoire.com/blog/2024-11-09-crafting-coordinate-systems-for-faerun-and-beyond/)

For this GIS-based atlas, use the source geometry consistently. `2 * PI * 6410 / 1.609344` gives an equatorial circumference of **25,025.86 miles**, about 4.27% above the existing value. The corresponding equatorial diameter is 7,965.98 miles. Store the measurement circumference separately from the rendered globe radius and from solar-diagram sizing.

A simple spherical great-circle ruler can use that circumference as an explicit approximation. An ellipsoidal geodesic can use both semiaxes. Either way, changing the solar display spacing must not change measured surface distances.

## Implemented display

The 0.9 system uses these diagram radii: Sun 72, Anadia 0.8, Coliar 25.5, Toril 9, Karpri 4.5, Chandos 14.2, Glyth 9, Garden 1.7, H'Catha 1.84 and Selûne 2.5. The solar disc is eight times Toril's display radius. These are authored values preserving the sourced size-class order, with a visibility floor for small objects; they are not exact physical diameters. Solar orbit spacing and the shell increase fourfold, while lunar geometry remains separately scaled. Labels exclude position properties from inherited CSS transitions.
