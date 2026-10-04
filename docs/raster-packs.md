# Campaign raster packs

Raster packs keep campaign artwork separate from the public module. The world-scoped `realms-almanac.atlas.rasterManifest` URL identifies the manifest. Asset paths resolve relative to that URL. The bundled atlas remains available when no pack is configured.

## Continuous world grid

Schema version 2 uses one world layer on an equirectangular grid. Each level has `width`, `height`, `tileSize`, `gutter`, a filename `template` containing `{x}` and `{y}`, and optional `coverage` rectangles of inclusive tile indices `[x0,y0,x1,y1]`. Levels increase in resolution. The renderer requests only available tiles and keeps the preceding resolution visible while finer tiles load. Gutters contain neighboring pixels to avoid cracks during canvas scaling. The cache retains at most 360 images per view.

Every level samples the same registered composite. Zooming changes resolution without switching to a different illustration or geographic coordinate system. The private campaign build uses a 12,288 by 9,216 Faerun master assembled from overlapping tiles, an overview for the rest of Toril, and recovered Thay terrain at native detail. Empty ocean cells use shared painted water and source silhouettes. The world view blends the outer margin of the Thay image into a reviewed surrounding-terrain painting. The regional view retains the native 7,200 by 7,800 image frame in lossless tiles, with source PDF labels rendered separately.

A level may provide `overrides`, mapping `"x,y"` to a tile URL. This supports partial uploads: the template can reference an earlier immutable pack while changed cells use new files. Coverage, coordinates and resolution remain identical. The release build verifies every resolved reference across both packs.

`resolutionZones` describe actual source pixels per degree within geographic bounds. Zoom limits follow those values, rather than the dimensions of upsampled tiles. Sources differ in available detail. Fine terrain added outside original regional maps is illustrative.

## Shared labels and search

The top-level `catalog` supplies both map labels and search results. Each entry has a stable `id`, `name`, `kind`, longitude and latitude. Display fields include `rank`, `minZoom`, optional `maxZoom`, and `preciseMarker`. Countries, regions, water, rivers, terrain and settlements have different typography. Geographic labels and text-only settlement anchors have no settlement dot. Collision handling follows label priority.

The catalog does not depend on which image tiles have loaded. A settlement keeps the same coordinate through every zoom level. A same-named city and jurisdiction remain distinct records; a jurisdiction can be `searchOnly` to avoid an apparent second city label. The current Thay pack uses clean terrain and decoded native PDF labels at every scale. Measured settlement anchors can have dots; native text-center anchors cannot. Legacy printed-label suppression remains available for older packs.

The source catalogs record reviewed text, measured markers and GIS geometry separately. Unverified OCR candidates are excluded. See [the geographic label audit](continuous-atlas-label-audit.md) and [the Sword Coast anchor audit](continuous-atlas-source-anchors.md).

## Calibration and party position

The atlas setting's `regional` object contains the linked scene and token, an optional pack `sourceId`, and optional `calibration`. A calibration has native `width` and `height` and either an affine transform `[a,b,c,d,e,f]` or a triangular mesh. Affine coordinates are `longitude = a*x+b*y+c` and `latitude = d*x+e*y+f`. Mesh vertices contain `[x,y,longitude,latitude]`; triangles contain three vertex indices.

The linked token's center determines the regional party position. Calibration converts it to world coordinates. Opening, zooming or rebuilding the atlas never moves the token. Explicit GM placement inside the calibrated area applies the inverse transform to that same token. Points outside the calibration are rejected. Linking another scene clears the old calibration and source ID.

Thay now uses the single least-squares affine defined by its 14 measured source settlements and older GIS comparison points. This preserves the former four outer corners while removing the mesh's local stretch and rotation jumps. World captions use the transformed native positions, rather than forcing the source artwork through inconsistent older city coordinates. The linked token's native position stays unchanged. See [the alignment audit](thay-alignment-audit.md) for measured distortion and source-edition differences.

Country borders are separate vector overlays. Their narrow color fade is clipped inward and fades away at world and close local scales. Water masks affect the tint without creating political borders around every lake. Only selected countries receive outlines. The ruler and scale bar share the GIS model's 6,410 km equatorial radius; great-circle measurements remain approximate surface distances on that model.

## Private build

The build requires Pillow, NumPy, SciPy and OpenCV. Source images, intermediate paintings, catalogs and output tiles remain under ignored `qa/continuous-atlas`.

1. Review source names and marker positions. Run `tools/build-politics.py`, `tools/prepare-thay-clean.py`, then `tools/build-atlas-catalog.py`.
2. Generate overlapping tiles from the registered guides with the built-in image tool. Review coastlines as well as style.
3. Run `tools/stitch-atlas.py` to register tiles and choose joins through their overlaps.
4. Run `tools/finish-atlas.py` to join the reviewed Thay surround and restore the recovered native terrain.
5. Run `tools/build-continuous-pack.py` to bake the single grid and lossless regional pyramid.
6. Inspect the assembled boundaries and multiple zoom levels in Foundry before deployment. Verify search, label anchors, failed tile loads, ruler distances and recovered regional pixels. Partial updates can use `--changed west south east north --native` to rebuild affected world tiles plus the native Thay pyramid.

Raw water-mask overlap scores can confuse ice, wetlands, rivers and map decorations. They are diagnostics, not accuracy claims or substitutes for visual review. Source maps and their derivatives are private campaign assets and are excluded from public release archives.

## Legacy packs

Schema version 1 remains supported, including ordered world layers, regional `details`, `replaceLabels`, `fadeZoom` and `requireFullView`. These settings support existing packs. New continuous packs do not use source swaps or viewport-dependent detail layers. Legacy search and drawing still share one catalog, with printed-map overlays suppressed while their image is visible.
