# Clean continental map and Sword Coast source search

Checked 2 October 2026.

## Clean Faerun asset ready

Adam Whitehead's [20 April 2020 creator post](https://atlasoficeandfireblog.wordpress.com/2020/04/20/a-new-map-of-the-forgotten-realms/) publishes his completed terrain base without roads, symbols, or place text. His [June release](https://atlasoficeandfireblog.wordpress.com/2020/06/10/a-new-map-of-faerun/) links back to that blank version. The [original PNG](https://atlasoficeandfireblog.wordpress.com/wp-content/uploads/2020/04/faerun-2020.png) is publicly downloadable, 10000 by 7510 pixels, 8.66 MB. It depicts the creator's late-2e geography, circa 1371 DR. It has a small printed distance scale in the western sea but no place labels, city dots, or roads.

Downloaded original: `qa/raster-sources/faerun-aif-2020-unlabeled-original.png`.

Ready registered output: `qa/raster-sources/faerun-clean-registered.png`, 10967 by 7510 pixels, 11.18 MB. Sidecar: `faerun-clean-registered.pgw`. Manifest: `faerun-unlabeled-calibration.json`. Four-region visual check: `faerun-clean-registration-check.jpg`.

The registration uses 1,317 affine inliers from 1,790 accepted SIFT descriptor matches. Inliers span source x103 to x9973 and y114 to y7400. RMS residual is 1.281 target pixels, median 0.767 and maximum 4.271 pixels. The transformation primarily stretches x by 1.09651675. Visual checks at the Sword Coast, Inner Sea, Thay, and Chult confirm matching coastlines and rivers. The blank source precedes the labeled edition, so small terrain additions can differ.

The output was resampled onto exactly the existing registered Faerun image grid. Its zero-based pixel-center transform is:

```text
longitude = 0.0068941782784*x - 89.8807746973124
latitude  = -0.0068941782784*y + 55.325574187428
```

The exact outer bounds in west, south, east, north order are:

```text
[-89.8842217864516, 3.553742405783204, -14.275768607238803, 55.329021276567204]
```

Use `registeredOutput.pixelCenterTransform` from the manifest for the registered PNG. The manifest's top-level transform belongs to the downloaded original. This distinction prevents a 9.65-percent horizontal registration error. Bicubic resampling preserves the full resolution, and the tiny outer sampling margin uses edge replication. Both source and output SHA-256 hashes are recorded.

## Sword Coast result

No free official label-free equivalent of the complete 2015 Sword Coast illustration, or official native-text/vector PDF of it, was verified in this search. The [publisher's download page](https://www.dndbeyond.com/resources/1782-map-of-faerun) offers high, medium, and low-resolution JPGs. It does not list a player/unlabeled variant or PDF. Searches of the publisher CDN and [artist's regional map collection](https://prints.mikeschley.com/p858006957) did not establish another freely downloadable full-region source. This is a search result, not proof that none exists.

A [fan editor's own post](https://www.reddit.com/r/DnD/comments/tkrr5n) offers a GIMP label-removal attempt and explicitly reports visible edits on close inspection. It is not an official clean master, and no image from that post was used. A separate fan PSD adds locations to the published image, which does not establish that it contains an original clean terrain layer.

The practical current choice is to retain the faithful registered Sword Coast artwork with its printed labels and use the verified clean Icewind Dale, Faerun, and Thay assets at their appropriate scales.

If later requested, a limited ImageGen experiment could target three overlapping route sections of the registered Sword Coast TIFF. These are QA batches, not a promise to clean the whole 60-megapixel image in three calls:

| Region | Native crop bounds x0,y0,x1,y1 | Main challenge |
| --- | --- | --- |
| Icewind Dale through Luskan and Neverwinter | 3200,0,5000,1600 | Labels crossing mountains and tiny northern lakes |
| Neverwinter through Waterdeep and Daggerford | 3500,1200,5400,3000 | Dense road, coastline, and forest detail |
| Daggerford through Baldur's Gate | 4400,2800,6400,4800 | Town names and region labels over plains and woodland |

Each edit should remove only text and its printed halo, retain city markers and all visible terrain, then be geometrically matched back to the unchanged crop. Composite accepted changes through reviewed text masks only. The full raster dimensions and geotransform must remain unchanged. Coastlines, rivers, road junctions, and unmasked terrain require comparison before accepting an edit; text-obscured terrain would still be reconstructed rather than recovered. No ImageGen edits were run in this research pass.
