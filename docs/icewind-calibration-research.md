# Icewind Dale detail-map calibration

Checked 2 October 2026. The implementation data is `qa/raster-sources/icewind-calibration.json`. The repeatable fit is `qa/raster-sources/calibrate-icewind.py`. These are private campaign research assets.

The [official player map](https://media.dndbeyond.com/compendium-images/idrotf/7Av7Gi2DxDtdzZPt/map-2.1-icewind-dale-player.jpg) and [official labeled counterpart](https://media.dndbeyond.com/compendium-images/idrotf/7Av7Gi2DxDtdzZPt/map-2.1-icewind-dale.jpg) use the same 6000 by 4215 pixel geometry. SIFT matching at quarter size yielded 2,355 accepted matches, all affine inliers. Their identity displacement was 0.073 native pixels RMS. Town marker coordinates can therefore transfer directly to the player map.

All ten town dots were checked visually, then refined with constrained circle detection. See `qa/raster-sources/icewind-town-centers-verified.jpg`. The earlier candidate for Dougan's Hole was incorrect. Its actual marker is at 2112.5, 2766.5, about 99 pixels east of the candidate. Native marker picking uncertainty is approximately three pixels. Use these positions for detail-layer labels.

The global calibration matches nine manually interpreted lake-shore and river features to the [pinned registered Sword Coast raster](https://media.githubusercontent.com/media/geospatial-grimoire/forgotten-realms-rasters/15fc3e452a8c6ad4061c8f61a7aadae862923938/3-modern-wotc/WotC%20-%20Sword%20Coast%20Map%202015_5E.tif). The target transform is read from the existing `georeferencing.json`, whose values were extracted from this GeoTIFF. `qa/raster-sources/icewind-calibration-controls.jpg` displays the paired controls. The illustrations have different shore shapes and generalization; these are interpreted counterparts, not surveyed control points.

A Huber affine fit, with a three-target-pixel loss scale, has 5.09 target-pixel RMS residual and a 9.23-pixel maximum. Leaving each control out in turn produces 8.42-pixel RMS and a 13.24-pixel maximum. One target pixel is 0.0041871513 Toril degrees. The residual RMS is therefore 0.02132 degrees. This measures agreement between illustrations, not independent geographic accuracy. A practical interior placement allowance is 0.06 degrees. Northern terrain, the far western coast, southern mountains and the map's corners extend beyond the controls, so uncertainty can be larger there.

For zero-based pixel centers, the chosen transform is:

```text
longitude = 0.00027449225550885836*x + 0.00016126705065708948*y - 78.27279558689938
latitude  = -0.000028879604569678576*x - 0.0003419369112722522*y + 53.97080233696418
```

The fit includes shear. A piecewise warp could force each of the nine picked points to agree exactly but would not demonstrate accuracy between them. One reproducible approximate affine is preferable for this sparse evidence. The manifest supplies outer corner coordinates, an enclosing bounding box, all controls, residuals, leave-one-out errors, and native town positions with derived world coordinates.

Bryn Shander becomes longitude -77.35368, latitude 53.09921 on this registered artwork. The [older GIS settlement point](https://downloads.geospatial-grimoire.com/toril-gis/packages/2026-09-24_1/geojson/srf_civ_populated_places_pt.geojson) is longitude -76.88194, latitude 53.27719. Its displacement is approximately 0.472 degrees east and 0.178 degrees north of the artwork-based position. That older point must not replace the native town dot. Suppress a duplicate coarse-layer Bryn Shander label when the detail layer is active.

Kelvin's Cairn was excluded because the Sword Coast text obscures the summit and its mountain icon does not identify a precise common point. Redwaters is covered by the Sword Coast Ten-Towns label. The [GIS lake polygons](https://downloads.geospatial-grimoire.com/toril-gis/packages/2026-09-24_1/geojson/srf_nat_lakes_pg.geojson) use older shapes, so their centroids were not treated as shoreline landmarks. No Foundry state, party positions, public application code, or purchased assets were changed.
