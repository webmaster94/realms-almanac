# Toril atlas and sculpted Realmspace research

Checked 2 October 2026. Recommended route: build an original styled globe and atlas from Toril GIS geometry, credit that project, and link the user's existing Thay scene for detailed play. Keep optional third-party raster maps in campaign configuration rather than bundling them into the public module.

## Best geographic asset source

[Toril GIS by Yaroslav Vasyunin / Geospatial Grimoire](https://www.geospatial-grimoire.com/worlds/toril/gis/download/) publishes coastlines, land cover, lakes, rivers, named regions, settlements, and a digital elevation model. These provide consistent geometry for both a 2:1 globe texture and a zoomable atlas. The creator explicitly permits personal, noncommercial use and sharing of maps made with the project under its [Toril GIS usage terms](https://www.geospatial-grimoire.com/worlds/toril/gis/docs/usage-terms/).

The website's general CC BY-SA footer is not an unrestricted license for every Forgotten Realms asset. Its [terms page](https://www.geospatial-grimoire.com/terms/index.html) gives WotC-related material specific fan-content terms. Preserve source provenance and include the project's credit and the applicable unofficial-content notice. The [Wizards policy](https://company.wizards.com/en/legal/fancontentpolicy) also requires respect for other creators' rights and does not make verbatim redistribution of Wizards material universally permissible.

There is currently no finished photorealistic satellite basemap in Toril GIS. Its [basemap documentation](https://www.geospatial-grimoire.com/worlds/toril/gis/docs/photorealistic-basemap/) explicitly calls that future work. Do not claim that such a downloadable texture exists.

The verified snapshot is `2026-09-24_1`. Use the immutable snapshot paths in a build, rather than silently accepting future changes from `latest.json`.

- [Current manifest](https://downloads.geospatial-grimoire.com/toril-gis/latest.json)
- [Pinned manifest](https://downloads.geospatial-grimoire.com/toril-gis/manifests/2026-09-24_1.json)
- [Land polygons, GeoJSON](https://downloads.geospatial-grimoire.com/toril-gis/packages/2026-09-24_1/geojson/srf_nat_land_pg.geojson)
- [Land-cover polygons, GeoJSON](https://downloads.geospatial-grimoire.com/toril-gis/packages/2026-09-24_1/geojson/srf_nat_land_cover_pg.geojson)
- [Lakes, GeoJSON](https://downloads.geospatial-grimoire.com/toril-gis/packages/2026-09-24_1/geojson/srf_nat_lakes_pg.geojson)
- [Rivers, GeoJSON](https://downloads.geospatial-grimoire.com/toril-gis/packages/2026-09-24_1/geojson/srf_nat_rivers_ln.geojson)
- [Named regions, GeoJSON](https://downloads.geospatial-grimoire.com/toril-gis/packages/2026-09-24_1/geojson/srf_con_named_regions_pg.geojson)
- [Settlements, GeoJSON](https://downloads.geospatial-grimoire.com/toril-gis/packages/2026-09-24_1/geojson/srf_civ_populated_places_pt.geojson)
- [Sea ice, GeoJSON](https://downloads.geospatial-grimoire.com/toril-gis/packages/2026-09-24_1/geojson/srf_nat_sea_ice_pg.geojson)
- [DEM, GeoTIFF](https://downloads.geospatial-grimoire.com/toril-gis/packages/2026-09-24_1/dem/dem_v3.tif)
- [DEM metadata](https://downloads.geospatial-grimoire.com/toril-gis/packages/2026-09-24_1/dem/dem_v3.manifest.json)

The manifest includes download sizes and SHA-256 hashes. Requests succeeded with `User-Agent: Mozilla/5.0` and `Referer: https://www.geospatial-grimoire.com/`; Python's default request received HTTP 403. Some nominal point layers contain GeoJSON `MultiPoint`, including the settlement anchors below. Handle both types.

## Projection and Thay placement

The [creator's coordinate-system article](https://www.geospatial-grimoire.com/blog/2024-11-09-crafting-coordinate-systems-for-faerun-and-beyond/) uses a Toril ellipsoid and an FRIA prime meridian, with zero longitude near central Kara-Tur. It describes Plate Carree as an inference about older maps, not a formally documented projection supplied with every original map. A Myth Drannor longitude convention is different, with an offset of about 53.48 degrees. Do not mix those conventions.

Use the dataset's coordinates consistently. A rectangular globe texture should cover longitude -180 to +180 and latitude +90 to -90 in 2:1 proportions. Labels, frame margins, and a merely rectangular map do not prove a raster has that coverage. A regional Faerun image cannot wrap around the entire sphere correctly.

The current [named-region dataset](https://downloads.geospatial-grimoire.com/toril-gis/packages/2026-09-24_1/geojson/srf_con_named_regions_pg.geojson) records Thay approximately as follows in the FRIA convention:

| Anchor | Latitude | Longitude |
| --- | ---: | ---: |
| Thay regional centroid | 34.8422 | -36.4764 |
| Eltabbar | 35.1795875 | -36.0489502 |
| Bezantur | 32.3382378 | -37.1627824 |
| Waterdeep, useful alignment check | 45.2000852 | -73.6326363 |

The settlements come from the [published settlement layer](https://downloads.geospatial-grimoire.com/toril-gis/packages/2026-09-24_1/geojson/srf_civ_populated_places_pt.geojson), whose entries cite the 1999 Forgotten Realms Interactive Atlas. Thay's bounds are west -40.4456, east -32.8230, south 30.7295, north 39.5370. These are the cartographer's georeferenced measurements, not independently established canonical survey coordinates.

Thay lies in eastern Faerun, in the Unapproachable East. [Thay](https://forgottenrealms.fandom.com/wiki/Thay) A default regional marker is useful, but the user's party location is a separate campaign fact. Set a movable initial marker in Thay, label it as approximate until placed, and link its detail action to the existing scene UUID. Do not assume the party is in Eltabbar or Bezantur. A globe click should open or focus the atlas/scene; it should not activate a different scene for every player without an explicit GM action.

## Raster alternatives and direct images

These links are useful references or optional campaign assets. They are not automatically cleared for inclusion in an openly distributed module.

| Asset | Verified size or coverage | Direct image and source |
| --- | --- | --- |
| Adam Whitehead's Toril 2023 | 9864 x 5626, about 5.7 MB; map depicts 1372 DR | [PNG](https://atlasoficeandfireblog.wordpress.com/wp-content/uploads/2023/12/toril-2023-1.png), [creator article](https://atlasoficeandfireblog.wordpress.com/2023/12/30/a-new-world-map-of-toril-2023/) |
| Adam Whitehead's Faerun 2020 | Regional atlas, not global texture | [PNG](https://atlasoficeandfireblog.wordpress.com/wp-content/uploads/2020/06/faerun-2020.png), [creator article](https://atlasoficeandfireblog.wordpress.com/2020/06/10/a-new-map-of-faerun/) |
| Adam Whitehead's Thay | Regional detail | [PNG](https://atlasoficeandfireblog.wordpress.com/wp-content/uploads/2022/10/thay-2.png), [creator article](https://atlasoficeandfireblog.wordpress.com/2022/10/29/nations-of-the-forgotten-realms-33-thay/) |
| FR Interactive Atlas satellite view, reproduced on Whitehead's blog | 4096 x 2048, about 1.6 MB; geography suitable for globe-reference comparison | [JPG](https://atlasoficeandfireblog.wordpress.com/wp-content/uploads/2023/12/forgotten-realms-large-satellite.jpg), [source discussion](https://atlasoficeandfireblog.wordpress.com/2023/12/30/a-new-world-map-of-toril-2023/) |
| FR Interactive Atlas political view, reproduced on same page | 4096 x 2048, about 0.69 MB | [JPG](https://atlasoficeandfireblog.wordpress.com/wp-content/uploads/2023/12/forgotten-realms-large-map-political.jpg) |
| Official freely downloadable Sword Coast map | Northwestern Faerun only; excludes Thay | [JPG](https://media.wizards.com/2015/images/dnd/resources/20151117_Sword-Coast-Map.jpg), [official download page](https://www.dndbeyond.com/resources/1782-map-of-faerun) |

The original Toril PNG was downloaded and visually inspected. It includes labels, latitude lines, a large title block, and creator attribution; its dimensions are not 2:1. Preserve attribution and georeference or reproject any permitted derivative rather than stretching the image into a globe texture. Whitehead discusses speculative parts of the geography and dates the map to 1372 DR. No explicit blanket redistribution license was found in the inspected creator articles. The satellite and political images are identified as Interactive Atlas material, not Whitehead's original freely licensed artwork.

The official Sword Coast download page encourages VTT use but does not state an open redistribution license. It is also the wrong geographic coverage for this task. The [georeferenced raster collection](https://github.com/geospatial-grimoire/forgotten-realms-rasters) contains useful source alignment files, but its mixed third-party images should not inherit a presumed open license merely because they are on GitHub.

A search also found a [Nucleep Toril fan map](https://www.deviantart.com/nucleep/art/WorldA-COVER-Forgotten-Realms-Toril-Faerun-925094545) labeled CC BY-NC-SA 3.0 in search results. The creator page returned 403, so its image, completeness, and license scope were not verified. It is a lead, not the recommended bundled asset.

## The central sun's name

The [Realmspace primary-source preview](https://d1vzi28wh99zvq.cloudfront.net/pdf_previews/17259-sample.pdf) labels the central body "The Sun." [Amaunator](https://forgottenrealms.fandom.com/wiki/Amaunator) is the solar deity, with that spelling. No inspected source establishes Amaunator as the star's formal astronomical proper name. Honor the requested map label as a campaign choice, for example `Amaunator` with secondary text `The Sun`, and document the distinction without interrupting the user's requested implementation.

## Sculpted-body art direction

The following physical features come from the wiki's accounts of *Realmspace*. Mesh construction, palette intensity, relief exaggeration, and decorative animation remain artistic choices.

| Body | Lore-guided treatment |
| --- | --- |
| [Anadia](https://forgottenrealms.fandom.com/wiki/Anadia) | Amber rocky sphere, deep equatorial canyons, green polar terrain |
| [Coliar](https://forgottenrealms.fandom.com/wiki/Coliar) | Cloud-covered gray-white air world; floating earth and water islands, not an ordinary solid surface |
| [Karpri](https://forgottenrealms.fandom.com/wiki/Karpri) | Blue ocean, ice caps, and a broad equatorial kelp/sargasso region; no continents |
| [Chandos](https://forgottenrealms.fandom.com/wiki/Chandos) | Water world with shifting rock piles and unstable islands; brown-green mottling |
| [Glyth](https://forgottenrealms.fandom.com/wiki/Glyth) | Smoky gray earth world and distinct rings; avoid treating the official diagram's ring scale as reliable |
| [Garden](https://forgottenrealms.fandom.com/wiki/Garden) | Irregular rock cluster entangled in roots, branches, and foliage; no smooth green sphere |
| [H'Catha](https://forgottenrealms.fandom.com/wiki/H%27Catha) | Flat water disc with central mountain, the Spindle, pointing toward the sun; fog around its rim |

[Yggdrasil's Child on Garden](https://forgottenrealms.fandom.com/wiki/Yggdrasil%27s_Child_%28Garden%29) has a trunk woven from many limbs, with roots anchoring adjacent asteroids. This suggests a branching cluster mesh with leaves distributed around it, rather than a single Earth-like ball with one little tree planted on top. It is distinct from the planar Yggdrasil and the tree on Ruathym.

H'Catha's orientation is a particularly useful visual cue: point the Spindle toward the central sun as it orbits. For Garden, use genuine gaps between rocky pieces so solar lighting creates silhouette and shadow. Anadia's ridges, Glyth's rings, and H'Catha's mountain should be geometry where practical. Keep all bodies under the same central light, with a modest ambient fill for navigation. Geometry detail and a sensible exposure range will do more than a baked bright spot painted on every texture.

For a usable overview, orbital distances and planet radii should be visibly compressed and documented as diagram scale. Preserve ordering and the established approximate orbital model from [Realmspace research](realmspace.md). The detailed globe and regional atlas can have separate camera scales without changing campaign time or party position.
