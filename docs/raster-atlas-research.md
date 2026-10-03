# Registered raster maps for the campaign atlas

Checked 2 October 2026. The files downloaded during this pass are in `qa/raster-sources`. They are campaign/reference assets, not proposed public-module payloads. No purchase, account unlock, or paywall bypass was used.

## Files ready for integration

| File in `qa/raster-sources` | Size in pixels | Purpose |
| --- | --- | --- |
| `sword-coast-2015-georeferenced.tif` | 10012 × 5989 | Registered regional raster, includes southern Icewind Dale |
| `faerun-aif-2020-georeferenced.jpg` | 10967 × 7510 | Registered continental raster |
| `faerun-aif-2020-georeferenced.jgw` | Six-line world file | Exact transform for the preceding JPG |
| `toril-aif-2023-georeferenced.png` | 10000 × 5000 | Registered global raster |
| `toril-aif-2023-georeferenced.pgw` | Six-line world file | Published transform for the preceding PNG |
| `icewind-dale-player-official.jpg` | 6000 × 4215 | Terrain without place labels, settlement dots, or routes |
| `icewind-dale-labeled-reference.jpg` | 6000 × 4215 | Matching labeled terrain for control-point placement |
| `thay-creator-preview.pdf` | One page, 864 × 936 PDF points | Creator-distributed map with native text |
| `thay-label-bounds.json` | 2046 grouped spans | Native Thay text, bounds, fonts, colors, and directions |
| `thay-registration-check.json` | Registration report | PDF-to-existing-JPEG comparison |
| `georeferencing.json` | Transform manifest | Numeric transforms, hashes, bounds, predicted city pixels |
| `icewind-dale-pixel-anchors.json` | Candidate point list | Approximate city-marker pixels, requiring visual review |

### Pinned georeferenced sources

The raster repository was inspected at commit `15fc3e452a8c6ad4061c8f61a7aadae862923938`. Its [README](https://github.com/geospatial-grimoire/forgotten-realms-rasters) describes the Toril GCS, rectification, embedded GeoTIFF metadata, and PNG/JPG sidecar world files. Many apparent images in the Git tree are only Git LFS pointer files; download the media endpoint for raster bytes.

- [Sword Coast 2015 GeoTIFF, 194.7 MB](https://media.githubusercontent.com/media/geospatial-grimoire/forgotten-realms-rasters/15fc3e452a8c6ad4061c8f61a7aadae862923938/3-modern-wotc/WotC%20-%20Sword%20Coast%20Map%202015_5E.tif)
- [Faerun 2020 JPG, 7.8 MB](https://media.githubusercontent.com/media/geospatial-grimoire/forgotten-realms-rasters/15fc3e452a8c6ad4061c8f61a7aadae862923938/4-community/AIF%20%282020%29%20-%20Faerun_v2.jpg)
- [Faerun matching JGW](https://raw.githubusercontent.com/geospatial-grimoire/forgotten-realms-rasters/15fc3e452a8c6ad4061c8f61a7aadae862923938/4-community/AIF%20%282020%29%20-%20Faerun_v2.jgw)
- [Toril 2023 PNG, 6.6 MB](https://media.githubusercontent.com/media/geospatial-grimoire/forgotten-realms-rasters/15fc3e452a8c6ad4061c8f61a7aadae862923938/4-community/AIF%20%282023%29%20-%20Toril.png)
- [Toril matching PGW](https://raw.githubusercontent.com/geospatial-grimoire/forgotten-realms-rasters/15fc3e452a8c6ad4061c8f61a7aadae862923938/4-community/AIF%20%282023%29%20-%20Toril.pgw)

The repository's Toril PNG is a rectified 10000 × 5000 image. It is not the creator's original 9864 × 5626 file. Likewise, the Faerun image and Sword Coast TIFF have undergone registration. Do not attach their transforms to a similarly named original image from another source.

The artist and publisher provenance remains separate from the georeferencing work. Adam Whitehead created the AIF maps. Wizards published the Sword Coast artwork. The raster repository's availability does not grant a universal right to republish those images. Its use conditions and the previously documented creator links remain relevant to private campaign integration.

## Exact transforms

The coordinates use degrees in the Toril GCS with the FRIA prime meridian. This is not the Myth Drannor longitude convention. See the [creator's CRS explanation](https://www.geospatial-grimoire.com/blog/2024-11-09-crafting-coordinate-systems-for-faerun-and-beyond/).

World files use line order `A, D, B, E, C, F`. For pixel-center indices beginning at zero:

```text
longitude = A * column + B * row + C
latitude  = D * column + E * row + F
```

`C,F` locate the center of the upper-left pixel. They are not the outer corner. [Esri world-file documentation](https://doc.esri.com/en/arcgis-pro/latest/help/data/imagery/world-files-for-raster-datasets.html)

| Raster | A | E | C | F |
| --- | ---: | ---: | ---: | ---: |
| Sword Coast, converted to pixel centers | 0.00418715126756829 | -0.00418715126756829 | -92.70543908255882 | 53.97522221562356 |
| Faerun, published JGW | 0.0068941782784 | -0.0068941782784 | -89.8807746973124 | 55.3255741874280 |
| Toril, published PGW | 0.036 | -0.036 | -180 | 90 |

All three have `B=D=0`.

Sword Coast's TIFF has `PixelIsArea`, pixel scale 0.00418715126756829 degrees, and an embedded tie point at the upper-left outer corner `[-92.7075326581926, 53.97731579125734]`. Its outer extent is west -92.7075326582, east -50.7857741673, south 28.9004668498, north 53.9773157913. The metadata names `Toril GCS`, `Toril` datum/ellipsoid, and `FRIA` prime meridian. These values were read directly from the downloaded TIFF tags.

Faerun's outer extent, using the world-file convention, is west -89.8842217865, east -14.2757686072, south 3.5537424058, north 55.3290212766.

Toril's published PGW has a half-pixel convention ambiguity. Interpreted literally as pixel centers, its outer edges are west -180.018, east 179.982, north 90.018, south -89.982. A renderer that instead declares exact global edges of -180/+180 and -90/+90 shifts alignment by half a pixel. Document that decision and apply it consistently to labels and party positions. Do not silently combine the two interpretations.

`georeferencing.json` records these transforms, file hashes, and expected pixel positions for known cities derived from the existing GIS. Those predicted points help verify alignment, but are not independent measurements of dots on the raster.

## Thay: use native text instead of OCR

The existing `qa/thay.jpg`, 7200 × 7800, matches Rob McCaleb's map distributed as **Map of Thay**, DMsGuild product 181402. The creator now uses the portfolio name Tai Flowers/Rob McCaleb. [Creator portfolio](https://robmccaleb.artstation.com/projects/1nqOm8), [creator's 2016 release announcement](https://candlekeep.com/forum/topic.asp?TOPIC_ID=20946&whichpage=1), [store page](https://www.dmsguild.com/product/181402/Map-of-Thay)

The [public creator/store preview PDF](https://d1vzi28wh99zvq.cloudfront.net/pdf_previews/181402-sample.pdf) is 52 MB and contains native text. Its page is 864 × 936 points, matching the JPEG's 12:13 aspect. Multiply PDF coordinates by `7200/864 = 8.3333333333` to obtain the corresponding original JPEG coordinates.

The match was checked computationally against the existing JPEG preview. A 1536 × 1664 PDF render and the 1662 × 1800 JPEG preview produced 2528 accepted SIFT correspondences, of which 2485 agreed with one homography. The transform is effectively the expected uniform resize, with subpixel translation in preview space. The title, northern Surthay area, central Eltabbar/lake, and southern Bezantur coastline all belong to the same layout. This is image-registration evidence, not a claim that the source files are byte-identical.

Native label bounds provide widely separated alignment checks. Coordinates below are PDF points, and refer to text, not city dots.

| Label | x0 | y0 | x1 | y1 |
| --- | ---: | ---: | ---: | ---: |
| Surthay | 348.3491 | 58.8614 | 373.5251 | 68.2374 |
| Eltabbar | 547.0195 | 381.9512 | 574.3802 | 391.3272 |
| Bezantur | 397.2866 | 716.6416 | 426.3177 | 726.0176 |
| Pyarados | 632.8203 | 591.3585 | 661.8684 | 600.7344 |

Extraction found 3422 raw text spans, grouped into 2046 after merging identical text whose bounds differ by less than 0.5 point. The JSON preserves each styling run, including its color, size, font, direction, and rotation. Some curved labels are separate letters, and source small-cap glyphs sometimes extract into the private-use Unicode range. A span count is not a count of unique map locations.

The fonts are Adobe Jenson variants, a decorative title font, and Helvetica. No marker-symbol font was found. A search of the 204 vector drawings found no small circle paths near the inspected Bezantur, Eltabbar, and Surthay labels; settlement marks appear to be part of the image artwork rather than text. Confirm this in the stripped render before replacing dots with interactive markers.

PyMuPDF documents `add_redact_annot(..., fill=False)` for transparent redaction regions, and `apply_redactions(images=0, graphics=0, text=0)` for removing text while leaving raster and vector artwork alone. Default redaction options would damage the map, so specify all three. [PyMuPDF redaction documentation](https://pymupdf.readthedocs.io/en/latest/page.html#Page.apply_redactions) No text-stripped PDF was authored in this research pass. The parent implementation will validate that operation visually.

There is no Thay-specific raster or transform in the inspected georeferenced repository. A control-point fit is still needed between this artist's image and the Toril GIS. Use multiple settlement dots and coast/lake landmarks spread over the map, and check held-out points. Never use a label's center as the settlement's true position. The native label layer makes matching names and preserving all the small locations much easier.

## Icewind Dale: an existing unlabeled official image

These official D&D Beyond CDN images were publicly accessible and downloaded without authentication:

- [Unlabeled/player image](https://media.dndbeyond.com/compendium-images/idrotf/7Av7Gi2DxDtdzZPt/map-2.1-icewind-dale-player.jpg)
- [Matching labeled reference](https://media.dndbeyond.com/compendium-images/idrotf/7Av7Gi2DxDtdzZPt/map-2.1-icewind-dale.jpg)

Both are 6000 × 4215. Visual inspection confirms that the player image removes place names, city dots, and routes while retaining the Icewind Dale title, compass, border, and scale. It therefore avoids tilewise text inpainting for the actual terrain. Public accessibility does not establish a public redistribution license; keep it in the private campaign asset layer.

Useful matching locations are Bryn Shander, Targos, Bremen, Termalaine, Lonelywood, Caer-Konig, Caer-Dineval, Easthaven, Good Mead, and Dougan's Hole. The two JPEGs use matching pixel geometry. The candidate marker centers in `icewind-dale-pixel-anchors.json` were estimated from the labeled image and circle detection; inspect them before treating them as exact GCPs.

The current GIS's settlement layer contains Bryn Shander but not all ten settlements. It does have these geographic anchors:

| Feature | Latitude | Longitude | Interpretation |
| --- | ---: | ---: | --- |
| Bryn Shander | 53.27719 | -76.88194 | Settlement point |
| Kelvin's Cairn | 53.67917 | -76.51306 | Mountain point |
| Maer Dualdon | 53.52889 | -76.94500 | Lake polygon centroid |
| Lac Dinneshere | 53.39556 | -76.53306 | Lake polygon centroid |
| Redwaters | 53.16028 | -76.61278 | Lake polygon centroid |

Sources are the pinned Toril GIS [settlements](https://downloads.geospatial-grimoire.com/toril-gis/packages/2026-09-24_1/geojson/srf_civ_populated_places_pt.geojson), [landmarks](https://downloads.geospatial-grimoire.com/toril-gis/packages/2026-09-24_1/geojson/srf_nat_landmarks_pt.geojson), and [lake polygons](https://downloads.geospatial-grimoire.com/toril-gis/packages/2026-09-24_1/geojson/srf_nat_lakes_pg.geojson). The dataset cites FRIA 2e. Its older lake shapes may not match the 2020 illustration exactly; a lake centroid is not automatically the visual center of a label or its bounding box. A local fit should report residual error instead of silently stretching one map into another.

Mike Schley's [Side Trek 43: Icewind Dale](https://www.patreon.com/TheEpicAtlas/posts/side-trek-43-164985643) also offers a public lower-resolution 2025-era regional map, with high-resolution text-free/unlabeled versions for supporters or purchasers. Those paid files were not obtained. The [2025 Faerun atlas](https://prints.mikeschley.com/p858006957/h4cf6d1ee) offers an even larger continental option, also a purchase rather than a free asset source.

## Other accessible originals and implementation implications

The official [Sword Coast download page](https://www.dndbeyond.com/resources/1782-map-of-faerun) links [high](https://media.wizards.com/2015/images/dnd/resources/Sword-Coast-Map_HighRes.jpg), [medium](https://media.wizards.com/2015/images/dnd/resources/Sword-Coast-Map_MedRes.jpg), and [low](https://media.wizards.com/2015/images/dnd/resources/Sword-Coast-Map_LowRes.jpg) resolution JPGs. No native-text PDF or free unlabeled version was verified for this map in this pass. The registered TIFF already downloaded is the practical aligned source.

No native-text PDF was verified for Whitehead's Toril/Faerun maps either. Their creator distributions are raster images. Use the already registered variants for consistent geography; any label-removal work must preserve their dimensions and transform.

Keep source raster, geotransform, native label data, and party position separate. Generate a zoom pyramid from the registered source, and draw dynamic labels over it. Higher zoom can switch to the Icewind Dale or Thay detail layer after calibration. Upsampling can improve pixel presentation; it does not supply surveyed roads or missing settlements. Existing unlabeled art and Thay's native text layer should be used before generative reconstruction is considered.

## Follow-up recovery and registration results

The source PDF uses Illustrator transparency flattening: 8242 raster fragments, complex clipping paths, and text in clipping mode 7. Deleting text operators alone leaves dark or light rectangles; ordinary redaction also leaves flattened halos. The native-text shortcut therefore required additional recovery work rather than a simple text deletion.

The final private-campaign recovery is `qa/raster-sources/thay-native-clean-final.png`, 7200 × 7800. Existing terrain fragments were ranked by color agreement with the original map outside text bounds, then used to restore the label areas on the supplied JPEG. Narrow feathering and a targeted bright-fragment-edge pass reduce stitching seams. Its source pixel geometry is unchanged, and its metadata and hash are in `thay-native-clean-final.json`. The upper-right title cartouche remains for the parent's separately requested ImageGen patch, with source rectangle `[5610,75,7185,925]`. The native recovery itself introduced no invented geographic features.

Actual settlement-symbol measurements are in `qa/raster-sources/thay-gcps.json`: fourteen points, six assigned to fitting and eight held out, with uncertainty and crop references. Eltabbar's built-up center is approximately `[4566,3310]`; the party marker at `[4543,3300]` is about 25 source pixels away and belongs in Eltabbar. A single affine fit against the older GIS coordinates leaves errors of tens of kilometers. Use local control-point warping or an explicit regional coordinate frame rather than presenting that affine as an accurate registration.

The unregistered FRIA satellite image also fails a direct global-edge assignment against the GIS. The visual overlay is saved as `qa/raster-sources/toril-satellite-gis-overlay.png`. A coarse affine diagnostic was insufficient to establish reliable global registration. Keep the registered GIS surface for the globe and registered detailed regional rasters for close zoom; do not silently place GIS city or party markers on the unregistered satellite art.
