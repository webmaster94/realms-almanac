# Thay artwork, geometry and native-label audit

Audited 4 October 2026. The existing native clean artwork is suitable for removing the baked labels. The current triangulated registration is the main source of the visible distortion around Surthay. It should be replaced by the single affine already encoded by its four corner controls, while keeping native settlement and Group positions unchanged.

The source is Rob McCaleb's Map of Thay. The [creator/store preview PDF](https://d1vzi28wh99zvq.cloudfront.net/pdf_previews/181402-sample.pdf) is the same layout as the supplied 7200 by 7800 `qa/thay.jpg`. The PDF page is 864 by 936 points, so native raster coordinates equal PDF coordinates multiplied by 8.333333333333334. The [creator portfolio](https://robmccaleb.artstation.com/projects/1nqOm8) and [creator's release announcement](https://candlekeep.com/forum/topic.asp?TOPIC_ID=20946&whichpage=1) establish the artwork provenance. Prior registration evidence is recorded in `docs/raster-atlas-research.md`.

## Why the current output is distorted

`qa/continuous-atlas/prepare-mosaic.py` currently opens the labeled `qa/thay.jpg`, applies a furniture mask, and passes it through `tools/build-raster-pack.py::warp`. It does not use the existing clean native artwork for this output. Consequently every printed place name receives the same local geometric deformation as the terrain.

The current calibration has 14 measured native settlement centers forced to coordinates from the older [FRIA-derived settlement GIS](https://downloads.geospatial-grimoire.com/toril-gis/packages/2026-09-24_1/geojson/srf_civ_populated_places_pt.geojson). Four corners come from a least-squares affine fitted to those 14 pairs. A Delaunay mesh creates 30 separate affine triangles between them.

There are no flipped triangles and no measurable overlaps between target triangles. The problem is severe deformation and abrupt changes between neighboring triangles, not a topological fold:

| Measure | Current mesh |
| --- | ---: |
| Greatest stretch ratio between principal directions | 6.436 to 1 |
| Local area scale, minimum to maximum | 0.384 to 2.357 |
| Local polar rotation range | -25.587 to +43.025 degrees |
| Largest rotation difference across a shared edge | 44.153 degrees |

The printed Surthay name crosses two triangles. Their polar rotations are -25.587 and +3.672 degrees, and their stretch ratios are 3.753 and 1.571. The Lake Mulsantir label lies inside the -25.587-degree triangle with the 3.753 stretch ratio. This directly explains bent, stretched or apparently doubled lettering near that location. Removing the text alone would leave the shoreline deformation.

`qa/thay-audit/warp-diagnostics.json` records every triangle Jacobian, scale and adjacent edge. `native-north-mesh.jpg` and `warped-north-mesh.jpg` show the relevant mesh edges. A 528,000-pixel Surthay neighborhood differs between `thay-original-world.png` and `thay-world-joined.png` in only 4,454 pixels, with mean channel difference 0.0665 on a 0-255 scale. The join pass makes small local changes, but the major geometric distortion already exists in the original warped raster. See `surthay-join-comparison.json`.

## Recommended transform

Use the single affine that generated the current four corners:

```text
longitude = 0.0011042546540538096*x - 0.00008642379573784845*y - 40.629796442294136
latitude  = -0.00018836460039816364*x - 0.0010164947897622649*y + 39.240046319654404
```

Here x/y are native 7200 by 7800 source coordinates. This affine preserves the existing outer four corners exactly. Straight source lines remain straight, and internal derivative jumps become zero. On the current 7200 by 7751 world raster grid, its singular values are 0.94875 and 0.83645, giving a mild 1.1343 stretch ratio and a 7.3827-degree polar rotation.

A best-fit similarity transform has a stretch ratio of exactly one, but raises city-coordinate RMS residual from 0.47868 to 0.50522 degrees and moves a corner by as much as 0.49228 degrees. The existing corner affine is the more practical repair because it preserves the current outer boundary joins. Formulas and comparison data are in `qa/thay-audit/affine-recommendation.json`.

This is a deliberate choice to preserve the detailed source geography. It does not make the two maps geographically identical. With the affine, Surthay becomes longitude -37.22401, latitude 38.07592. Its older GIS coordinate is -36.43417, 37.95021, an approximately 715-native-pixel discrepancy under this affine. Across all 14 settlements, RMS disagreement is 0.47868 degrees. The older city points and the detailed illustration have materially different cartographic geometry. Exact interpolation of every older point conceals that disagreement by deforming the drawing.

The Group's currently calibrated native position, specified for this repair as 4508,3265, must remain at that native position. Recomputing its displayed world coordinate through the new affine is not permission to move the linked Foundry token or rewrite its native location. The same rule applies to the 14 measured city centers.

## Lake boundaries need an explicit source choice

The inspected [FRIA-derived lake dataset](https://downloads.geospatial-grimoire.com/toril-gis/packages/2026-09-24_1/geojson/srf_nat_lakes_pg.geojson) contains Lake Ashane, whose geometry extends to the southern lake area, but no separately named Lake Mulsantir polygon. The detailed Thay source explicitly labels the cropped southern water body Lake Mulsantir. Matching names alone cannot establish a one-to-one polygon correspondence.

The current warped raster disagrees visibly with both the southern Lake Ashane boundary and Lake Thaylambar. A color-segmentation comparison within the raster's valid coverage gives indicative water-area intersections over union of about 0.370 and 0.355 respectively. The segmentation includes connected waterways and is only a shape diagnostic, not a survey measurement. `north-raster-gis-shorelines.jpg` and `thaylambar-raster-gis-shorelines.jpg` draw the raster water outline in cyan and the older GIS boundary in magenta. The underlying measurements and caveats are in `geographic-disagreement.json`.

A constant affine fixes the destructive local stretching. It does not prove the detailed shore is the same as the GIS shore. For this source-preserving atlas repair, retain the native detailed shore and place its labels through the same affine. Do not simultaneously present the old GIS lake outline as the exact local shore. Further global shoreline reconciliation would require separately reviewed terrain controls, rather than more city-only interpolation.

## Existing clean artwork is usable

`qa/raster-sources/thay-clean-final.png` is a 7200 by 7800 native-frame clean map. It uses the previously recovered original PDF raster terrain and a documented title-cartouche patch. A fresh feature comparison with the supplied JPEG finds 3,635 affine inliers from 3,686 accepted matches. Identity displacement is 0.258 native pixels RMS, and the measured affine is effectively identity. The clean and labeled artwork share the same coordinate frame.

The Surthay close-up removes the printed text while retaining visible settlement blocks, roads, rivers and shorelines. The source text boxes cover about 22 percent of the map; recovery was restricted to those masks plus a documented raster-fragment seam pass. It is not a claim that every previously obscured terrain pixel is independently verified.

The final clean file differs from `thay-native-clean-final.png` only within x5610..7126, y75..858, the upper-right title patch. The existing world furniture mask excludes this area. No new generative terrain is needed. `clean-artwork-check.json`, `native-surthay-north.jpg` and `clean-surthay-north.jpg` record the audit.

## Native source labels recovered

`qa/thay-audit/native-labels.json` contains 896 source-derived label occurrences: 709 villages, 23 towns, 16 city labels, 65 water labels, 42 regions, 21 routes, 19 sites and one landmark. Fourteen use the previously measured native settlement centers. Every other x/y is explicitly a native text-center anchor, with `preciseMarker: false`; it must not be rendered as a surveyed settlement dot.

The old 776-label list is not OCR output. `tools/build-raster-pack.py::thay_calibration` builds it from native PDF text bounds. Its weaknesses are incomplete glyph decoding, duplicate fragments, unsafe grouping and overly generic classification. Many unfamiliar village names are actually printed in the source and should be retained.

The PDF's own font dictionaries explain several corrupted names. Encoding object 1136 maps byte 31 to glyph `/T_h`. Object 1140 also maps that ligature and 17 small-cap glyphs. The old text extraction interpreted `/T_h` as just T, yielding forms such as Tasselen, Tralgard and Tazar. An in-memory ToUnicode interpretation of those explicit source encodings recovers Thasselen, Thralgard and Thazar without OCR or outside-name substitution. The original PDF is unchanged.

The PDF has 1,902 alpha-zero text spans and 1,626 visible spans. Invisible text cannot simply be discarded: some large geographic labels have been flattened into raster fragments but retain their native text metadata. The audit combined both, preferred visible occurrences, and removed 7,211 duplicate logical glyphs at the same native position. Consecutive curved letters and nearby multiline label components were grouped, then the ambiguous cases were checked against the source image.

The final review explicitly joins Mulsanyar Plateau, Umber Marsh, Ashatur Gap, Umbergoth, First Escarpment and Lapendrar Road. It also splits four false compound names created by PDF layout extraction into separate printed villages: Kurkha and Rachgahn, Quanira and Kazshara, Veldza and Ulgir, and Kothos and Asannan. The 50-mile scale annotation was excluded.

There are 224 individually reviewed output entries, including the towns, cities, water, region and site samples and the ambiguous compound labels. Most remaining small villages are complete single-word native PDF spans. They are marked `nameConfidence: native-source-glyphs`, not individually visually verified. No external place catalog or invented settlement supplied a name.

Some repeated names are correct. Surthay, Eltabbar, Tyraturos and Pyarados each have a settlement name and a separate administrative-region name in the artwork. Their catalog IDs, kinds and native anchors are distinct. Repeated river, road and escarpment labels also represent different printed occurrences. Avoid merging these records by name alone. Region records must use their own label center, not the same-named city's measured point.

Nine `native-label-review-00.jpg` through `native-label-review-08.jpg` sheets, two `native-sites-review` sheets, `multiword-villages-review.jpg` and `kothos-asannan-review.jpg` provide source-based review evidence. Each audited catalog record retains its source span indices, font, native bounds, decoding method and review status. Apply the chosen affine to its native x/y once for both label drawing and search.

All new research artifacts are under `qa/thay-audit`. No production image, runtime file, original source file, Foundry document or token location changed during this audit.

## Targeted water-name recheck

The suspected `R. Eltar` truncation was checked again against the original 7200 by 7800 JPEG at twice native scale. The printed name is **R. Eltar**. Its finalized ID is `thay-native-0275`, and its native label center is 4155.307896931967,3324.9045054117837. The visible PDF glyph sequence is `R`, `.`, space, `E`, `l`, `t`, `a`, `r`; there is no b glyph at that source location. The label is west of Eltabbar, near Celescez and Phaal. `qa/thay-audit/thay-native-0275-river-recheck.jpg` shows the enlarged source crop, and `eltabbar-rivers-native.jpg` shows the surrounding city and waterways.

All 65 finalized water-label occurrences were then rechecked against source glyph positions and new native-image contact sheets. No visible source glyph was absent from its retained label group, and the three contact sheets agreed with the final names. See `qa/thay-audit/water-glyph-recheck.json` and `water-label-recheck-00.jpg` through `water-label-recheck-02.jpg`. This pass required no name, ID, native-coordinate or world-coordinate changes. The finalized `native-labels.json` was not rewritten.
