// The API shrinks every photo to 1600px WebP anyway, so phone photos are scaled down here
// first: a 12 MP picture would blow past its 5 MB limit and take ages on restaurant wifi.

export const ACCEPTED_IMAGES = "image/jpeg,image/png,image/webp,image/gif";
export const MAX_SIDE = 1600;

export type Area = { x: number; y: number; width: number; height: number };

const isAccepted = (file: File) => ACCEPTED_IMAGES.split(",").includes(file.type);

export function checkImage(file: File): "type" | null {
  return isAccepted(file) ? null : "type";
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function toBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("encode"))),
      "image/jpeg",
      0.9,
    ),
  );
}

/** Draws `area` of the image (all of it when left out) at no more than MAX_SIDE a side. */
export async function renderImage(src: string, area?: Area) {
  const image = await loadImage(src);
  const crop = area ?? { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight };
  const scale = Math.min(1, MAX_SIDE / Math.max(crop.width, crop.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(crop.width * scale);
  canvas.height = Math.round(crop.height * scale);
  const context = canvas.getContext("2d")!;
  // JPEG has no transparency; a PNG logo on white looks right on a menu.
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return toBlob(canvas);
}
