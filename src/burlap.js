(function(global) {
  'use strict';
  
  // Workaround for IE11 not having typed array's `reverse` method
  if (!Uint32Array.prototype.reverse) {
    Uint32Array.prototype.reverse = Array.prototype.reverse;
  }

  function realWidth(element) {
    return element.naturalWidth || element.width;
  }

  function realHeight(element) {
    return element.naturalHeight || element.height;
  }
  
  function isX(tagName) {
    return function (element, throwException) {
      var result = (element && element.tagName && (!tagName || tagName.toLowerCase() === element.tagName.toLowerCase));
      return result;
    };
  }

  var isElement = isX(undefined);
  var isCanvas = isX('Canvas');

  function getCanvas(width, height) {
    var canvas = document.createElement('canvas');

    canvas.width = width;
    canvas.height = height;

    return canvas;
  }

  function toCanvas(element) {
    isElement(element);
    
    var width = realWidth(element);
    var height = realHeight(element);

    var canvas = getCanvas(width, height);
    canvas.getContext('2d').drawImage(el, 0, 0, width, height);

    return canvas;
  }

  function rasterize(mime, quality) {
    if (!mime) {
      throw Error('No mime type specified for rasterization');
    }

    if (typeof quality === 'number' && ( quality > 1 || quality < 0 )) {
      throw Error('Invalid quality level specified');
    }

    return canvas.toDataURL(mime, quality);
  }

  function toJPEG(quality) {
    return rasterize('image/jpeg', quality);
  }

  function toPNG() {
    return rasterize('image/png');
  }
  
  function invert() {
    for (var i = 0; i < subPixels.length; i += 4) {
      subPixels[i] = 255 - subPixels[i]; // Red
      subPixels[i+1] = 255 - subPixels[i+1]; // Green
      subPixels[i+2] = 255 - subPixels[i+2]; // Blue
    }

    context.putImageData(imageData, 0, 0);

    return this;
  }

  function opacity(level) {
    for (var i = 0; i < subPixels.length; i += 4) {
      subPixels[i + 3] = level * 255;
    }

    context.putImageData(imageData, 0, 0);

    return this;
  }

  function pixelData(canvas) {
    var context = canvas.getContext('2d');
    return context.getImageData(0, 0, canvas.width, canvas.height);
  }

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

  function grayscale() {
    // 0.2126 R + 0.7152 G + 0.0722 B ITU-R
    // 0.299 R + 0.587 G + 0.114 B CCIR601

    for (var i = 0; i < subPixels.length; i += 4) {
      var pixel = subPixels[i] * 0.2126 + subPixels[i+1] * 0.7152 + subPixels[i+2] * 0.0722;
      subPixels[i]   = pixel; // Red
      subPixels[i+1] = pixel; // Green
      subPixels[i+2] = pixel; // Blue
    }


    context.putImageData(imageData, 0, 0);
    
    return this;
  }

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

  function crop(x, y, width, height) {
    var croppedCanvas = getCanvas(width, height);
    var croppedContext = croppedCanvas.getContext('2d');
    
    croppedContext.drawImage(canvas, x, y, width, height, 0, 0, width, height);
    el = canvas = croppedCanvas;

    return this;
  }

  function resize(width, height, absoluteSize) {
    width  = (absoluteSize ? width  : width  * canvas.width);
    height = (absoluteSize ? height : height * canvas.height);
    
    var resizedCanvas = getCanvas(width, height);
    var resizedContext = resizedCanvas.getContext('2d');
    
    resizedContext.drawImage(canvas, 0, 0, width, height);
    el = canvas = resizedCanvas;

    return this;
  }

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

      if (wB === 0)
        continue;
      wF = pixelsNumber - wB;
    
      if (wF === 0)
        break;
    
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

  function histogram() {
    var hist = [];

    for (var i = 0; i < 256; ++i) {
      hist[i] = 0;
    }

    var r;
    var g;
    var b;
    var gray;

    for (var i = 0; i < subPixels.length; i += 4) {
      r = imageData.data[i];
      b = imageData.data[i + 1];
      g = imageData.data[i + 2];
      gray = r * 0.2126 + g * 0.07152 + b * 0.0722;

      hist[Math.round(gray)] += 1;
    }

    return hist;
  }

  function flipXY() {
    // Create a new 32-bit array to access whole pixels at a time
    var pixels = new Uint32Array(subPixels.buffer);

    pixels.set(pixels.reverse());

    context.putImageData(imageData, 0, 0);

    return this;
  }

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
  var Burlap = global.Burlap = (function () {
    el = null;
    canvas = null;
    context = null;

    imageData = null;
    subPixels = null;

    return function Burlap(element) {
      el = element;
      canvas = toCanvas(el);
      context = canvas.getContext('2d');

      imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      subPixels = imageData.data;
      return this;
    };
  })();
  
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
  // perform operations in web workers if supported

})(this);
