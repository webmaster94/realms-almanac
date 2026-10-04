# Continuous atlas label audit

Checked 3 October 2026 against the local pinned Toril GIS snapshot `2026-09-24_1` and the original `qa/thay.jpg`.

Follow-up on 4 October: the full pinned publisher manifest includes ocean and marine layers omitted from the original local five-layer import. Those layers have now been downloaded and audited in [political atlas research](political-atlas-research.md), including a Lake of Steam water polygon. The coverage limits below describe the original imported subset, not every layer available from the publisher.

`qa/continuous-atlas/geographic-labels.json` contains all 290 usable English geographic labels in the five supplied polygon/line layers. No settlements were added or inferred. Rebuild with `python -X utf8 qa/continuous-atlas/build-label-catalog.py` from the repository root. The script reads and writes UTF-8 explicitly and uses the existing `qa/pydeps` Shapely installation.

## Source coverage

These counts come directly from the local copies of the linked publisher datasets. A literal `unnamed` label is a placeholder, not a place name. The catalog retains source English display labels when the English name is absent.

| Pinned source | Features | Catalog labels | Placeholder names | Missing names |
| --- | ---: | ---: | ---: | ---: |
| [Named regions](https://downloads.geospatial-grimoire.com/toril-gis/packages/2026-09-24_1/geojson/srf_con_named_regions_pg.geojson) | 61 | 61 | 0 | 0 |
| [Lakes](https://downloads.geospatial-grimoire.com/toril-gis/packages/2026-09-24_1/geojson/srf_nat_lakes_pg.geojson) | 150 | 82 | 68 | 0 |
| [Rivers](https://downloads.geospatial-grimoire.com/toril-gis/packages/2026-09-24_1/geojson/srf_nat_rivers_ln.geojson) | 1195 | 2 | 0 | 1193 |
| [Land](https://downloads.geospatial-grimoire.com/toril-gis/packages/2026-09-24_1/geojson/srf_nat_land_pg.geojson) | 2022 | 10 | 1 | 2011 |
| [Land cover](https://downloads.geospatial-grimoire.com/toril-gis/packages/2026-09-24_1/geojson/srf_nat_land_cover_pg.geojson) | 479 | 135 | 343 | 1 |

The 61 named regions comprise 39 regions, 13 subregions, and nine macroregions. These classifications do not assert political sovereignty. The eight continent labels are Faerûn, Kara-Tur, Osse, Maztica, Zakhara, Lopango, Katashaka, and a source label `Terra Incognita` whose `name_en` is null. The two islands are Evermeet and Nimbral. Do not rename Terra Incognita to a guessed continent.

Only Iceflow and Mirar have river names. The supplied GIS has no ocean polygons. Inland seas such as Sea of Fallen Stars and Moonsea occur in the lake layer. Completing ocean names or other rivers requires another directly inspected map source; it cannot be done honestly by assigning names to anonymous GIS shapes. `Moonsea` occurs independently as a lake and a macroregion, and `Chondalwood` occurs as a region and a forest. Preserve those distinctions when resolving collisions.

## Catalog contract

The root has `schema`, `snapshot`, `coordinateSystem`, `manifestUrl`, `sources`, `coverage`, and `labels`. Each label has a stable layer-plus-UUID `id`, `name`, source `label`, `category`, `featureClass`, original numeric `rank`, `lon`, `lat`, and `bounds` with west/south/east/north. Categories are `continent`, `land`, `region`, `river`, `terrain`, and `water`. The source files' SHA-256 hashes, totals, and skipped counts are retained under `sources`; each label retains its feature index, UUID, dataset URL, original source name/URL, reference URL, and editions.

Polygon anchors lie inside the largest component, using `representative_point`; line anchors use the midpoint of the longest component. These are display anchors, not city locations. All 290 anchors passed a distance-to-geometry check below 1e-9 degrees. Hungste Province needed `make_valid` before anchor selection; the catalog records this repair and leaves the source file untouched. Source review flags remain on Southern Jungles and Lake Menuap. Ranks remain unchanged, and the builder invents no zoom thresholds.

Coordinates use the dataset's Toril GCS and FRIA longitude convention. The cartographer documents a different Myth Drannor convention and an approximately 53.48-degree longitude offset. The GeoJSON's generic CRS84 tag must not be taken to mean terrestrial geography. [Creator's CRS explanation](https://www.geospatial-grimoire.com/blog/2024-11-09-crafting-coordinate-systems-for-faerun-and-beyond/)

Waterdeep illustrates why IDs and geometry classes matter. Its [settlement record](https://downloads.geospatial-grimoire.com/toril-gis/packages/2026-09-24_1/geojson/srf_civ_populated_places_pt.geojson), UUID `e37dd71f-f84a-4ba1-a21c-2c98f6ad3cc2`, is a city MultiPoint at longitude `-73.63263632942116`, latitude `45.200085226748385`. Its named-region record is a separate polygon with UUID `cf4f9e34-c83d-436f-a445-68324ff60c6c`. A lookup keyed only by `Waterdeep` can substitute the regional anchor and move the city. Keep the city point stable through every zoom level and source-map change.

## Preserve the original Thay labels

Visual inspection of `qa/thay.jpg` confirms that the original 7200 × 7800 map already prints settlements, rivers, lakes, roads, terrain names, tharch names, and neighboring regions. The original JPEG SHA-256 is `1b01a6d1db17dd8c2fc3b05f3f2d79cddc47404690ff5424622e91299ee399ff`. All printed names can remain in the image by using that source without redaction, text reconstruction, or a duplicate dynamic label layer. Tile it at native resolution so the small names survive zooming. This preserves the source's content; it does not establish that every printed village has an independently verified geographic coordinate.

The map is Rob McCaleb's Map of Thay, matched previously to the [creator/store preview PDF](https://d1vzi28wh99zvq.cloudfront.net/pdf_previews/181402-sample.pdf). See the [creator portfolio](https://robmccaleb.artstation.com/projects/1nqOm8) and the existing [raster source audit](raster-atlas-research.md). That audit records 2485 registration inliers, consistent with the PDF-to-JPEG scale of 8.3333333333 pixels per PDF point.

`qa/raster-sources/thay-label-bounds.json` contains 2046 grouped text spans from 3422 raw spans. Those are not 2046 settlements. Curved lettering, split words, overprinted styling, and private-use glyphs prevent treating extraction as a clean place list. The existing `qa/campaign-atlas/thay-native-build.json` includes broken extracted labels such as `U m b` and `T ll`; do not reuse them as authoritative locations. The original JPEG avoids this loss because its printed names remain intact. Label rectangles are text extents, never measured settlement dots.

Country, regional, and water labels in this catalog describe the supplied source snapshot. The data mixes edition tags and often has a null timeframe. It does not independently establish 1502 DR borders or erase the original map's historical assumptions. Retain the source credit and provenance documented in [atlas research](atlas-research.md).

## Additional labels from the registered Faerûn source

`qa/continuous-atlas/source-geographic-labels.json` separately records 48 visually inspected printed labels from the [registered Adam Whitehead Faerûn 2020 image](https://media.githubusercontent.com/media/geospatial-grimoire/forgotten-realms-rasters/15fc3e452a8c6ad4061c8f61a7aadae862923938/4-community/AIF%20%282020%29%20-%20Faerun_v2.jpg). There are 32 water labels, 11 rivers, and five country/region labels. The original source file remains untouched. The map itself prints circa 1371 Dalereckoning.

Verified additions include Trackless Sea, Sea of Swords, Shining Sea, Great Ice Sea, Great Sea, Sea of Moonshae, Alamber Sea, Wizards' Reach, Dragon Reach, Easting Reach, Bay of Chessenta, Starmantle Bay, and Lake Mulsantir. Rivers include Chionthar, River Reaching, Winding Water, Wet River, South Cedar River, Arkhen, River of Metals, Winding River, Esmel, Sulduskoon, and Ith. These names were read from the source image; they were not guessed from anonymous GIS lines. Cormyr, Sembia, Thay, Amn, and Tethyr are visibly printed and already have GIS regions.

Each entry preserves the printed-text center in original image pixels, a review-crop path, source provenance, an approximate 25-pixel manual precision, and an OCR score when a nearby matching OCR result exists. The source's [published JGW](https://raw.githubusercontent.com/geospatial-grimoire/forgotten-realms-rasters/15fc3e452a8c6ad4061c8f61a7aadae862923938/4-community/AIF%20%282020%29%20-%20Faerun_v2.jgw) converts these centers to longitude/latitude. These are cartographic text placements, not inferred river geometry or settlement dots. For matched features of the same category, `preferExistingGisAnchor` recommends the existing geometric anchor. A water label for the Vilhon Reach must not inherit its differently classified regional polygon merely because the names match.

The tiled OCR pass covered 35 overlapping tiles and produced 4265 raw detections. Filtering for known GIS names and multiword water terms retained 172 candidates under a separate `candidates` array. Every candidate has `promoteAutomatically: false`; OCR confidence alone does not verify its name or geography. Inset labels receive `coordinateUsable: false` because Evermeet's inset does not share the main map's affine placement. The verified `labels` array contains no inset labels or settlements.

Rebuild the inspection record with `python -X utf8 qa/continuous-atlas/build-source-geographic-labels.py`. Raw detections remain in `qa/continuous-atlas/faerun-ocr-raw.json`, and `extract-faerun-ocr.py` reproduces the OCR pass. The source-label ranks are explicitly editorial display priorities. They are separate from the untouched source feature ranks in the GIS catalog.
