(function(global) {
  'use strict';
  
  function isX(tagName) {
    return function(throwException) {
      var el = this.el;
      var result = (el && el.tagName && (!tagName || tagName.toLowerCase() === el.tagName.toLowerCase) );

      if (!result && throwException !== false) {
        throw Error( (tagName || 'Element') + ' expected');
      }

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

  function toCanvas() {
    var el = this.el;

    isElement(el);

    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    var width = canvas.width = el.naturalWidth || el.width;
    var height = canvas.height = el.naturalHeight || el.height;

    context.drawImage(el, 0, 0, width, height);

    return canvas;
  }

  function toImage() {
    var el = this.el;
    isElement(el);

    return toPNG(toCanvas(el));
  }

  function toJPEG(quality) {
    var el = this.el;
    return rasterize(el, 'image/jpeg', quality);
  }

  function toPNG() {
    var el = this.el;
    return rasterize(el, 'image/png');
  }

  function rasterize(el, mime, quality) {
    if (!mime) {
      throw Error('No mime type specified for rasterization');
    }

    if (typeof quality === 'number' && ( quality > 1 || quality < 0 )) {
      throw Error('Invalid quality level specified');
    }

    if (typeof el === 'string') {
      var src = el;
      el = document.createElement('img');
      el.src = src;
    }

    var width = el.naturalWidth || el.width;
    var height = el.naturalHeight || el.height;
    var canvas = getCanvas(width, height);
    var context = canvas.getContext('2d');

    context.drawImage(el, 0, 0, width, height);

    var dataUri = canvas.toDataURL(mime, quality);

    return dataUri;
  }

  function invert() {
    var canvas = this.el;
    var context = canvas.getContext('2d');

    var imageData = pixelData(canvas);
    var pixels = imageData.data;
    var numPixels = pixels.length;

    // Clear the image
    context.clearRect(0, 0, canvas.width, canvas.height);

    // noprotect
    // Access and change pixel values
    for (var i = 0; i < numPixels; i += 4) {
      pixels[i] = 255 - pixels[i]; // Red
      pixels[i+1] = 255 - pixels[i+1]; // Green
      pixels[i+2] = 255 - pixels[i+2]; // Blue
    }

    // Draw image data to the canvas
    context.putImageData(imageData, 0, 0);

    return canvas;
  }

  function pixelData() {
    var canvas = this.el;
    var context = canvas.getContext('2d');

    var imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    return imageData;
  }

  function normalize() {
    var canvas = this.el;
    var context = canvas.getContext('2d');

    var imageData = pixelData(canvas);
    var pixels = imageData.data;
    var numPixels = pixels.length;

    var max = {
      r: 0,
      g: 0,
      b: 0,
      a: 0
    };

    // noprotect
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
    var context = canvas.getContext('2d');

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

    // noprotect
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
  Burlap.prototype.toImage = toImage;

  Burlap.prototype.invert = invert;
  Burlap.prototype.normalize = normalize;

  Burlap.prototype.isCanvas = isCanvas;
  Burlap.prototype.isElement = isElement;

})(this);
