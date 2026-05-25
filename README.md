<p align="center"><img src="https://raw.githubusercontent.com/pixlcore/xyplug-image/refs/heads/main/logo.png" height="160" alt="Image Converter"/></p>
<h1 align="center">Image Converter</h1>

An [xyOps](https://xyops.io) Marketplace Event Plugin for converting, resizing, and transforming image files using the [canvas-plus](https://github.com/jhuckaby/canvas-plus) image processing library.

This Plugin processes image files from the xyOps job input, applies the selected operations, writes new image files, and attaches those files to the job output. It is designed for workflows where upstream jobs produce images, users upload images manually, or a scheduled event needs to batch-convert files into a standard format.

The Plugin runs in Docker and uses [pixl-canvas-plus](https://www.npmjs.com/package/pixl-canvas-plus), which provides JPEG, PNG, GIF, and WebP support through Node.js and Cairo-backed canvas rendering.

## Highlights

- Processes all image files passed into the xyOps job input
- Optionally resizes images before applying another operation
- Supports one selected image operation per event run, plus advanced filters via Custom Filters JSON
- Converts output to PNG, JPEG, WebP, or GIF
- Attaches generated files to the xyOps job output
- Runs locally on your xyOps worker inside Docker
- Does not require any API keys or hosted image service

## Requirements

- `docker`

This Plugin ships as a prebuilt Docker image, so every xyOps worker that may run it needs Docker installed and available to xySat.

## Environment Variables

None. This Plugin does not require any API key, token, or Secret Vault configuration.

## Data Collection

This Plugin does not collect analytics, telemetry, or usage metrics.

Image processing runs locally inside the Docker container on your xyOps worker. Files are not sent to PixlCore, OpenAI, or any other hosted service by this Plugin. If you use a remote image URL in a Composite operation, the container will fetch that URL directly as part of the job.

## Supported Input

The Plugin processes image files from `input.files`, which xyOps downloads into the job working directory before launch.

canvas-plus supports common web image formats including:

- JPEG
- PNG
- GIF
- WebP

Multiple input files are processed in one job. The same resize, operation, and output settings are applied to each file.

## Output

Generated files are written into the job working directory and attached to the xyOps job output. Attached files can be viewed in the xyOps UI, downloaded from the job details page, or passed to downstream workflow nodes.

The output filename is based on the original input filename, plus the configured filename append string, and the selected output format. For example:

```text
photo.jpg -> photo-output.png
```

## How It Works

The Plugin applies operations in this order:

1. Load each input image.
2. Apply the optional Resize step.
3. Apply the selected Image Operation tool.
4. Apply any advanced filters listed in Custom Filters.
5. Write and attach the output file.

The normal UI intentionally exposes a simple pipeline: optional resize, one selected operation, then output settings. For more complex pipelines, see [Advanced Filters](#advanced-filters).

## Parameters

### Canvas Options

Canvas Options are passed directly into canvas-plus as JSON. These include image loading, EXIF, default quantization, and format-specific encoder settings.

See the canvas-plus [Parameters](https://github.com/jhuckaby/canvas-plus#parameters) documentation for details.

### Resize

Resize is optional. When enabled, each image is resized before the selected Image Operation runs.

Supported resize controls include target width, target height, scale multiplier, resize mode, padding background, direction, alignment, offsets, and anti-aliasing.

See canvas-plus [resize](https://github.com/jhuckaby/canvas-plus#resize) documentation for details.

### Image Operation

Choose one operation to apply after optional resizing.

| Tool | Description | Documentation |
|------|-------------|---------------|
| `(None)` | Skip the optional operation step. | |
| Adjustments | Adjust brightness, contrast, color, lighting, gamma, and normalization. | [adjust](https://github.com/jhuckaby/canvas-plus#adjust) |
| Blur | Apply a fast box blur. | [blur](https://github.com/jhuckaby/canvas-plus#blur) |
| Border | Draw a border around or inside the image. | [border](https://github.com/jhuckaby/canvas-plus#border) |
| Composite | Composite another image on top of the input image. | [composite](https://github.com/jhuckaby/canvas-plus#composite) |
| Convolve | Apply a custom convolution kernel. | [convolve](https://github.com/jhuckaby/canvas-plus#convolve) |
| Crop | Crop each image down to a specific rectangular area. | [crop](https://github.com/jhuckaby/canvas-plus#crop) |
| Curves | Apply a custom tonality curve. | [curves](https://github.com/jhuckaby/canvas-plus#curves) |
| Emboss | Apply an emboss effect. | [emboss](https://github.com/jhuckaby/canvas-plus#emboss) |
| Expand | Expand the canvas around the image. | [expand](https://github.com/jhuckaby/canvas-plus#expand) |
| Find Edges | Apply an edge detection filter. | [findEdges](https://github.com/jhuckaby/canvas-plus#findedges) |
| Flatten | Flatten transparency against a background color. | [flatten](https://github.com/jhuckaby/canvas-plus#flatten) |
| Gaussian Blur | Apply a higher quality Gaussian blur. | [gaussianBlur](https://github.com/jhuckaby/canvas-plus#gaussianblur) |
| Opacity | Adjust the image opacity. | [opacity](https://github.com/jhuckaby/canvas-plus#opacity) |
| Posterize | Reduce channel tones to discrete levels. | [posterize](https://github.com/jhuckaby/canvas-plus#posterize) |
| Quantize | Reduce the image to an indexed color palette before writing PNG or GIF output. | [quantize](https://github.com/jhuckaby/canvas-plus#quantize) |
| Sharpen | Apply a sharpening convolution filter. | [sharpen](https://github.com/jhuckaby/canvas-plus#sharpen) |
| Solarize | Apply a solarize curve effect. | [solarize](https://github.com/jhuckaby/canvas-plus#solarize) |
| Temperature | Warm or cool the image colors. | [temperature](https://github.com/jhuckaby/canvas-plus#temperature) |
| Threshold | Force channel values above or below a cutoff. | [threshold](https://github.com/jhuckaby/canvas-plus#threshold) |
| Transform | Rotate, flip, or apply a custom transform matrix to each image. | [transform](https://github.com/jhuckaby/canvas-plus#transform) |
| Trim | Automatically trim matching edge pixels. | [trim](https://github.com/jhuckaby/canvas-plus#trim) |

### Advanced

The Advanced section includes a Custom Filters JSON parameter for optional multi-step pipelines.

Custom Filters should be an array of canvas-plus filter objects. See [Advanced Filters](#advanced-filters) for details and examples.

### Output

The Output section controls the generated file format and filename suffix.

Supported output formats:

- PNG
- JPEG
- WebP
- GIF

The Quality parameter applies to JPEG and WebP output. See canvas-plus [write](https://github.com/jhuckaby/canvas-plus#write) documentation for details.

## Advanced Filters

The Custom Filters JSON parameter accepts an array for advanced pipelines. Each filter object should have a `name` and `params` object. These are applied after Resize and after the selected Image Operation.

Example:

```json
[
	{
		"name": "flatten",
		"params": {
			"background": "#ffffff"
		}
	},
	{
		"name": "sharpen",
		"params": {
			"edges": "repeat",
			"channels": "rgb"
		}
	}
]
```

This is useful when you want a repeatable multi-step pipeline while keeping the main event form simple for everyday use.

## Example Workflows

### Normalize Thumbnails

Use Resize with `FitPad`, choose PNG output, and set a transparent or solid padding background. This is handy for producing uniformly sized thumbnails from source images with mixed aspect ratios.

### Convert Uploads to JPEG

Leave the Image Operation set to `(None)`, choose JPEG output, and set Quality to your preferred value. Every input image will be rewritten as JPEG and attached to the job.

### Prepare Transparent Images for Email

Choose the Flatten operation with a white background, then write JPEG output. This removes alpha transparency before handing the image to systems that do not display transparent PNGs well.

### Make Small GIF or PNG Assets

Choose Quantize, set the maximum colors, and write PNG or GIF output. This can reduce file size for simple graphics, icons, and low-color images.

## Local Testing

Install dependencies:

```sh
npm install
```

Create a temporary working directory and place a sample image in it:

```sh
mkdir -p /tmp/xyplug-image-test
cp /path/to/photo.jpg /tmp/xyplug-image-test/photo.jpg
```

Run the Plugin wrapper directly:

```sh
printf '%s\n' '{"xy":1,"cwd":"/tmp/xyplug-image-test","params":{"config":{"readEXIF":true,"autoOrient":true,"throw":true},"resize_enabled":true,"resize_width":640,"resize_height":480,"resize_mode":"fit","resize_direction":"both","resize_gravity":"center","resize_offset_x":0,"resize_offset_y":0,"resize_antialias":"good","filter_tool":"none","filters":[],"output_format":"png","output_quality":100,"output_append":"-output"},"input":{"files":[{"filename":"/tmp/xyplug-image-test/photo.jpg"}]}}' | node index.js
```

Or build and run the Docker image locally:

```sh
docker build -t xyplug-image:test .

printf '%s\n' '{"xy":1,"cwd":"/work","params":{"config":{"readEXIF":true,"autoOrient":true,"throw":true},"filter_tool":"none","filters":[],"output_format":"png","output_quality":100,"output_append":"-output"},"input":{"files":[{"filename":"/work/photo.jpg"}]}}' | \
docker run -i --rm \
	-v /tmp/xyplug-image-test:/work \
	--entrypoint node \
	xyplug-image:test /app/index.js
```

## GitHub Actions

The repository includes a workflow at `.github/workflows/docker.yml` that builds and publishes the Docker image to GitHub Container Registry on tag pushes.

The published image is:

```text
ghcr.io/pixlcore/xyplug-image:v1.0.0
```

The workflow builds both `linux/amd64` and `linux/arm64` images.

## License

MIT
