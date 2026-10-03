# Campaign raster packs

Raster packs keep campaign artwork separate from the public module. The manifest URL is stored as `rasterManifest` in the world-scoped `realms-almanac.atlas` setting. Paths inside the manifest are resolved relative to that URL. Without a pack, the bundled atlas continues to work.

## Manifest

`schemaVersion: 1` contains ordered `layers` for the world map and `regional` sources for linked scenes. Each source has a unique `id`, native `width` and `height`, a small `preview`, and ascending-resolution `levels`. Each level has `width`, `height`, `tileSize` and a URL `template` containing `{x}` and `{y}`. Edge tiles may be smaller than the tile size.

World layers also provide `bounds` with `west`, `east`, `south` and `north` in the Toril GIS coordinate system. `minZoom` and `fadeZoom` control when detail appears. The build feathers source edges. The renderer composites each resolution into a temporary canvas before applying layer opacity, so translucent borders do not accumulate across resolutions. It loads visible tiles and retains at most 180 image entries per view.

Optional labels contain `name`, `kind`, `rank` and `minZoom`. World labels use `lon` and `lat`; regional labels use native image-edge `x` and `y`. `replaceLabels` suppresses lower layers' labels inside a detailed layer's bounds. The Sword Coast retains printed labels and suppresses the separate GIS labels there. Thay and Icewind Dale use independent labels.

## Calibration and party position

The atlas setting's `regional` object can contain `sourceId` and `calibration`. The source ID selects an entry from the pack's regional sources. Calibration contains `width`, `height`, a descriptive `name`, and either an affine transform `[a,b,c,d,e,f]` or a triangular mesh. Affine coordinates are `longitude = a*x+b*y+c` and `latitude = d*x+e*y+f`. Mesh `vertices` contain `[x,y,longitude,latitude]`; each entry in `triangles` contains three vertex indexes.

The linked token's center determines the party's regional position. The calibration converts it to world coordinates for the flat map and globe. Merely opening or recalibrating the atlas never moves the token. An explicit GM placement inside the calibrated region uses the inverse transform to move that same token. Points outside its coverage are rejected. Linking another scene clears the old calibration and source ID.

The Thay pack uses 14 measured settlement anchors plus four affine-estimated corners. Triangles follow the world-coordinate Delaunay mesh and are checked for folds. Interior anchors are exact under this transform; terrain between them is interpolated. Icewind Dale uses an approximate affine alignment. Different source maps disagree about geography, so these are campaign navigation coordinates rather than a survey.

## Artwork and builds

`tools/build-raster-pack.py` builds previews, WebP pyramids, labels and a manifest under ignored `qa/campaign-atlas`. It requires Pillow, NumPy, SciPy and OpenCV. `tools/assemble-painted-atlas.py` combines the overlapping generated Faerûn sections. `tools/bundle-raster-transfer.py` packages only files referenced by the finished manifest for authenticated transfer to Foundry.

The private pack combines original detailed regional art with a painted world overview and a 4935 x 3380 Faerûn mosaic. The mosaic uses the registered blank map as its geometric guide and twelve overlapping generated sections. Coastlines, glaciers and major terrain boundaries were visually compared with the guide; fine added terrain is illustrative. Raw water-mask metrics can confuse blue glacier shadows, wetlands and removed map decorations and are not survey accuracy claims.

Source maps and generated derivatives remain private campaign assets. They are not included in the public module or its release archive. See [source research](raster-atlas-research.md), [clean map research](clean-map-source-research.md), [Icewind Dale calibration](icewind-calibration-research.md) and [art prompts](atlas-art.md).
