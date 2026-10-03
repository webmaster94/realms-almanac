# Campaign raster packs

Raster packs keep campaign artwork separate from the public module. The world-scoped `realms-almanac.atlas.rasterManifest` URL identifies the manifest. Asset paths resolve relative to that URL. The bundled atlas remains available when no pack is configured.

## Continuous world grid

Schema version 2 uses one world layer on an equirectangular grid. Each level has `width`, `height`, `tileSize`, `gutter`, a filename `template` containing `{x}` and `{y}`, and optional `coverage` rectangles of inclusive tile indices `[x0,y0,x1,y1]`. Levels increase in resolution. The renderer requests only available tiles and keeps the preceding resolution visible while finer tiles load. Gutters contain neighboring pixels to avoid cracks during canvas scaling. The cache retains at most 360 images per view.

Every level samples the same registered composite. Zooming changes resolution without switching to a different illustration or geographic coordinate system. The private 0.8 campaign build uses a 12,288 by 9,216 Faerun master assembled from overlapping tiles, an overview for the rest of Toril, and the original Thay artwork at native detail. Empty ocean cells use shared painted water and source silhouettes. The world view blends the outer margin of the Thay image into a reviewed surrounding-terrain painting. The regional view retains the complete original 7,200 by 7,800 image, including its frame and printed labels, in lossless tiles.

`resolutionZones` describe actual source pixels per degree within geographic bounds. Zoom limits follow those values, rather than the dimensions of upsampled tiles. Sources differ in available detail. Fine terrain added outside original regional maps is illustrative.

## Shared labels and search

The top-level `catalog` supplies both map labels and search results. Each entry has a stable `id`, `name`, `kind`, longitude and latitude. Display fields include `rank`, `minZoom`, optional `maxZoom`, and `preciseMarker`. Countries, regions, water, rivers, terrain and settlements have different typography. Geographic labels and text-only settlement anchors have no settlement dot. Collision handling follows label priority.

The catalog does not depend on which image tiles have loaded. A settlement keeps the same coordinate through every zoom level. A same-named city and jurisdiction remain distinct records; a jurisdiction can be `searchOnly` to avoid an apparent second city label. Printed labels in the original Thay map remain part of its image, with coarse city captions suppressed when those source labels become legible.

The source catalogs record reviewed text, measured markers and GIS geometry separately. Unverified OCR candidates are excluded. See [the geographic label audit](continuous-atlas-label-audit.md) and [the Sword Coast anchor audit](continuous-atlas-source-anchors.md).

## Calibration and party position

The atlas setting's `regional` object contains the linked scene and token, an optional pack `sourceId`, and optional `calibration`. A calibration has native `width` and `height` and either an affine transform `[a,b,c,d,e,f]` or a triangular mesh. Affine coordinates are `longitude = a*x+b*y+c` and `latitude = d*x+e*y+f`. Mesh vertices contain `[x,y,longitude,latitude]`; triangles contain three vertex indices.

The linked token's center determines the regional party position. Calibration converts it to world coordinates. Opening, zooming or rebuilding the atlas never moves the token. Explicit GM placement inside the calibrated area applies the inverse transform to that same token. Points outside the calibration are rejected. Linking another scene clears the old calibration and source ID.

Thay uses 14 measured settlement anchors and four affine-estimated corners. Its triangles are checked for folds. Interior anchors are exact under the transform; terrain between them is interpolated. Different published maps disagree about geography, so calibration is approximate campaign navigation, not a survey.

## Private build

The build requires Pillow, NumPy, SciPy and OpenCV. Source images, intermediate paintings, catalogs and output tiles remain under ignored `qa/continuous-atlas`.

1. Review source names and marker positions, then run `tools/build-atlas-catalog.py`.
2. Generate overlapping tiles from the registered guides with the built-in image tool. Review coastlines as well as style.
3. Run `tools/stitch-atlas.py` to register tiles and choose joins through their overlaps.
4. Run `tools/finish-atlas.py` to join the reviewed Thay surround and restore the original map interior.
5. Run `tools/build-continuous-pack.py` to bake the single grid and lossless regional pyramid.
6. Inspect the assembled boundaries and multiple zoom levels in Foundry before deployment. Verify search, label anchors, failed tile loads and original regional pixels.

Raw water-mask overlap scores can confuse ice, wetlands, rivers and map decorations. They are diagnostics, not accuracy claims or substitutes for visual review. Source maps and their derivatives are private campaign assets and are excluded from public release archives.

## Legacy packs

Schema version 1 remains supported, including ordered world layers, regional `details`, `replaceLabels`, `fadeZoom` and `requireFullView`. These settings support existing packs. New continuous packs do not use source swaps or viewport-dependent detail layers. Legacy search and drawing still share one catalog, with printed-map overlays suppressed while their image is visible.
