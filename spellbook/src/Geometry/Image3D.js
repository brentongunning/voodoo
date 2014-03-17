// ----------------------------------------------------------------------------
// File: Image3D.js
//
// Copyright (c) 2014 Voodoojs Authors
// ----------------------------------------------------------------------------



/**
 * The view that loads the heightmaps and geometry for a 3D image.
 *
 * @constructor
 * @private
 * @extends {voodoo.View}
 */
var Image3DView_ = voodoo.View.extend({

  below: false,

  load: function() {
    this.base.load();

    this.scene.attach(this.model.element, false, false);

    this.loaded = false;
  },

  createMaterial: function() {
    return new THREE.MeshLambertMaterial({
      color: 0xFFFFFF,
      ambient: 0x000000,
      map: this.texture,
      transparent: this.model.transparent_,
      morphTargets: true,
      morphNormals: true
    });
  },

  computeNormals: function(geometry) {
    geometry.computeFaceNormals();
    geometry.computeVertexNormals();
    geometry.computeMorphNormals();
  },

  getDepth: function(data, i) {
    var r = data[i];
    var g = data[i + 1];
    var b = data[i + 2];
    var avg = (r + g + b) / 3.0;
    return avg / 255.0 * this.model.maxHeight_;
  },

  createSmoothGeometry: function(geometry, vertices, data, createFaces) {
    // Constants
    var width = this.model.heightmapWidth;
    var height = this.model.heightmapHeight;
    var invWidthMinusOne = 1.0 / (width - 1);
    var invHeightMinusOne = 1.0 / (height - 1);
    var stride = width * 4;

    // Vertices
    var i = 0;
    for (var y = 0; y < height; ++y) {
      for (var x = 0; x < width; ++x) {
        var depth = this.getDepth(data, i);
        vertices.push(new THREE.Vector3(
            x * invWidthMinusOne,
            y * invHeightMinusOne,
            depth));
        i += 4;
      }
    }

    // Indices
    if (createFaces) {
      var yi = 0, yi2 = width;
      for (var y = 0; y < height - 1; ++y) {
        for (var x = 0; x < width - 1; ++x) {
          var x2 = x + 1;
          geometry.faces.push(new THREE.Face3(yi + x, yi + x2, yi2 + x2));
          geometry.faces.push(new THREE.Face3(yi + x, yi2 + x2, yi2 + x));

          var u1 = x * invWidthMinusOne;
          var u2 = x2 * invWidthMinusOne;
          var v1 = y * invHeightMinusOne;
          var v2 = (y + 1) * invHeightMinusOne;

          geometry.faceVertexUvs[0].push([
            new THREE.Vector2(u1, v1),
            new THREE.Vector2(u2, v1),
            new THREE.Vector2(u2, v2)
          ]);
          geometry.faceVertexUvs[0].push([
            new THREE.Vector2(u1, v1),
            new THREE.Vector2(u2, v2),
            new THREE.Vector2(u1, v2)
          ]);
        }
        yi += width;
        yi2 += width;
      }
    }
  },

  createBlockGeometry: function(geometry, vertices, data, createFaces) {
    // Constants
    var width = this.model.heightmapWidth;
    var height = this.model.heightmapHeight;
    var invWidth = 1.0 / width;
    var invHeight = 1.0 / height;
    var widthRatio = this.texture.image.width / width;
    var heightRatio = this.texture.image.height / height;
    var invTextureWidth = 1.0 / this.texture.image.width;
    var invTextureHeight = 1.0 / this.texture.image.height;

    // Precalculate depth
    var depths = new Array(height);
    var i = 0;
    for (var y = 0; y < height; ++y) {
      var line = new Array(width);
      for (var x = 0; x < width; ++x) {
        line[x] = this.getDepth(data, i);
        i += 4;
      }
      depths[y] = line;
    }

    var v = 0;
    for (var y = 0; y < height; ++y) {
      for (var x = 0; x < width; ++x) {
        var depth = depths[y][x];
        var depthLeft = x > 0 ? depths[y][x - 1] : 0;
        var depthTop = y > 0 ? depths[y - 1][x] : 0;
        var depthRight = x < width - 1 ? depths[y][x + 1] : 0;
        var depthBottom = y < height - 1 ? depths[y + 1][x] : 0;

        var x1 = x * invWidth;
        var x2 = (x + 1) * invWidth;
        var y1 = y * invHeight;
        var y2 = (y + 1) * invHeight;

        var xr = x * widthRatio;
        var yr = y * heightRatio;
        var u1 = (xr + 0.5) * invTextureWidth;
        var u2 = (xr + widthRatio - 0.5) * invTextureWidth;
        var v1 = (yr + 0.5) * invTextureHeight;
        var v2 = (yr + heightRatio - 0.5) * invTextureHeight;

        // Front

        var j = v;
        vertices.push(new THREE.Vector3(x1, y1, depth));
        vertices.push(new THREE.Vector3(x2, y1, depth));
        vertices.push(new THREE.Vector3(x2, y2, depth));
        vertices.push(new THREE.Vector3(x1, y2, depth));

        if (createFaces) {
          v += 4;

          geometry.faces.push(new THREE.Face3(j, j + 1, j + 2));
          geometry.faces.push(new THREE.Face3(j, j + 2, j + 3));
          geometry.faceVertexUvs[0].push([
            new THREE.Vector2(u1, v1),
            new THREE.Vector2(u2, v1),
            new THREE.Vector2(u2, v2)
          ]);
          geometry.faceVertexUvs[0].push([
            new THREE.Vector2(u1, v1),
            new THREE.Vector2(u2, v2),
            new THREE.Vector2(u1, v2)
          ]);
        }

        // Left

        if (depth > depthLeft) {
          vertices.push(new THREE.Vector3(x1, y1, depthLeft));
          vertices.push(new THREE.Vector3(x1, y2, depthLeft));

          if (createFaces) {
            geometry.faces.push(new THREE.Face3(j, j + 3, v + 1));
            geometry.faces.push(new THREE.Face3(j, v + 1, v));
            geometry.faceVertexUvs[0].push([
              new THREE.Vector2(u1, v1),
              new THREE.Vector2(u1, v2),
              new THREE.Vector2(u1, v2)
            ]);
            geometry.faceVertexUvs[0].push([
              new THREE.Vector2(u1, v1),
              new THREE.Vector2(u1, v2),
              new THREE.Vector2(u1, v1)
            ]);

            v += 2;
          }
        }

        // Right

        if (depth > depthRight) {
          vertices.push(new THREE.Vector3(x2, y1, depthRight));
          vertices.push(new THREE.Vector3(x2, y2, depthRight));

          if (createFaces) {
            geometry.faces.push(new THREE.Face3(j + 2, j + 1, v + 0));
            geometry.faces.push(new THREE.Face3(j + 2, v + 0, v + 1));
            geometry.faceVertexUvs[0].push([
              new THREE.Vector2(u2, v2),
              new THREE.Vector2(u2, v1),
              new THREE.Vector2(u2, v1)
            ]);
            geometry.faceVertexUvs[0].push([
              new THREE.Vector2(u2, v2),
              new THREE.Vector2(u2, v1),
              new THREE.Vector2(u2, v2)
            ]);

            v += 2;
          }
        }

        // Top

        if (depth > depthTop) {
          vertices.push(new THREE.Vector3(x1, y1, depthTop));
          vertices.push(new THREE.Vector3(x2, y1, depthTop));

          if (createFaces) {
            geometry.faces.push(new THREE.Face3(j + 1, j, v));
            geometry.faces.push(new THREE.Face3(j + 1, v, v + 1));
            geometry.faceVertexUvs[0].push([
              new THREE.Vector2(u2, v1),
              new THREE.Vector2(u1, v1),
              new THREE.Vector2(u1, v1)
            ]);
            geometry.faceVertexUvs[0].push([
              new THREE.Vector2(u2, v1),
              new THREE.Vector2(u1, v1),
              new THREE.Vector2(u2, v1)
            ]);

            v += 2;
          }
        }

        // Bottom

        if (depth > depthBottom) {
          vertices.push(new THREE.Vector3(x1, y2, depthBottom));
          vertices.push(new THREE.Vector3(x2, y2, depthBottom));

          if (createFaces) {
            geometry.faces.push(new THREE.Face3(j + 3, j + 2, v + 1));
            geometry.faces.push(new THREE.Face3(j + 3, v + 1, v));
            geometry.faceVertexUvs[0].push([
              new THREE.Vector2(u1, v2),
              new THREE.Vector2(u2, v2),
              new THREE.Vector2(u2, v2)
            ]);
            geometry.faceVertexUvs[0].push([
              new THREE.Vector2(u1, v2),
              new THREE.Vector2(u2, v2),
              new THREE.Vector2(u1, v2)
            ]);

            v += 2;
          }
        }
      }
    }
  },

  createFloatGeometry: function(geometry, vertices, data, createFaces) {
    // Constants
    var width = this.model.heightmapWidth;
    var height = this.model.heightmapHeight;
    var invWidth = 1.0 / width;
    var invHeight = 1.0 / height;
    var widthRatio = this.texture.image.width / width;
    var heightRatio = this.texture.image.height / height;
    var invTextureWidth = 1.0 / this.texture.image.width;
    var invTextureHeight = 1.0 / this.texture.image.height;

    var i = 0;
    for (var y = 0; y < height; ++y) {
      for (var x = 0; x < width; ++x) {
        var depth = this.getDepth(data, i);

        var x1 = x * invWidth;
        var x2 = (x + 1) * invWidth;
        var y1 = y * invHeight;
        var y2 = (y + 1) * invHeight;

        vertices.push(new THREE.Vector3(x1, y1, depth));
        vertices.push(new THREE.Vector3(x2, y1, depth));
        vertices.push(new THREE.Vector3(x2, y2, depth));
        vertices.push(new THREE.Vector3(x1, y2, depth));

        i += 4;
      }
    }

    if (createFaces) {
      i = 0;
      for (var y = 0; y < height; ++y) {
        for (var x = 0; x < width; ++x) {
          var xr = x * widthRatio;
          var yr = y * heightRatio;
          var u1 = (xr + 0.5) * invTextureWidth;
          var u2 = (xr + widthRatio - 0.5) * invTextureWidth;
          var v1 = (yr + 0.5) * invTextureHeight;
          var v2 = (yr + heightRatio - 0.5) * invTextureHeight;

          geometry.faces.push(new THREE.Face3(i, i + 1, i + 2));
          geometry.faces.push(new THREE.Face3(i, i + 2, i + 3));

          geometry.faceVertexUvs[0].push([
            new THREE.Vector2(u1, v1),
            new THREE.Vector2(u2, v1),
            new THREE.Vector2(u2, v2)
          ]);
          geometry.faceVertexUvs[0].push([
            new THREE.Vector2(u1, v1),
            new THREE.Vector2(u2, v2),
            new THREE.Vector2(u1, v2)
          ]);

          i += 4;
        }
      }
    }
  },

  createHeightmapGeometry: function(data, geometry, vertices, createFaces) {
    switch (this.model.geometryStyle_) {
      case Image3D.GeometryStyle.Smooth:
        this.createSmoothGeometry(geometry, vertices, data, createFaces);
        break;
      case Image3D.GeometryStyle.Block:
        this.createBlockGeometry(geometry, vertices, data, createFaces);
        break;
      case Image3D.GeometryStyle.Float:
        this.createFloatGeometry(geometry, vertices, data, createFaces);
        break;
    }
  },

  createGeometry: function() {
    var geometry = new THREE.Geometry();

    var numValidHeightmaps = 0;
    for (var i = 0; i < 4; ++i) {
      if (this.model.heightmaps[i])
        ++numValidHeightmaps;
    }

    this.createHeightmapGeometry(this.model.heightmapData[0],
        geometry, geometry.vertices, true);

    // Make sure there are no morph targets for block geometry
    if (numValidHeightmaps > 1 &&
        this.model.geometryStyle_ === Image3D.GeometryStyle.Block)
      throw '[Image3D] Block geometry does not support multiple heightmaps';

    for (var i = 0; i < 4; ++i) {
      var morphTarget = {
        name: 'target' + i.toString(),
        vertices: []
      };

      if (!this.model.heightmaps[i] || i == 0) {
        morphTarget.vertices = geometry.vertices;
      } else {
        this.createHeightmapGeometry(this.model.heightmapData[i], geometry,
            morphTarget.vertices, false);
      }

      geometry.morphTargets.push(morphTarget);
    }

    this.computeNormals(geometry);

    return geometry;
  },

  createMesh: function() {
    if (typeof this.texture === 'undefined' || !this.texture)
      return;

    var geometry = this.createGeometry();
    var material = this.createMaterial();
    this.mesh = new THREE.Mesh(geometry, material);

    this.mesh.morphTargetInfluences = this.model.currentMorphTargets;

    this.scene.add(this.mesh);
    this.triggers.add(this.mesh);

    this.loaded = true;
  },

  destroyMesh: function() {
    this.scene.remove(this.mesh);
    this.triggers.remove(this.mesh);
  },

  setMorphTargetInfluences: function(influences) {
    if (this.mesh) {
      this.mesh.morphTargetInfluences = influences;
      this.dirty();
    }
  },

  setImage: function(image, imageSrc) {
    if (typeof this.texture === 'undefined' || !this.texture) {
      this.texture = new THREE.Texture(undefined);

      this.texture.flipY = false;
      this.texture.miFilter = THREE.NearestFilter;
      this.texture.magFilter = THREE.NearestFilter;
    }

    this.texture.needsUpdate = true;
    this.texture.image = image;
    this.texture.sourceFile = imageSrc;

    this.rebuildGeometry();
  },

  rebuildGeometry: function() {
    if (typeof this.mesh !== 'undefined' && this.mesh)
      this.destroyMesh();
    this.createMesh();
  },

  setTransparent: function(transparent) {
    if (typeof this.mesh !== 'undefined' && this.mesh)
      this.mesh.material.transparent = transparent;
  }

});



/**
 * A image shown in 3D using heightmaps.
 *
 * Options:
 *
 * - element {HTMLElement} HTML element to attach to.
 * - imageSrc {string=} Optional image source.
 * - heightmap {string} Initial heightmap image path.
 * - heightmap2 {string=} Optional second heightmap path.
 * - heightmap3 {string=} Optional third heightmap path.
 * - heightmap4 {string=} Optional fourth heightmap path.
 * - maxHeight {number=} Optional maximum depth of the heightmap.
 *     Default is 200.
 * - geometryStyle {(Image3D.GeometryStyle|string)=} Optional geometry style.
 *     Default is smooth.
 * - transparent {boolean=} Whether to allow in-between transparency.
 *     Default is true.
 *
 * Events:
 *
 * - morphBegin
 * - morphEnd
 * - changeImageSrc
 * - chamgeHeightmap
 * - changeHeightmap2
 * - changeHeightmap3
 * - changeHeightmap4
 * - changeGeometryStyle
 * - changeMaxHeight
 * - changeTransparent
 *
 * @constructor
 * @extends {voodoo.Model}
 *
 * @param {Object=} opt_options Options object.
 */
var Image3D = this.Image3D = voodoo.Model.extend({

  name: 'Image3D',
  organization: 'spellbook',
  viewType: Image3DView_,
  stencilViewType: Image3DView_,

  initialize: function(options) {
    this.base.initialize(options);

    this.element = options.element;
    if (typeof options.element === 'undefined')
      throw '[Image3D] element must be defined';

    this.imageSrc_ = typeof options.imageSrc !== 'undefined' ?
        getAbsoluteUrl(options.imageSrc) :
        getAbsoluteUrl(options.element.src);
    this.heightSources = [
      typeof options.heightmap !== 'undefined' ?
          getAbsoluteUrl(options.heightmap) : '',
      typeof options.heightmap2 !== 'undefined' ?
          getAbsoluteUrl(options.heightmap2) : '',
      typeof options.heightmap3 !== 'undefined' ?
          getAbsoluteUrl(options.heightmap3) : '',
      typeof options.heightmap4 !== 'undefined' ?
          getAbsoluteUrl(options.heightmap4) : ''
    ];

    if (typeof options.heightmap === 'undefined')
      throw '[Image3D] heightmap must be defined';

    this.maxHeight_ = typeof options.maxHeight !== 'undefined' ?
        options.maxHeight : 200;
    this.geometryStyle_ = typeof options.geometryStyle !== 'undefined' ?
        options.geometryStyle : Image3D.GeometryStyle.Smooth;
    this.transparent_ = typeof options.transparent !== 'undefined' ?
        options.transparent : true;

    this.morphing = false;
    this.startMorphTime = 0;
    this.morphAnimationLength = 1;
    this.startMorphTargets = [1, 0, 0, 0];
    this.currentMorphTargets = [1, 0, 0, 0];
    this.endMorphTargets = [1, 0, 0, 0];

    this.createPublicProperties();
  },

  setUpViews: function() {
    this.base.setUpViews();

    var self = this;
    this.loadHeightmaps(function() {
      var src = self.imageSrc_;
      self.imageSrc_ = null;
      self.setImageSrc(src);
    });
  },

  update: function(deltaTime) {
    this.base.update(deltaTime);

    if (!this.loaded)
      return;

    if (this.element.tagName.toLowerCase() === 'img' &&
        this.element.src !== this.imageSrc_)
      this.setImageSrc(this.element.src);

    if (this.morphing) {
      var now = new Date().getTime();
      var delta = now - this.startMorphTime;
      var time = delta / this.morphAnimationLength;

      if (time > 1) {
        // Finish animations
        this.morphing = false;
        this.view.setMorphTargetInfluences(this.endMorphTargets);
        if (typeof this.stencilView !== 'undefined' && this.stencilView)
          this.stencilView.setMorphTargetInfluences(this.endMorphTargets);

        this.currentMorphTargets = this.endMorphTargets.slice(0);

        this.dispatch(new voodoo.Event('morphEnd', this));
      } else {
        var invTime = 1.0 - time;
        for (var i = 0; i < this.endMorphTargets.length; ++i) {
          this.currentMorphTargets[i] =
              this.startMorphTargets[i] * invTime +
              this.endMorphTargets[i] * time;
        }
        this.view.setMorphTargetInfluences(this.currentMorphTargets);
        if (typeof this.stencilView !== 'undefined' && this.stencilView)
          this.stencilView.setMorphTargetInfluences(this.currentMorphTargets);
      }
    }
  },

  createPublicProperties: function() {
    var self = this;

    Object.defineProperty(this, 'geometryStyle', {
      get: function() { return self.geometryStyle_; },
      set: function(geometryStyle) { self.setGeometryStyle(geometryStyle); },
      enumerable: true
    });

    Object.defineProperty(this, 'heightmap', {
      get: function() { return self.heightSources[0]; },
      set: function(heightmap) { self.setHeightmap(heightmap, 1); },
      enumerable: true
    });

    Object.defineProperty(this, 'heightmap2', {
      get: function() { return self.heightSources[1]; },
      set: function(heightmap) { self.setHeightmap(heightmap, 2); },
      enumerable: true
    });

    Object.defineProperty(this, 'heightmap3', {
      get: function() { return self.heightSources[2]; },
      set: function(heightmap) { self.setHeightmap(heightmap, 3); },
      enumerable: true
    });

    Object.defineProperty(this, 'heightmap4', {
      get: function() { return self.heightSources[3]; },
      set: function(heightmap) { self.setHeightmap(heightmap, 4); },
      enumerable: true
    });

    Object.defineProperty(this, 'imageSrc', {
      get: function() { return self.imageSrc_; },
      set: function(imageSrc) { self.setImageSrc(imageSrc); },
      enumerable: true
    });

    Object.defineProperty(this, 'maxHeight', {
      get: function() { return self.maxHeight_; },
      set: function(maxHeight) { self.setMaxHeight(maxHeight); },
      enumerable: true
    });

    Object.defineProperty(this, 'transparent', {
      get: function() { return self.transparent_; },
      set: function(transparent) { self.setTransparent(transparent); },
      enumerable: true
    });
  },

  loadHeightmap: function(heightmapSrc, index, callback) {
    if (!heightmapSrc)
      return;

    function onLoad(index) {
      var heightmapWidth = this.heightmaps[index].width;
      var heightmapHeight = this.heightmaps[index].height;

      var canvas = document.createElement('canvas');
      canvas.width = heightmapWidth;
      canvas.height = heightmapHeight;

      var context = canvas.getContext('2d');
      context.drawImage(this.heightmaps[index], 0, 0, heightmapWidth,
          heightmapHeight);
      this.heightmapData[index] = context.getImageData(0, 0,
          heightmapWidth, heightmapHeight).data;

      callback();
    }

    var heightmap = new Image();
    heightmap.onload = onLoad.bind(this, index);
    this.heightmaps[index] = heightmap;
    heightmap.src = heightmapSrc;
  },

  loadHeightmaps: function(callback) {
    this.heightmapWidth = 0;
    this.heightmapHeight = 0;

    var numLoaded = 0;
    var numToLoad = 0;
    function onLoad(index) {
      var heightmap = this.heightmaps[index];

      // Ensure all heightmaps are the same size
      if (numLoaded == 0) {
        this.heightmapWidth = heightmap.width;
        this.heightmapHeight = heightmap.height;
      } else {
        if (this.heightmapWidth != heightmap.width ||
            this.heightmapHeight != heightmap.height)
          throw '[Image3D]: All heightmaps must be the same size';
      }

      numLoaded++;
      if (numLoaded === numToLoad)
        callback();
    }

    this.heightmaps = [];
    this.heightmapData = [];
    for (var i = 0; i < 4; ++i) {
      if (this.heightSources[i] !== '')
        numToLoad++;
    }
    for (var i = 0; i < 4; ++i)
      this.loadHeightmap(this.heightSources[i], i, onLoad.bind(this, i));
  }
});


/**
 * Animates the geometry from one heightmap to another.
 *
 * @param {number} index Heightmap index from 1-4.
 * @param {number} seconds Animation duration.
 *
 * @return {Image3D}
 */
Image3D.prototype.morph = function(index, seconds) {
  var morphTargetInfluences = [0, 0, 0, 0];
  morphTargetInfluences[index - 1] = 1;

  if (seconds > 0) {
    // Animate over time
    this.startMorphTargets = this.currentMorphTargets.slice(0);
    this.endMorphTargets = morphTargetInfluences.slice(0);
    this.morphAnimationLength = seconds * 1000;
    this.startMorphTime = new Date().getTime();
    this.morphing = true;

    this.dispatch(new voodoo.Event('morphBegin', this));
  } else {
    // Animate immediately
    this.startMorphTargets = morphTargetInfluences.slice(0);
    this.endMorphTargets = morphTargetInfluences.slice(0);
    this.currentMorphTargets = morphTargetInfluences.slice(0);
    this.view.setMorphTargetInfluences(morphTargetInfluences);
    if (typeof this.stencilView !== 'undefined' && this.stencilView)
      this.stencilView.setMorphTargetInfluences(morphTargetInfluences);
    this.morphing = false;
  }

  return this;
};


/**
 * Sets the geometry style.
 *
 * @param {Image3D.GeometryStyle|string} geometryStyle Geometry style.
 *
 * @return {Image3D}
 */
Image3D.prototype.setGeometryStyle = function(geometryStyle) {
  if (this.geometryStyle_ !== geometryStyle) {
    this.geometryStyle_ = geometryStyle;

    this.dispatch(new voodoo.Event('changeGeometryStyle', this));

    this.view.rebuildGeometry();
    if (typeof self.stencilView !== 'undefined' && self.stencilView)
      self.stencilView.rebuildGeometry();
  }

  return this;
};


/**
 * Sets a heightmap.
 *
 * @param {string} heightmap Heightmap filename.
 * @param {number=} opt_index Heightmap number. Default is 1, the main
 *   heightmap.
 *
 * @return {Image3D}
 */
Image3D.prototype.setHeightmap = function(heightmap, opt_index) {
  heightmap = getAbsoluteUrl(heightmap);

  var index = typeof opt_index === 'undefined' ? 0 : opt_index - 1;

  if (this.heightSources[index] === heightmap)
    return this;

  this.heightSources[index] = heightmap;

  if (index === 0)
    this.dispatch(new voodoo.Event('changeHeightmap', this));
  else this.dispatch(new voodoo.Event('changeHeightmap' + (index + 1), this));

  /** @type {?} */
  var self = this;

  self.loadHeightmap(heightmap, index, function() {
    self.view.rebuildGeometry();
    if (typeof self.stencilView !== 'undefined' && self.stencilView)
      self.stencilView.rebuildGeometry();
  });

  return this;
};


/**
 * Sets the texture.
 *
 * @param {string} imageSrc Texture filename.
 *
 * @return {Image3D}
 */
Image3D.prototype.setImageSrc = function(imageSrc) {
  imageSrc = getAbsoluteUrl(imageSrc);

  if (this.imageSrc_ === imageSrc)
    return this;

  var initialized = this.imageSrc_ !== null;
  this.imageSrc_ = imageSrc;

  if (this.element.tagName.toLowerCase() === 'img')
    this.element.src = imageSrc;

  if (initialized)
    this.dispatch(new voodoo.Event('changeImageSrc', this));

  function onLoad(index) {
    this.view.setImage(this.image, this.imageSrc_);
    if (typeof this.stencilView !== 'undefined' && this.stencilView)
      this.stencilView.setImage(this.image, this.imageSrc_);
  }

  this.image = new Image();
  this.image.onload = onLoad.bind(this);
  this.image.src = imageSrc;

  return this;
};


/**
 * Sets the maximum height of the image.
 *
 * @param {number} maxHeight Maximum Z height.
 *
 * @return {Image3D}
 */
Image3D.prototype.setMaxHeight = function(maxHeight) {
  if (this.maxHeight_ !== maxHeight) {
    this.maxHeight_ = maxHeight;

    this.dispatch(new voodoo.Event('changeMaxHeight', this));

    this.view.rebuildGeometry();
    if (typeof self.stencilView !== 'undefined' && self.stencilView)
      self.stencilView.rebuildGeometry();
  }

  return this;
};


/**
 * Sets whether the texture may be transparent.
 *
 * @param {boolean} transparent Enable transparency.
 *
 * @return {Image3D}
 */
Image3D.prototype.setTransparent = function(transparent) {
  if (this.transparent_ !== transparent) {
    this.transparent_ = transparent;

    this.dispatch(new voodoo.Event('changeTransparent', this));

    this.view.setTransparent(transparent);
    if (typeof self.stencilView !== 'undefined' && self.stencilView)
      self.stencilView.setTransparent(transparent);
  }

  return this;
};


/**
 * Enumeration for the different ways of building the geometry.
 *
 * @enum {string}
 */
Image3D.GeometryStyle = {
  Smooth: 'smooth',
  Block: 'block',
  Float: 'float'
};


/**
 * Gets or sets the geometry style. Default is smooth.
 *
 * @type {Image3D.GeometryStyle|string}
 */
Image3D.prototype.geometryStyle = Image3D.GeometryStyle.Smooth;


/**
 * Gets or sets the source file for the primary heightmap.
 *
 * @type {string}
 */
Image3D.prototype.heightmap = '';


/**
 * Gets or sets the source file for the second heightmap.
 *
 * @type {string}
 */
Image3D.prototype.heightmap2 = '';


/**
 * Gets or sets the source file for the third heightmap.
 *
 * @type {string}
 */
Image3D.prototype.heightmap3 = '';


/**
 * Gets or sets the source file for the fourth heightmap.
 *
 * @type {string}
 */
Image3D.prototype.heightmap4 = '';


/**
 * Gets or sets the source file for the texture.
 *
 * @type {string}
 */
Image3D.prototype.imageSrc = '';


/**
 * Gets or sets the maximum z-height. Default is 200.
 *
 * @type {number}
 */
Image3D.prototype.maxHeight = 200;


/**
 * Gets or sets whether the texture may be transparent. Default is true.
 *
 * @type {boolean}
 */
Image3D.prototype.transparent = true;
