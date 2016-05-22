(function(global) {
  'use strict';
  
  // Workaround for IE11 not having typed array's `reverse` method
  // Used for `flipX`
  if (!Uint32Array.prototype.reverse) {
    Uint32Array.prototype.reverse = Array.prototype.reverse;
  }

  // Helper functions

  // Get the real width of an element. Natural width gives the dimensions of the image, not the size it is being displayed at.
  function realWidth(element) {
    return element.naturalWidth || element.width;
  }

  // Get the real height of an element. Natural width gives the dimensions of the image, not the size it is being displayed at.
  function realHeight(element) {
    return element.naturalHeight || element.height;
  }

  function pixelData(canvas) {
    var context = canvas.getContext('2d');
    return context.getImageData(0, 0, canvas.width, canvas.height);
  }
  
  // Helper function that determines what kind of element an HTMLElement is.
  function isX(tagName) {
    return function (element, throwException) {
      var result = (element && element.tagName && (!tagName || tagName.toLowerCase() === element.tagName.toLowerCase));
      return result;
    };
  }

  var isElement = isX(undefined);
  var isCanvas = isX('Canvas');

  // Creates a canvas with the given width and height
  function getCanvas(width, height) {
    var canvas = document.createElement('canvas');

    canvas.width = width;
    canvas.height = height;

    return canvas;
  }

  // 'Converts' a CanvasImageSource element into a canvas with the same dimensions
  function toCanvas(element) {
    isElement(element);
    
    var width = realWidth(element);
    var height = realHeight(element);

    var canvas = getCanvas(width, height);
    canvas.getContext('2d').drawImage(el, 0, 0, width, height);

    return canvas;
  }

  // Rasterizes the current `<canvas>` to a data URI with the given mime type and quality level (if applicable)
  function rasterize(mime, quality) {
    if (!mime) {
      throw Error('No mime type specified for rasterization');
    }

    if (typeof quality === 'number' && ( quality > 1 || quality < 0 )) {
      throw Error('Invalid quality level specified');
    }

    return canvas.toDataURL(mime, quality);
  }

  // Rasterizes the current `<canvas>` to a JPEG data URI
  function toJPEG(quality) {
    return rasterize('image/jpeg', quality);
  }

  // Rasterizes the current `<canvas>` to a PNG data URI
  function toPNG() {
    return rasterize('image/png');
  }
  
  // Inverts the RGB pixels of the current `<canvas>`
  function invert() {
    for (var i = 0; i < subPixels.length; i += 4) {
      subPixels[i] = 255 - subPixels[i]; // Red
      subPixels[i+1] = 255 - subPixels[i+1]; // Green
      subPixels[i+2] = 255 - subPixels[i+2]; // Blue
    }

    context.putImageData(imageData, 0, 0);

    return this;
  }

  // Sets the opacity level for the alpha channels of the current `<canvas>`
  function opacity(level) {
    for (var i = 0; i < subPixels.length; i += 4) {
      subPixels[i + 3] = level * 255;
    }

    context.putImageData(imageData, 0, 0);

    return this;
  }

  // Normalizes the current `<canvas>` so that the image uses the entire dynamic range
  function normalize() {
    var state = {
      r: {
        max: 0,
        min: 255,
        range: undefined,
        factor: undefined
      },
      g: {
        max: 0,
        min: 255,
        range: undefined,
        factor: undefined
      },
      b: {
        max: 0,
        min: 255,
        range: undefined,
        factor: undefined
      }
    };
    
    var r,g,b,a;

    // Find max and min values for each channel
    for (var i = 0; i < subPixels.length; i += 4) {
      state.r.max = (subPixels[i]   > state.r.max ? subPixels[i]   : state.r.max);
      state.g.max = (subPixels[i+1] > state.g.max ? subPixels[i+1] : state.g.max);
      state.b.max = (subPixels[i+2] > state.b.max ? subPixels[i+2] : state.b.max);

      state.r.min = (subPixels[i]   < state.r.min ? subPixels[i]   : state.r.min);
      state.g.min = (subPixels[i+1] < state.g.min ? subPixels[i+1] : state.g.min);
      state.b.min = (subPixels[i+2] < state.b.min ? subPixels[i+2] : state.b.min);
    }
    
    state.r.range = state.r.max - state.r.min;
    state.g.range = state.g.max - state.g.min;
    state.b.range = state.b.max - state.b.min;
    
    state.r.factor = (state.r.range === 0 ? 1 : 255 / state.r.range);
    state.g.factor = (state.g.range === 0 ? 1 : 255 / state.g.range);
    state.b.factor = (state.b.range === 0 ? 1 : 255 / state.b.range);    


    for (var j = 0; j < subPixels.length; j += 4) {
      subPixels[j]   = r = (subPixels[j]   - state.r.min) * state.r.factor;
      subPixels[j+1] = g = (subPixels[j+1] - state.g.min) * state.g.factor;
      subPixels[j+2] = b = (subPixels[j+2] - state.b.min) * state.b.factor;
    }


    context.putImageData(imageData, 0, 0);

    return this;
  }

  function diffCanvas(aImg, bImg, meanSquared){
    var width = aImg.naturalWidth;
    var height = aImg.naturalHeight;

    var canvas = getCanvas(width, height);
    var context = canvas.getContext('2d');

    var aCanvas = imageToCanvas(aImg);
    var bCanvas = imageToCanvas(bImg);

    canvas.width = aCanvas.width;
    canvas.height = aCanvas.height;

    var aImageData = pixelData(aCanvas);
    var aPixels = aImageData.data;

    var bImageData = pixelData(bCanvas);
    var bPixels = bImageData.data;

    function mathFn(val) {
      if (meanSquared) {
        return Math.pow(val, 2);
      } else {
        return Math.abs(val);
      }
    }


    for (var i = 0; i < subPixels.length; i += 4) {
      subPixels[i] = mathFn(aPixels[i] - bPixels[i]); // Red
      subPixels[i+1] = mathFn(aPixels[i+1] - bPixels[i+1]); // Green
      subPixels[i+2] = mathFn(aPixels[i+2] - bPixels[i+2]); // Blue
      subPixels[i+3] = 255;
    }


    context.putImageData(imageData, 0, 0);

    var normalized = normalize(canvas);

    return normalized;
  }

  // Converts a [r,g,b] pixel to {h, s, l}  
  function rgbToHsl(pixel) {
    var r = pixel[0] /= 255;
    var g = pixel[1] /= 255;
    var b = pixel[2] /= 255;

    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var hue;
    var saturation;
    var luma = (max + min) / 2;

    if (max === min) {
      hue = saturation = 0; // achromatic
    } else {
      var d = max - min;
      saturation = (luma > 0.5 ? d / (2 - max - min) : d / (max + min));
      switch (max) {
        case r: hue = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g: hue = (b - r) / d + 2;
          break;
        case b: hue = (r - g) / d + 4;
          break;
        }
        hue /= 6;
      }

      return {
        h: hue,
        s: saturation,
        l: luma
      };
  }

  // Converts a {h, s, l} pixel to [r,g,b]
  function hslToRgb(hslPixel){
    var h = hslPixel.h;
    var s = hslPixel.s;
    var l = hslPixel.l;
    
    var r, g, b;

    function hue2rgb(p, q, t) {
      if(t < 0) t += 1;
      if(t > 1) t -= 1;
      if(t < 1/6) return p + (q - p) * 6 * t;
      if(t < 1/2) return q;
      if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return Math.round(p * 255);
    }

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      var q = (l < 0.5 ? l * (1 + s) : l + s - l * s);
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return [r, g, b];
  }

  // Converts the `<canvas>` to grayscale using ITU-R coefficients
  function grayscale() {
    // ITU-R: 0.2126 R + 0.7152 G + 0.0722 B
    // CCIR601: 0.299 R + 0.587 G + 0.114 B

    for (var i = 0; i < subPixels.length; i += 4) {
      var pixel = subPixels[i] * 0.2126 + subPixels[i+1] * 0.7152 + subPixels[i+2] * 0.0722;
      subPixels[i]   = pixel; // Red
      subPixels[i+1] = pixel; // Green
      subPixels[i+2] = pixel; // Blue
    }

    context.putImageData(imageData, 0, 0);
    
    return this;
  }

  // Reduces the saturation of the current `<cavas>` by X percent
  function saturation(percent) {
    // Fast return if the saturation won't actually change.
    if (percent === 1) {
      return this;
    }

    // Run the faster grayscale function if saturation is zero.
    if (percent === 0) {
      grayscale();
      return this;
    }

    for (var i = 0; i < subPixels.length; i += 4) {
      var pixel = subPixels[i] * 0.2126 + subPixels[i+1] * 0.7152 + subPixels[i+2] * 0.0722;
      subPixels[i]   = (pixel * (1-percent)) + (subPixels[i]   * percent); // Red
      subPixels[i+1] = (pixel * (1-percent)) + (subPixels[i+1] * percent); // Green
      subPixels[i+2] = (pixel * (1-percent)) + (subPixels[i+2] * percent); // Blue
    }

    context.putImageData(imageData, 0, 0);
    
    return this;
  }

  // Crops the current `<canvas>` to the given width and height starting at x,y.
  function crop(x, y, width, height) {
    var croppedCanvas = getCanvas(width, height);
    var croppedContext = croppedCanvas.getContext('2d');
    
    croppedContext.drawImage(canvas, x, y, width, height, 0, 0, width, height);
    el = canvas = croppedCanvas;

    return this;
  }

  // Resizes the `<canvas>` relatively to the set width and height. Resizes in absolute pixels if `absoluteSize` == true.
  function resize(width, height, absoluteSize) {
    var aspectRatio = canvas.width / canvas.height;

    switch (arguments.length) {
      case 1:
          height = (absoluteSize ? width / aspectRatio : width);
        break;
      case 2:
        if (typeof height === 'boolean') {
          absoluteSize = height;
          height = width;
        }
        break;
      case 3:
        break;
    }

    var finalWidth  = (absoluteSize ? width  : width  * canvas.width);
    var finalHeight = (absoluteSize ? height : height * canvas.height);
    
    var resizedCanvas = getCanvas(finalWidth, finalHeight);
    var resizedContext = resizedCanvas.getContext('2d');
    
    resizedContext.drawImage(canvas, 0, 0, finalWidth, finalHeight);
    el = canvas = resizedCanvas;

    return this;
  }

  // Converts the `<canvas>` to a 1-bit image dividing pixels at the given threshold. Threshold will automatically be determined using Otsu's method if no threshold is provided.
  function threshold(EightBitThreshold) {
    var thresh = EightBitThreshold || otsu(histogram(canvas), subPixels.length);

    for (var i = 0; i < subPixels.length; i += 4) {
      var grayscalePixel = subPixels[i] * 0.2126 + subPixels[i + 1] * 0.7152 + subPixels[i + 2] * 0.0722;
      var binarizedPixel = Math.round(grayscalePixel > thresh ? 255 : 0);
      subPixels[i] = subPixels[i + 1] = subPixels[i + 2] = binarizedPixel;
      subPixels[i + 3] = 255;
    }

    context.putImageData(imageData, 0, 0);

    return this;
  }

  // Otsu method of determining the ideal threshold level for binarization
  function otsu(histogram, pixelsNumber) {
    var sum = 0;
    var sumB = 0;
    var wB = 0;
    var wF = 0;
    var mB;
    var mF;
    var max = 0;
    var between;
    var threshold = 0;
  
    for (var i = 0; i < 256; ++i) {
      wB += histogram[i];

      if (wB === 0) { continue; }

      wF = pixelsNumber - wB;
    
      if (wF === 0) { break; }
    
      sumB += i * histogram[i];
      mB = sumB / wB;
      mF = (sum - sumB) / wF;
    
      between = wB * wF * Math.pow(mB - mF, 2);
      if (between > max) {
        max = between;
        threshold = i;
      }
    }
    return threshold;
  }

  // Returns an array with the luma histogram of the `<canvas>`
  function histogram() {
    var hist = [];
    var i;

    for (i = 0; i < 256; ++i) {
      hist[i] = 0;
    }

    var r;
    var g;
    var b;
    var gray;

    for (i = 0; i < subPixels.length; i += 4) {
      r = imageData.data[i];
      b = imageData.data[i + 1];
      g = imageData.data[i + 2];
      gray = r * 0.2126 + g * 0.07152 + b * 0.0722;

      hist[Math.round(gray)] += 1;
    }

    return hist;
  }

  // Flips the `<canvas>` along both the x and y axis
  function flipXY() {
    // Create a new 32-bit array to access whole pixels at a time
    var pixels = new Uint32Array(subPixels.buffer);

    pixels.set(pixels.reverse());

    context.putImageData(imageData, 0, 0);

    return this;
  }

  // Flips the `<canvas>` along the x axis
  function flipX() {
    // Create a new 32-bit array to access whole pixels at a time
    var pixels = new Uint32Array(subPixels.buffer);
    
    // Reverse each row one at a time and set it to the array
    for (var i = 0, l = subPixels.length / 4; i < l; i += canvas.width) {
      pixels.set(
        pixels.subarray(i, i + canvas.width).reverse(),
        i
      );
    }

    context.putImageData(imageData, 0, 0);

    return this;
  }

  // Flips the `<canvas>` along the y axis
  function flipY() {
    flipX();
    flipXY();

    return this;
  }

  // Set some 'global' variables
  var el;
  var canvas;
  var context;
  var imageData;
  var subPixels;

  // Constructor
  function Burlap(CanvasImageSource) {
    el = null;
    canvas = null;
    context = null;

    imageData = null;
    subPixels = null;

    function BurlapConstructor(element) {
      el = element;
      canvas = toCanvas(el);
      context = canvas.getContext('2d');

      imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      subPixels = imageData.data;
    }
    BurlapConstructor.prototype = Burlap.prototype;

    return new BurlapConstructor(CanvasImageSource);
  }

  global.Burlap = Burlap;
  
  Burlap.prototype.toCanvas = toCanvas;
  Burlap.prototype.toPNG = toPNG;
  Burlap.prototype.toJPEG = toJPEG;
  
  Burlap.prototype.invert = invert;
  Burlap.prototype.normalize = normalize;
  Burlap.prototype.opacity = opacity;
  Burlap.prototype.grayscale = grayscale;
  Burlap.prototype.saturation = saturation;
  Burlap.prototype.crop = crop;  
  Burlap.prototype.resize = resize;
  Burlap.prototype.threshold = threshold;
  Burlap.prototype.flipX = flipX;
  Burlap.prototype.flipY = flipY;
  Burlap.prototype.flipXY = flipXY;
  // rotate

})(this);
