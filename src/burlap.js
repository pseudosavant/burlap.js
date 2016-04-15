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
    var canvas = (isCanvas(this.el) ? this.el : toCanvas(this.el));
    var context = toContext(canvas);
    
    var imageData = pixelData(canvas);
    var pixels = imageData.data;
    var numPixels = pixels.length;

    // Clear the image
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Access and change pixel values
    for (var i = 0; i < numPixels; i += 4) {
      pixels[i] = 255 - pixels[i]; // Red
      pixels[i+1] = 255 - pixels[i+1]; // Green
      pixels[i+2] = 255 - pixels[i+2]; // Blue
    }

    // Draw image data to the canvas
    context.putImageData(imageData, 0, 0);
    
    this.el = canvas;
    
    return this;
  }

  function pixelData(canvas) {
    var context = toContext(canvas);
    return context.getImageData(0, 0, canvas.width, canvas.height);
  }

  function normalize() {
    var canvas = (isCanvas(this.el) ? this.el : toCanvas(this.el));
    var context = toContext(canvas);

    var imageData = pixelData(canvas);
    var pixels = imageData.data;
    var numPixels = pixels.length;

    var max = {
      r: 0,
      g: 0,
      b: 0,
      a: 0
    };

    // Access and change pixel values
    for (var i = 0; i < numPixels; i += 4) {
      max.r = (pixels[i] > max.r ? pixels[i] : max.r); // Red
      max.g = (pixels[i+1] > max.g ? pixels[i+1] : max.g); // Green
      max.b = (pixels[i+2] > max.b ? pixels[i+2] : max.b); // Blue
      max.a = (pixels[i+2] > max.a ? pixels[i+2] : max.a); // Alpha
    }

    var factor = {
      r: 255 / max.r,
      g: 255 / max.g,
      b: 255 / max.b
    };

    // noprotect
    // Access and change pixel values
    for (var j = 0; j < numPixels; j += 4) {
      pixels[j] = pixels[j] * max.r; // Red
      pixels[j+1] = pixels[j+1] * max.g; // Green
      pixels[j+2] = pixels[j+2] * max.b; // Blue
      pixels[j+3] = pixels[j+3] * max.a; // Alpha
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
})(this);
