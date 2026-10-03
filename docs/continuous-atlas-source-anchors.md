# Source anchors for one continuous Sword Coast atlas

Audited 3 October 2026. `qa/continuous-atlas/sword-coast-labels.json` contains 213 source-backed entries. Every coordinate comes from the same 10012 by 5989 registered Sword Coast image. It contains no coordinates copied from the older settlement GIS.

The image is the registered form of the artwork on the [official publisher download page](https://www.dndbeyond.com/resources/1782-map-of-faerun). The exact [registered TIFF](https://media.githubusercontent.com/media/geospatial-grimoire/forgotten-realms-rasters/15fc3e452a8c6ad4061c8f61a7aadae862923938/3-modern-wotc/WotC%20-%20Sword%20Coast%20Map%202015_5E.tif) belongs to raster-repository commit `15fc3e452a8c6ad4061c8f61a7aadae862923938`. The local file's SHA-256 was recomputed and matches `443293a165d6d5b9587624f81132ce29d42f48f470ba499710b5f14f0938a4de`. See the [repository's registration description](https://github.com/geospatial-grimoire/forgotten-realms-rasters) and the existing `docs/raster-atlas-research.md` for CRS provenance.

## What the catalog records

| Entry group | Count | Coordinate meaning |
| --- | ---: | --- |
| Printed black-dot locations | 65 | Measured center of the actual printed marker |
| Printed settlement names without a dot | 20 | Approximate search target at the printed text center |
| Geographic, water, route, and other text labels | 128 | Printed label anchor, not a polygon centroid |

The first group includes settlements, ruins, monuments, forts and mountain markers. It is not a count of 65 cities. `kind` and `type` distinguish City, Town, Site, Landmark, Region, Water and Route. City preserves the ten previously approved UI categories. Town is a display category for other settlement names, not a claim about their population or canonical municipal status.

Each entry has a stable ID, name, native image x/y, longitude/latitude, anchor type, source provenance, confidence and uncertainty fields. Marker entries also identify their detector candidate and review sheet. Geographic labels keep their OCR bounds and IDs. A single place can have two separately printed meanings: Ruathym has a town marker and an island label, with different IDs and kinds. Do not merge those two by name alone.

The output retains all ten previously verified anchor positions exactly. Waterdeep is pixel **4557.702127659574, 2159.567375886525**, which projects to longitude **-73.62374441716413**, latitude **44.934880515914955**. Its old GIS latitude of 45.20009 points about 63.34 pixels north on this illustration. Loading that older coordinate at a different zoom would move the city away from its printed marker. Search, labels, party placement and every zoom level should consume the same catalog record.

## Text-only settlements need different treatment

The source prints Zhentil Keep, Orlumbor, Hillsfar, Arabel, Ordulin, Yhaunn, Proskur, Marsember, Mulhessen, Saerloon, Selgaunt, Iriaebor, Easting, Priapurl, Elversult, Westgate, Murann, Riatavin, Ormath and Hlondeth without a settlement dot in their reviewed surroundings. These names are visually verified, but their exact physical point is not established by this map.

Those 20 entries have `anchorType: printed-label-center`, `confidence: medium`, `uncertain: true` and `positionVerified: false`. They are useful stable search targets. They should not silently acquire a precise marker or an older GIS position. Their uncertainty allowance is half the printed label's larger dimension, which describes the annotation footprint rather than a surveyed confidence interval.

The 65 actual dots have high source-position confidence and an estimated two-native-pixel picking tolerance. That measures the printed marker center, not the accuracy of the fictional geography. Region and water labels represent annotations, so their position is not a claim about a coastline, river centerline or territory centroid.

## Audit and visual evidence

The first OCR pass scanned 60 overlapping tiles. A second pass scanned 120 tiles at twice native display scale to recover split words and check for missed smaller names. The first pass produced 295 spatially deduplicated text candidates. Neither pass was accepted as a name authority without visual review.

Black-component and light-halo filtering produced 141 circle candidates. Visual review accepted 65 actual printed point markers. The remaining 76 candidates were terrain details, letters or border ornament. All accepted marker locations and adjacent printed names appear in these annotated sheets:

- `qa/continuous-atlas/sword-verified-places-00.jpg` through `sword-verified-places-04.jpg` cover the 65 markers and 20 text-only settlements. Red rings identify actual dots; red crosses identify text-center approximations.
- `qa/continuous-atlas/sword-geographic-sheet-00.jpg` through `sword-geographic-sheet-05.jpg` show all 128 other accepted names against the raster.
- `qa/continuous-atlas/sword-dot-sheet-00.jpg` through `sword-dot-sheet-05.jpg` retain the original detection candidates, including rejected examples.
- `qa/continuous-atlas/spelling-detail.png` records two ambiguous spellings at enlarged native scale.

The catalog preserves the printed forms **Ruins of Ascarl** and **Dernal Forest**, rather than silently substituting spellings recalled from other sources. It also preserves **Ss'thar'tiss'ssun**, **Priapurl**, **Mulhessen**, **Tejarn Hills**, and **Forest of Tethir** as read on this illustration. Directional arrows to places outside the map, compass letters, scale numbers, duplicate fragments and repeated labels of the same feature were excluded. Snowdown, split in both OCR attempts, was joined after visual inspection.

This is an audit of names on this particular image. It does not claim to list every Forgotten Realms settlement. Places unsupported by the printed artwork, including names that may appear in another edition or map, must not be added as exact source anchors merely because the old GIS lists them.

## Projection and checks

The file uses the existing GeoTIFF pixel-center transform from `qa/raster-sources/georeferencing.json`:

```text
longitude = 0.00418715126756829*x - 92.70543908255883
latitude  = -0.00418715126756829*y + 53.97522221562355
```

Coordinates are Toril GCS degrees using the FRIA prime meridian. x increases right, y increases down, and pixel centers start at zero. The transform belongs to the registered TIFF, not the publisher's unrectified JPG.

`qa/continuous-atlas/verify-sword-catalog.py` checks unique IDs, image bounds and formula consistency. Final integration found a half-pixel convention difference for the ten previous anchors. `tools/build-atlas-catalog.py` explicitly preserves their existing world coordinates, including Waterdeep, while retaining the reviewed native marker measurements as provenance. `build-sword-catalog.py`, `extract-sword-ocr.py`, `extract-sword-ocr2.py` and `detect-sword-dots.py` preserve the extraction and review inputs. All new reads and writes use UTF-8, and Python invocations used `-X utf8`.

No runtime files, production assets, Foundry documents, scene coordinates or campaign state changed during this source audit.
