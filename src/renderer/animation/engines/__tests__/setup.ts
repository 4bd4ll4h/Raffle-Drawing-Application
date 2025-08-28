// Test setup for animation engines

// Mock DOMMatrix
global.DOMMatrix = class DOMMatrix {
  a: number = 1;
  b: number = 0;
  c: number = 0;
  d: number = 1;
  e: number = 0;
  f: number = 0;

  constructor(init?: string | number[]) {
    if (Array.isArray(init)) {
      this.a = init[0] || 1;
      this.b = init[1] || 0;
      this.c = init[2] || 0;
      this.d = init[3] || 1;
      this.e = init[4] || 0;
      this.f = init[5] || 0;
    }
  }

  translate(tx: number, ty: number): DOMMatrix {
    return new DOMMatrix([this.a, this.b, this.c, this.d, this.e + tx, this.f + ty]);
  }

  scale(sx: number, sy?: number): DOMMatrix {
    sy = sy ?? sx;
    return new DOMMatrix([this.a * sx, this.b * sx, this.c * sy, this.d * sy, this.e, this.f]);
  }

  rotate(angle: number): DOMMatrix {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new DOMMatrix([
      this.a * cos + this.c * sin,
      this.b * cos + this.d * sin,
      this.c * cos - this.a * sin,
      this.d * cos - this.b * sin,
      this.e,
      this.f
    ]);
  }
};

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = (callback: FrameRequestCallback): number => {
  return setTimeout(() => callback(Date.now()), 16);
};

global.cancelAnimationFrame = (id: number): void => {
  clearTimeout(id);
};

// Mock performance.now
if (!global.performance) {
  global.performance = {
    now: () => Date.now()
  } as Performance;
}

// Mock window.devicePixelRatio
Object.defineProperty(window, 'devicePixelRatio', {
  writable: true,
  configurable: true,
  value: 1,
});

// Enhanced canvas context mock
export const createMockCanvasContext = () => ({
  clearRect: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  rotate: jest.fn(),
  scale: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  arc: jest.fn(),
  closePath: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
  fillText: jest.fn(),
  strokeText: jest.fn(),
  drawImage: jest.fn(),
  createLinearGradient: jest.fn(() => ({
    addColorStop: jest.fn()
  })),
  createRadialGradient: jest.fn(() => ({
    addColorStop: jest.fn()
  })),
  getTransform: jest.fn(() => new DOMMatrix()),
  setTransform: jest.fn(),
  resetTransform: jest.fn(),
  transform: jest.fn(),
  globalAlpha: 1,
  fillStyle: '#000',
  strokeStyle: '#000',
  lineWidth: 1,
  font: '16px Arial',
  textAlign: 'left' as CanvasTextAlign,
  textBaseline: 'top' as CanvasTextBaseline,
  shadowColor: 'transparent',
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  globalCompositeOperation: 'source-over' as GlobalCompositeOperation,
  lineCap: 'butt' as CanvasLineCap,
  lineJoin: 'miter' as CanvasLineJoin,
  miterLimit: 10,
  lineDashOffset: 0,
  imageSmoothingEnabled: true,
  imageSmoothingQuality: 'high' as ImageSmoothingQuality,
  rect: jest.fn(),
  clip: jest.fn(),
  isPointInPath: jest.fn(() => false),
  isPointInStroke: jest.fn(() => false),
  measureText: jest.fn(() => ({
    width: 100,
    actualBoundingBoxLeft: 0,
    actualBoundingBoxRight: 100,
    actualBoundingBoxAscent: 10,
    actualBoundingBoxDescent: 2,
    fontBoundingBoxAscent: 12,
    fontBoundingBoxDescent: 3,
    emHeightAscent: 10,
    emHeightDescent: 2,
    hangingBaseline: 8,
    alphabeticBaseline: 0,
    ideographicBaseline: -2
  })),
  createPattern: jest.fn(() => null),
  putImageData: jest.fn(),
  getImageData: jest.fn(() => ({
    data: new Uint8ClampedArray(4),
    width: 1,
    height: 1,
    colorSpace: 'srgb' as PredefinedColorSpace
  })),
  createImageData: jest.fn(() => ({
    data: new Uint8ClampedArray(4),
    width: 1,
    height: 1,
    colorSpace: 'srgb' as PredefinedColorSpace
  }))
});

// Enhanced canvas mock
export const createMockCanvas = (width: number = 800, height: number = 600) => {
  const context = createMockCanvasContext();
  
  return {
    width,
    height,
    clientWidth: width,
    clientHeight: height,
    getContext: jest.fn(() => context),
    toDataURL: jest.fn(() => 'data:image/png;base64,mock'),
    toBlob: jest.fn((callback: BlobCallback) => {
      const blob = new Blob(['mock'], { type: 'image/png' });
      callback(blob);
    }),
    style: {
      width: `${width}px`,
      height: `${height}px`
    }
  };
};