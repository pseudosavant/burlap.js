(function(global) {
  'use strict';
  
  function realWidth(el) {
    return el.naturalWidth || el.width;
  }

  function realHeight(el) {
    return el.naturalHeight || el.height;
  }
  
  function isX(tagName) {
    return function(el, throwException) {
      var result = (el && el.tagName && (!tagName || tagName.toLowerCase() === el.tagName.toLowerCase) );
      return result;
    }    
  }

  var isElement = isX(undefined);
  var isCanvas = isX('Canvas');

  function getCanvas(width, height) {
    var canvas = document.createElement('canvas');

    canvas.width = width;
    canvas.height = height;

    return canvas;
  }

  function toCanvas(el) {
    el = el || this.el;

    isElement(el);
    
    var width = realWidth(el);
    var height = realHeight(el);

    var canvas = getCanvas(width, height);

    toContext(canvas).drawImage(el, 0, 0, width, height);

    return canvas;
  }
  
  function toContext(canvas) {
    return canvas.getContext('2d');
  }

  function rasterize(elementOrString, mime, quality) {
    var el;
    
    if (!mime) {
      throw Error('No mime type specified for rasterization');
    }

    if (typeof quality === 'number' && ( quality > 1 || quality < 0 )) {
      throw Error('Invalid quality level specified');
    }

    if (typeof elementOrString === 'string') {
      el = document.createElement('img');
      el.src = elementOrString;
    } else {
      el = elementOrString;
    }

    var width = realWidth(el);
    var height = realHeight(el);
    var canvas = getCanvas(width, height);
    var context = toContext(canvas);

    context.drawImage(el, 0, 0, width, height);

    var dataUri = canvas.toDataURL(mime, quality);

    return dataUri;
  }

  function toJPEG(quality) {
    return rasterize(this.el, 'image/jpeg', quality);
  }

  function toPNG() {
    return rasterize(this.el, 'image/png');
  }
  
  function invert() {
    var canvas = this.el = (isCanvas(this.el) ? this.el : toCanvas(this.el));
    var context = toContext(canvas);
    
    var imageData = pixelData(canvas);
    var pixels = imageData.data;
    var numPixels = pixels.length;

    // Clear the image
    // context.clearRect(0, 0, canvas.width, canvas.height);

    // Access and change pixel values
    for (var i = 0; i < numPixels; i += 4) {
      pixels[i] = 255 - pixels[i]; // Red
      pixels[i+1] = 255 - pixels[i+1]; // Green
      pixels[i+2] = 255 - pixels[i+2]; // Blue
    }

    // Draw image data to the canvas
    context.putImageData(imageData, 0, 0);
    
    return this;
  }

  function opacity(level) {
    var canvas = this.el = (isCanvas(this.el) ? this.el : toCanvas(this.el));
    var context = toContext(canvas);
    
    var imageData = pixelData(canvas);
    var pixels = imageData.data;
    var numPixels = pixels.length;

    // Clear the image
    // context.clearRect(0, 0, canvas.width, canvas.height);

    // Access and change pixel values
    for (var i = 0; i < numPixels; i += 4) {
      pixels[i+3] = level * 255;
    }

    // Draw image data to the canvas
    context.putImageData(imageData, 0, 0);
    
    return this;
  }

  function pixelData(canvas) {
    var context = toContext(canvas);
    return context.getImageData(0, 0, canvas.width, canvas.height);
  }

  function normalize() {
    var canvas = this.el = (isCanvas(this.el) ? this.el : toCanvas(this.el));
    var context = toContext(canvas);

    var imageData = pixelData(canvas);
    var pixels = imageData.data;
    var numPixels = pixels.length;

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
    for (var i = 0; i < numPixels; i += 4) {
      state.r.max = (pixels[i]   > state.r.max ? pixels[i]   : state.r.max);
      state.g.max = (pixels[i+1] > state.g.max ? pixels[i+1] : state.g.max);
      state.b.max = (pixels[i+2] > state.b.max ? pixels[i+2] : state.b.max);

      state.r.min = (pixels[i]   < state.r.min ? pixels[i]   : state.r.min);
      state.g.min = (pixels[i+1] < state.g.min ? pixels[i+1] : state.g.min);
      state.b.min = (pixels[i+2] < state.b.min ? pixels[i+2] : state.b.min);
    }
    
    state.r.range = state.r.max - state.r.min;
    state.g.range = state.g.max - state.g.min;
    state.b.range = state.b.max - state.b.min;
    
    state.r.factor = (state.r.range === 0 ? 1 : 255 / state.r.range);
    state.g.factor = (state.g.range === 0 ? 1 : 255 / state.g.range);
    state.b.factor = (state.b.range === 0 ? 1 : 255 / state.b.range);    

    // Access and change pixel values
    for (var j = 0; j < numPixels; j += 4) {
      pixels[j]   = r = (pixels[j]   - state.r.min) * state.r.factor;
      pixels[j+1] = g = (pixels[j+1] - state.g.min) * state.g.factor;
      pixels[j+2] = b = (pixels[j+2] - state.b.min) * state.b.factor;
    }

    // Draw image data to the canvas
    context.putImageData(imageData, 0, 0);

    return this;
  }

  function diffCanvas(aImg, bImg, meanSquared){
    var width = aImg.naturalWidth;
    var height = aImg.naturalHeight;

    var canvas = getCanvas(width, height);
    var context = toContext(canvas);

    var aCanvas = imageToCanvas(aImg);
    var bCanvas = imageToCanvas(bImg);

    canvas.width = aCanvas.width;
    canvas.height = aCanvas.height;

    var imageData = pixelData(canvas);
    var pixels = imageData.data;
    var numPixels = pixels.length;

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

    // Access and change pixel values
    for (var i = 0; i < numPixels; i += 4) {
      pixels[i] = mathFn(aPixels[i] - bPixels[i]); // Red
      pixels[i+1] = mathFn(aPixels[i+1] - bPixels[i+1]); // Green
      pixels[i+2] = mathFn(aPixels[i+2] - bPixels[i+2]); // Blue
      pixels[i+3] = 255;
    }

    // Draw image data to the canvas
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

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      function hue2rgb(p, q, t){
        if(t < 0) t += 1;
        if(t > 1) t -= 1;
        if(t < 1/6) return p + (q - p) * 6 * t;
        if(t < 1/2) return q;
        if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return Math.round(p * 255);
      }

      var q = (l < 0.5 ? l * (1 + s) : l + s - l * s);
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return [r, g, b];
  }

  function grayscale() {
    var canvas = this.el = (isCanvas(this.el) ? this.el : toCanvas(this.el));
    var context = toContext(canvas);
    
    var imageData = pixelData(canvas);
    var pixels = imageData.data;
    var numPixels = pixels.length;

    // Clear the image
    // context.clearRect(0, 0, canvas.width, canvas.height);

    // 0.2126 R + 0.7152 G + 0.0722 B ITU-R
    // 0.299 R + 0.587 G + 0.114 B CCIR601
    // Access and change pixel values
    for (var i = 0; i < numPixels; i += 4) {
      var pixel = pixels[i] * 0.2126 + pixels[i+1] * 0.7152 + pixels[i+2] * 0.0722;
      pixels[i]   = pixel; // Red
      pixels[i+1] = pixel; // Green
      pixels[i+2] = pixel; // Blue
    }

    // Draw image data to the canvas
    context.putImageData(imageData, 0, 0);
    
    return this;
  }

  function saturation(percent) {
    // Fast return if the saturation won't actually change.
    if (percent === 1) {
      return this;
    }

    var canvas = this.el = (isCanvas(this.el) ? this.el : toCanvas(this.el));
    var context = toContext(canvas);
    
    var imageData = pixelData(canvas);
    var pixels = imageData.data;
    var numPixels = pixels.length;

    // Clear the image
    // context.clearRect(0, 0, canvas.width, canvas.height);

    // Access and change pixel values
    for (var i = 0; i < numPixels; i += 4) {
      var pixel = pixels[i] * 0.2126 + pixels[i+1] * 0.7152 + pixels[i+2] * 0.0722;
      pixels[i]   = (pixel * (1-percent)) + (pixels[i]   * percent); // Red
      pixels[i+1] = (pixel * (1-percent)) + (pixels[i+1] * percent); // Green
      pixels[i+2] = (pixel * (1-percent)) + (pixels[i+2] * percent); // Blue
    }

    // Draw image data to the canvas
    context.putImageData(imageData, 0, 0);
    
    return this;
  }

  function crop(x, y, width, height) {
    var canvas = this.el = (isCanvas(this.el) ? this.el : toCanvas(this.el));
    
    var croppedCanvas = getCanvas(width, height);
    var croppedContext = toContext(croppedCanvas);
    
    croppedContext.drawImage(canvas, x, y, width, height, 0, 0, width, height);
    this.el = canvas = croppedCanvas;

    return this;
  }

  function resize(width, height, absoluteSize) {
    var canvas = this.el = (isCanvas(this.el) ? this.el : toCanvas(this.el));
    
    var width  = (absoluteSize ? width  : width  * canvas.width);
    var height = (absoluteSize ? height : height * canvas.height);
    
    var resizedCanvas = getCanvas(width, height);
    var resizedContext = toContext(resizedCanvas);
    
    resizedContext.drawImage(canvas, 0, 0, width, height);
    this.el = canvas = resizedCanvas;

    return this;
  }

  function binarize(threshold) {
    var canvas = this.el = (isCanvas(this.el) ? this.el : toCanvas(this.el));
    var context = toContext(canvas);

    var imageData = pixelData(canvas);
    var pixels = imageData.data;
    var numPixels = pixels.length;

    // Clear the image
    // context.clearRect(0, 0, canvas.width, canvas.height);

    // Access and change pixel values
    for (var i = 0; i < numPixels; i += 4) {
      var grayscalePixel = pixels[i] * 0.2126 + pixels[i + 1] * 0.7152 + pixels[i + 2] * 0.0722;
      var binarizedPixel = Math.round(grayscalePixel > threshold ? 255 : 0);
      pixels[i] = pixels[i + 1] = pixels[i + 2] = binarizedPixel;
      pixels[i + 3] = 255;
    }

    // console.log(pixels);

    // Draw image data to the canvas
    context.putImageData(imageData, 0, 0);

    return this;
  }

  function histogram(canvas) {

  }

  function flipXY() {
    var canvas = this.el = (isCanvas(this.el) ? this.el : toCanvas(this.el));
    var context = toContext(canvas);

    var imageData = pixelData(canvas);
    var pixels = imageData.data;
    var numPixels = pixels.length;

    // Clear the image
    // context.clearRect(0, 0, canvas.width, canvas.height);

    pixels.reverse();

    // Draw image data to the canvas
    context.putImageData(imageData, 0, 0);

    return this;
  }

  function flipH() {
    var canvas = this.el = (isCanvas(this.el) ? this.el : toCanvas(this.el));
    var context = toContext(canvas);

    var imageData = pixelData(canvas);
    var pixels = imageData.data;
    var numPixels = pixels.length;

    // context.clearRect(0, 0, canvas.width, canvas.height);

    var buffer = new ArrayBuffer(pixels.length);
    var ta32 = new Uint32Array(buffer);

    for (var i = 0, l = numPixels / 4; i < l; i += canvas.width) {http://localhost:52276/../test
      //new Uint32Array(buffer, i, canvas.width).reverse();
      ta32.subarray(i, canvas.width).reverse();
    }

    context.putImageData(imageData, 0, 0);

    return this;

  }

  // Constructor
  var Burlap = global.Burlap = function Burlap(el) {
    this.el = el;

    return this;
  }
  
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
  Burlap.prototype.threshold = binarize;
  Burlap.prototype.flipXY = flipBoth;
  // Burlap.prototype.flipH = flipH;
  // png8 check color depth
  // threshold calculation. Check out Otsu. https://en.wikipedia.org/wiki/Otsu%27s_method#JavaScript_implementation
  // rotate
  // flip
  // perform operations in web workers if supported
  // Investigate removing clearRect
  
})(this);
