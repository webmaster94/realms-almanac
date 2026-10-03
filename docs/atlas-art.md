# Realmspace atlas artwork

The planetary models, meshes, solar shaders, ring material and procedural surface maps are original module assets. `tools/build-planets.py` bakes seamless spherical color maps at 4096 x 2048, with relief and roughness maps at 2048 x 1024. Lower resolution color maps are used for the system overview. High resolution maps load when a body is opened.

`tools/build-globe.py` adds material variation to the GIS-derived Toril surface. It preserves the coastline geometry and source elevation map. Its ocean and ground grain are decorative material detail, not surveyed bathymetry or newly asserted geography. The flat world atlas retains the separate cartographic surface.

## Nebula background

Saved asset: `assets/planets/realmspace-nebula.png`.

Generated on 2 October 2026 with the built-in image generation tool, not the API/CLI fallback. The original generated PNG is used without repainting or compositing.

Prompt:

> Use case: stylized-concept. Asset type: original seamless panoramic space environment texture for an interactive fantasy solar-system atlas, 2:1 landscape, ideally 4096x2048. Create an exquisite deep-space nebula starfield background with cinematic astronomical detail: layered indigo and midnight-blue interstellar dust, restrained violet and teal emission wisps, countless tiny distant stars in varied brightness, intricate wispy structure and dark dusty voids. The center of the image is dark navy negative space where interactive planets and a central golden sun will be rendered separately. More luminous clouds sweep diagonally around the outer thirds; the nebula must feel vast, delicate and volumetric, never like colorful smoke blobs. Make the background moderately dark overall so foreground planets remain prominent. High-quality fantasy astronomy art with believable fine dust and tiny stellar clusters. This is the background ONLY: no planets, no sun, no rings, no orbital paths, no large bright lens flares, no text, labels, borders, logos, symbols, UI or watermark. Horizontal edges should blend for wrapping around a sky sphere. Original artwork, no reproduction of any game screenshot.

The nebula is decorative. It is not claimed as a canonical star chart or a depiction of a named Realmspace nebula.

## Reference material

Ember's working cosmos and world maps were inspected in the local test world as quality references. No Ember artwork or code is included in this module.

The official *Spelljammer Academy* chart, the classic *Realmspace* chart and Adam Whitehead's 2023 diagram informed the system layout. Their images are not distributed with the module. See [lore and source verification](atlas-research.md).

Toril textures retain the separate terms and attribution in [the Toril notice](../assets/toril/NOTICE.md). The regional scene image is supplied by the campaign and stays in its Foundry installation.

## Anadia and Selune surface artwork

Saved assets: `assets/planets/anadia-albedo.png` and `assets/planets/selune-albedo.png`. Both were generated with the built-in image tool on 2 October 2026. Native output is 1774 x 887. The original PNGs replace the earlier procedural color textures on these two bodies. Their luminance also provides small illustrative bump/displacement detail; this is an artistic interpretation, not a measured height field.

Anadia prompt:

> Use case: stylized-concept. Create a production-quality planetary ALBEDO TEXTURE, a flat equirectangular 2:1 rectangular map for wrapping onto a 3D sphere. It must NOT depict a sphere, horizon, perspective view, landscape scene, stars, space, text, frame or UI. Subject: Anadia, an amber terrestrial fantasy planet whose scorching ochre and russet equatorial deserts are cut by enormous branching canyon systems and eroded plateaus, with dark olive and moss green habitable terrain restricted to both polar ends. Art direction: believable high-resolution orbital geology, richly detailed sedimentary strata, alluvial fans, dry basins, rough stone, fine branching tributary ravines, intricate erosion. The geological forms should have natural variation at many scales. Canyons are broad terrain depressions and branching erosion networks, NOT an all-over pattern of black cracks or cellular outlines. Green polar regions fade irregularly into the arid mid-latitudes, not straight stripes. Seamless horizontal wrap; maintain continuity at the left and right edges. Uniform ambient illumination across the entire map, no cast shadows or directional light, no atmosphere or clouds, since realtime 3D lighting will be applied. Fill the entire image with the flat planetary map. No Earth geography, no recognizable terrestrial continents. Maximum available detail and resolution, 4096 by 2048 preferred.

Selune prompt:

> Use case: stylized-concept. Create a high-detail planetary surface ALBEDO TEXTURE: a perfectly flat equirectangular map, 2:1 landscape rectangle, made to wrap onto a 3D moon sphere. Subject: the illusory barren face of Selune, a fantasy moon. Fill the ENTIRE rectangle with lunar terrain in natural silver-gray, chalk, ash and subtle warm stone tones. Many overlapping impact craters of varied sizes with recognizable circular rims, central peaks in some larger craters, finely fractured highlands, long ejecta rays, ancient worn basins, patches of darker basaltic plains and fine dusty regolith. Dramatic variation of geological scale; dense crisp small craters and a few broad ancient basins. Original geography, do not reproduce Earth's Moon or its recognizable mare shapes. This must be a flat, evenly lit overhead material map, no sphere, no horizon, no perspective, no atmosphere, no stars, no sky, no text, labels, borders, UI or watermark. No directional shadows or bright spot; use only subtle local relief cues suitable for realtime PBR lighting. Horizontal edges should join seamlessly. Top and bottom are poles of the sphere. Realistic detailed orbital geology with crisp crater structure rather than blurry cloud-like noise. Maximum available resolution; 4096x2048 preferred.

## Illustrated world atlas and terrain symbols

The 0.5 atlas uses the pinned GIS coastline, water, forest, settlement and elevation data. World-scale cartography has an 8192 x 4096 master, a 4096 x 2048 overview and 128 detail tiles. At regional scale, normalized vector paths and canvas material patterns keep coastlines and rivers sharp. Elevation and forest masks determine where terrain symbols are placed. Symbols represent terrain areas rather than a counted inventory of individual peaks or trees. Ocean contour rings are decorative coastal bands, not surveyed depths.

Saved original artwork: `assets/atlas/terrain-symbols.png`, 1774 x 887 with transparency. Generated with the built-in image tool on 2 October 2026. The PNG is preserved unchanged and its eight cells are selected by the map renderer. This original symbol sheet is covered by the module's artwork license; GIS-derived cartography retains the Toril notice's separate terms.

Prompt:

> Use case: stylized-concept. Asset type: one transparent cartographic terrain sprite sheet for a premium hand-illustrated fantasy atlas. Exactly FOUR EQUAL COLUMNS and TWO EQUAL ROWS, eight evenly spaced isolated symbols centered in their cells. Output aspect ratio 2:1. Every symbol must fit within the middle 75 percent of its cell, with generous fully transparent empty margins; no symbols touch or overlap adjacent cells. Top row: four different mountain-range clusters, each a small connected group of three to five craggy peaks viewed obliquely as on a beautifully illustrated fantasy world map. Fine warm umber ink outlines, detailed rocky hatching, parchment-ivory lit faces, desaturated taupe and gray-olive shadow faces, a little pale snow on tallest peaks. Natural irregular silhouette and variations in height, not repeated geometric triangles. Bottom row: four different dense woodland clusters viewed in the same oblique map-symbol style: mixed broadleaf forest, pine forest, mixed mature trees, dark ancient woodland. Moss, olive and sage canopies with warm brown trunks, detailed ink linework and subtle painted shading. Each forest symbol contains many overlapping trees and has an irregular organic edge. Art should look like carefully hand-drawn classic fantasy cartography, detailed but readable when reduced to 30–60 pixels wide. True transparent background around every symbol, including between trees and mountains. No ground rectangle, no scenery backdrop, no paper, no text, no labels, no borders, no numbers, no grid lines, no watermark. Original artwork.

Bral and the Tears use original geometry. The city model represents the published top/underside arrangement and major landmarks, with an authored building layout. Its close-up uses a body-aligned inspection frame; no absolute asteroid attitude or exact street plan is asserted. The lunar arc and Bral slot are a deterministic schematic, described in the research notes.
