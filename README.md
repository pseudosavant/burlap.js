# Burlap.js

## What is Burlap.js
  Burlap.js is a library that tries to make doing common `<canvas>` operations a lot easier. 
  You can think of it kind of like jQuery but for `<canvas>` instead of the DOM.

## Fluent API
  Burlap.js uses the fluent API pattern to make running multiple `<canvas>` operations much easier.

  Example:

    $img.src = Burlap(CanvasImageSource).saturation(0.5).flipXY().resize(0.5).toJPEG(0.8);

## Burlap.js operations
* Burlap.toCanvas: Returns a `<canvas>` with the current image Burlap is processing.
* Burlap.toPNG: Returns a base64 encoded PNG dataUri.
* Burlap.toJPEG([quality]): Returns a base64 encoded JPEG dataUri. Quality (0-1) can optionally be specified, otherwise it uses the browser's default quality level.
* Burlap Burlap.invert: Inverts the current `<canvas>`.
* Burlap.normalize: Normalizes the dynamic range of the current `<canvas>`.
* Burlap.opacity: Set the opacity for the entire `<canvas>`.
* Burlap.grayscale: Converts the current `<canvas>` to grayscale using the ITU-R RGB coefficients (see https://en.wikipedia.org/wiki/Rec._709#Luma_coefficients).
* Burlap.saturation(level): Desaturates the curernt `<canvas>` to the level (0-1) specified.
* Burlap.crop(x, y, width, height): Crops the current `<canvas>` to the given width and height starting at x,y 
* Burlap.resize(width, height, [absoluteSize]): Resizes the current `<canvas>`. `width` and `height` are relative values by default. `width` and `height` are absolute values if `absoluteSize` is set to `true`.
* Burlap.threshold([threshold]): Turns the current `<canvas>` into a 2-bit image. `threshold` is automatically determined using the Otsu method but it can be set manually between 0-255.
* Burlap.flipX: Flips the current `<canvas>` along the X-axis.
* Burlap.flipY: Flips the current `<canvas>` along the Y-axis.
* Burlap.flipXY: Flip the current `<canvas>` along the x and y axis.

## Examples
You can run the test harness (/test/index.html) locally or try the [jsbin version](https://output.jsbin.com/zikani/) online to try out Burlap.js.

## Browser Support
IE11, Edge, Chrome, Firefox, Safari

## Why Burlap
Why Burlap? Burlap is a kind of canvas. Get it? Yeah, I know. Not that funny.

## License
MIT