export type Point = {
  x: number;
  y: number;
};

export type ReceiptPreprocessResult = {
  dataUrl: string;
  detected: boolean;
  corners?: [Point, Point, Point, Point];
  message: string;
};

const maxDetectionSide = 760;
const minComponentAreaRatio = 0.025;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image failed to load"));
    image.src = dataUrl;
  });
}

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function drawImageToCanvas(image: HTMLImageElement, maxSide?: number) {
  const scale = maxSide ? Math.min(1, maxSide / Math.max(image.width, image.height)) : 1;
  const canvas = makeCanvas(image.width * scale, image.height * scale);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas context is unavailable.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return { canvas, context, scale };
}

function luminanceAndSaturation(data: Uint8ClampedArray, index: number) {
  const r = data[index];
  const g = data[index + 1];
  const b = data[index + 2];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return {
    luminance: r * 0.299 + g * 0.587 + b * 0.114,
    saturation: max - min
  };
}

function otsuThreshold(gray: Uint8Array) {
  const histogram = new Array<number>(256).fill(0);
  for (const value of gray) histogram[value] += 1;

  const total = gray.length;
  let sum = 0;
  for (let value = 0; value < 256; value += 1) sum += value * histogram[value];

  let sumBackground = 0;
  let weightBackground = 0;
  let maxVariance = 0;
  let threshold = 150;

  for (let value = 0; value < 256; value += 1) {
    weightBackground += histogram[value];
    if (weightBackground === 0) continue;

    const weightForeground = total - weightBackground;
    if (weightForeground === 0) break;

    sumBackground += value * histogram[value];
    const meanBackground = sumBackground / weightBackground;
    const meanForeground = (sum - sumBackground) / weightForeground;
    const variance =
      weightBackground *
      weightForeground *
      (meanBackground - meanForeground) *
      (meanBackground - meanForeground);

    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = value;
    }
  }

  return threshold;
}

function buildPaperMask(imageData: ImageData) {
  const { data, width, height } = imageData;
  const gray = new Uint8Array(width * height);

  for (let pixel = 0, rgba = 0; pixel < gray.length; pixel += 1, rgba += 4) {
    gray[pixel] = luminanceAndSaturation(data, rgba).luminance;
  }

  const threshold = clamp(otsuThreshold(gray) + 8, 120, 220);
  const mask = new Uint8Array(width * height);

  for (let pixel = 0, rgba = 0; pixel < gray.length; pixel += 1, rgba += 4) {
    const { luminance, saturation } = luminanceAndSaturation(data, rgba);
    if (luminance >= threshold && saturation < 95) {
      mask[pixel] = 1;
    }
  }

  return { mask, width, height };
}

function findLargestPaperComponent(mask: Uint8Array, width: number, height: number) {
  const visited = new Uint8Array(mask.length);
  const queue = new Int32Array(mask.length);
  let bestPixels: number[] = [];
  let bestScore = 0;

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue;

    let head = 0;
    let tail = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    const pixels: number[] = [];

    visited[start] = 1;
    queue[tail++] = start;

    while (head < tail) {
      const index = queue[head++];
      pixels.push(index);
      const x = index % width;
      const y = Math.floor(index / width);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);

      const neighbors = [index - 1, index + 1, index - width, index + width];
      for (const next of neighbors) {
        if (next < 0 || next >= mask.length || visited[next] || !mask[next]) continue;
        const nx = next % width;
        const xJump = Math.abs(nx - x);
        if (xJump > 1) continue;
        visited[next] = 1;
        queue[tail++] = next;
      }
    }

    const boxWidth = maxX - minX + 1;
    const boxHeight = maxY - minY + 1;
    const areaRatio = pixels.length / (width * height);
    const aspect = boxHeight / Math.max(boxWidth, 1);
    const fill = pixels.length / Math.max(boxWidth * boxHeight, 1);
    const centerX = (minX + maxX) / 2 / width;
    const centerPenalty = Math.abs(centerX - 0.5);
    const receiptLike = aspect > 1.25 && aspect < 7 && fill > 0.28;

    if (areaRatio < minComponentAreaRatio || !receiptLike) continue;

    const score = pixels.length * (1 - centerPenalty);
    if (score > bestScore) {
      bestScore = score;
      bestPixels = pixels;
    }
  }

  return bestPixels;
}

function cornersFromPixels(pixels: number[], width: number): [Point, Point, Point, Point] | null {
  if (pixels.length === 0) return null;

  let topLeft: Point = { x: 0, y: 0 };
  let topRight: Point = { x: 0, y: 0 };
  let bottomRight: Point = { x: 0, y: 0 };
  let bottomLeft: Point = { x: 0, y: 0 };
  let minSum = Number.POSITIVE_INFINITY;
  let maxSum = Number.NEGATIVE_INFINITY;
  let minDiff = Number.POSITIVE_INFINITY;
  let maxDiff = Number.NEGATIVE_INFINITY;

  for (const index of pixels) {
    const x = index % width;
    const y = Math.floor(index / width);
    const sum = x + y;
    const diff = x - y;

    if (sum < minSum) {
      minSum = sum;
      topLeft = { x, y };
    }
    if (sum > maxSum) {
      maxSum = sum;
      bottomRight = { x, y };
    }
    if (diff > maxDiff) {
      maxDiff = diff;
      topRight = { x, y };
    }
    if (diff < minDiff) {
      minDiff = diff;
      bottomLeft = { x, y };
    }
  }

  if (distance(topLeft, topRight) < 20 || distance(bottomLeft, bottomRight) < 20) {
    return null;
  }

  return [topLeft, topRight, bottomRight, bottomLeft];
}

function solveLinearSystem(matrix: number[][], values: number[]) {
  const n = values.length;
  const augmented = matrix.map((row, index) => [...row, values[index]]);

  for (let column = 0; column < n; column += 1) {
    let pivotRow = column;
    for (let row = column + 1; row < n; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivotRow][column])) {
        pivotRow = row;
      }
    }

    [augmented[column], augmented[pivotRow]] = [augmented[pivotRow], augmented[column]];
    const pivot = augmented[column][column];
    if (Math.abs(pivot) < 1e-10) throw new Error("Perspective matrix is unstable.");

    for (let item = column; item <= n; item += 1) {
      augmented[column][item] /= pivot;
    }

    for (let row = 0; row < n; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let item = column; item <= n; item += 1) {
        augmented[row][item] -= factor * augmented[column][item];
      }
    }
  }

  return augmented.map((row) => row[n]);
}

function homographyFromDestToSource(source: [Point, Point, Point, Point], width: number, height: number) {
  const destination: [Point, Point, Point, Point] = [
    { x: 0, y: 0 },
    { x: width - 1, y: 0 },
    { x: width - 1, y: height - 1 },
    { x: 0, y: height - 1 }
  ];
  const matrix: number[][] = [];
  const values: number[] = [];

  for (let index = 0; index < 4; index += 1) {
    const dest = destination[index];
    const src = source[index];
    matrix.push([dest.x, dest.y, 1, 0, 0, 0, -src.x * dest.x, -src.x * dest.y]);
    values.push(src.x);
    matrix.push([0, 0, 0, dest.x, dest.y, 1, -src.y * dest.x, -src.y * dest.y]);
    values.push(src.y);
  }

  const [a, b, c, d, e, f, g, h] = solveLinearSystem(matrix, values);
  return { a, b, c, d, e, f, g, h };
}

function sampleBilinear(data: Uint8ClampedArray, width: number, height: number, x: number, y: number) {
  const clampedX = clamp(x, 0, width - 1);
  const clampedY = clamp(y, 0, height - 1);
  const x0 = Math.floor(clampedX);
  const y0 = Math.floor(clampedY);
  const x1 = Math.min(x0 + 1, width - 1);
  const y1 = Math.min(y0 + 1, height - 1);
  const dx = clampedX - x0;
  const dy = clampedY - y0;
  const result = [0, 0, 0, 255];

  for (let channel = 0; channel < 3; channel += 1) {
    const top =
      data[(y0 * width + x0) * 4 + channel] * (1 - dx) +
      data[(y0 * width + x1) * 4 + channel] * dx;
    const bottom =
      data[(y1 * width + x0) * 4 + channel] * (1 - dx) +
      data[(y1 * width + x1) * 4 + channel] * dx;
    result[channel] = top * (1 - dy) + bottom * dy;
  }

  return result;
}

function warpPerspective(sourceCanvas: HTMLCanvasElement, corners: [Point, Point, Point, Point]) {
  const [topLeft, topRight, bottomRight, bottomLeft] = corners;
  const outputWidth = Math.round(Math.max(distance(topLeft, topRight), distance(bottomLeft, bottomRight)));
  const outputHeight = Math.round(Math.max(distance(topLeft, bottomLeft), distance(topRight, bottomRight)));
  const canvas = makeCanvas(clamp(outputWidth, 200, 2200), clamp(outputHeight, 300, 3600));
  const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
  const outputContext = canvas.getContext("2d", { willReadFrequently: true });
  if (!sourceContext || !outputContext) return sourceCanvas;

  const sourceData = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const outputData = outputContext.createImageData(canvas.width, canvas.height);
  const transform = homographyFromDestToSource(corners, canvas.width, canvas.height);

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const denominator = transform.g * x + transform.h * y + 1;
      const sourceX = (transform.a * x + transform.b * y + transform.c) / denominator;
      const sourceY = (transform.d * x + transform.e * y + transform.f) / denominator;
      const [r, g, b, a] = sampleBilinear(
        sourceData.data,
        sourceCanvas.width,
        sourceCanvas.height,
        sourceX,
        sourceY
      );
      const offset = (y * canvas.width + x) * 4;
      outputData.data[offset] = r;
      outputData.data[offset + 1] = g;
      outputData.data[offset + 2] = b;
      outputData.data[offset + 3] = a;
    }
  }

  outputContext.putImageData(outputData, 0, 0);
  return canvas;
}

function thresholdForOcr(sourceCanvas: HTMLCanvasElement) {
  const context = sourceCanvas.getContext("2d", { willReadFrequently: true });
  if (!context) return sourceCanvas;

  const imageData = context.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const { data, width, height } = imageData;
  const gray = new Uint8Array(width * height);

  for (let pixel = 0, rgba = 0; pixel < gray.length; pixel += 1, rgba += 4) {
    const lum = data[rgba] * 0.299 + data[rgba + 1] * 0.587 + data[rgba + 2] * 0.114;
    gray[pixel] = clamp((lum - 128) * 1.45 + 142, 0, 255);
  }

  const radius = 14;
  const integral = new Uint32Array((width + 1) * (height + 1));
  for (let y = 1; y <= height; y += 1) {
    let rowSum = 0;
    for (let x = 1; x <= width; x += 1) {
      rowSum += gray[(y - 1) * width + (x - 1)];
      integral[y * (width + 1) + x] = integral[(y - 1) * (width + 1) + x] + rowSum;
    }
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const x0 = Math.max(0, x - radius);
      const y0 = Math.max(0, y - radius);
      const x1 = Math.min(width - 1, x + radius);
      const y1 = Math.min(height - 1, y + radius);
      const area = (x1 - x0 + 1) * (y1 - y0 + 1);
      const sum =
        integral[(y1 + 1) * (width + 1) + (x1 + 1)] -
        integral[y0 * (width + 1) + (x1 + 1)] -
        integral[(y1 + 1) * (width + 1) + x0] +
        integral[y0 * (width + 1) + x0];
      const localMean = sum / area;
      const value = gray[y * width + x] < localMean - 8 ? 0 : 255;
      const offset = (y * width + x) * 4;
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }

  context.putImageData(imageData, 0, 0);
  return sourceCanvas;
}

function scaleCorners(corners: [Point, Point, Point, Point], scale: number): [Point, Point, Point, Point] {
  return corners.map((point) => ({
    x: point.x / scale,
    y: point.y / scale
  })) as [Point, Point, Point, Point];
}

export async function preprocessReceiptImage(dataUrl: string): Promise<ReceiptPreprocessResult> {
  const image = await loadImage(dataUrl);
  const detection = drawImageToCanvas(image, maxDetectionSide);
  const imageData = detection.context.getImageData(0, 0, detection.canvas.width, detection.canvas.height);
  const { mask, width, height } = buildPaperMask(imageData);
  const pixels = findLargestPaperComponent(mask, width, height);
  const smallCorners = cornersFromPixels(pixels, width);

  const full = drawImageToCanvas(image);
  let workingCanvas = full.canvas;
  let detected = false;
  let fullCorners: [Point, Point, Point, Point] | undefined;

  if (smallCorners) {
    fullCorners = scaleCorners(smallCorners, detection.scale);
    workingCanvas = warpPerspective(full.canvas, fullCorners);
    detected = true;
  }

  const thresholded = thresholdForOcr(workingCanvas);
  return {
    dataUrl: thresholded.toDataURL("image/png"),
    detected,
    corners: fullCorners,
    message: detected
      ? "ตรวจจับใบเสร็จและปรับ perspective แล้ว"
      : "ตรวจจับกรอบใบเสร็จไม่เจอ ใช้ threshold กับภาพปัจจุบันแทน"
  };
}
