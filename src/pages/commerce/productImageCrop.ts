export type ProductPhotoOrientation = "portrait" | "landscape" | "square";

export interface ProductPhotoCrop {
  orientation: ProductPhotoOrientation;
  zoom: number;
  x: number;
  y: number;
}

export interface ProductPhotoCropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const ASPECT_RATIOS: Record<ProductPhotoOrientation, number> = {
  portrait: 4 / 5,
  landscape: 4 / 3,
  square: 1,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const DEFAULT_PRODUCT_PHOTO_CROP: ProductPhotoCrop = {
  orientation: "portrait",
  zoom: 1,
  x: 50,
  y: 50,
};

export function productPhotoCropSignature(crop: ProductPhotoCrop) {
  return `${crop.orientation}:${crop.zoom}:${crop.x}:${crop.y}`;
}

export function calculateProductPhotoCropRect(
  imageWidth: number,
  imageHeight: number,
  crop: ProductPhotoCrop,
): ProductPhotoCropRect {
  if (!Number.isFinite(imageWidth) || imageWidth <= 0 || !Number.isFinite(imageHeight) || imageHeight <= 0) {
    throw new Error("Product photo dimensions must be positive numbers");
  }

  const targetRatio = ASPECT_RATIOS[crop.orientation];
  const sourceRatio = imageWidth / imageHeight;
  let width = sourceRatio > targetRatio ? imageHeight * targetRatio : imageWidth;
  let height = sourceRatio > targetRatio ? imageHeight : imageWidth / targetRatio;
  const zoom = clamp(crop.zoom, 1, 3);
  width /= zoom;
  height /= zoom;

  const centerX = imageWidth * clamp(crop.x, 0, 100) / 100;
  const centerY = imageHeight * clamp(crop.y, 0, 100) / 100;
  const x = clamp(centerX - width / 2, 0, imageWidth - width);
  const y = clamp(centerY - height / 2, 0, imageHeight - height);

  return { x, y, width, height };
}

function loadPhoto(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("The selected product photo could not be decoded"));
    };
    image.src = objectUrl;
  });
}

export async function cropProductPhoto(file: File, crop: ProductPhotoCrop): Promise<File> {
  if (file.type !== "image/gif" && productPhotoCropSignature(crop) === productPhotoCropSignature(DEFAULT_PRODUCT_PHOTO_CROP)) {
    return file;
  }
  const image = await loadPhoto(file);
  const rect = calculateProductPhotoCropRect(image.naturalWidth, image.naturalHeight, crop);
  const aspectRatio = ASPECT_RATIOS[crop.orientation];
  const outputWidth = Math.max(1, Math.min(2000, Math.round(rect.width)));
  const outputHeight = Math.max(1, Math.round(outputWidth / aspectRatio));
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not initialize the product photo editor");

  context.drawImage(
    image,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  const outputType = file.type === "image/png" || file.type === "image/gif"
    ? "image/png"
    : file.type === "image/webp"
      ? "image/webp"
      : "image/jpeg";
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => result ? resolve(result) : reject(new Error("Could not export the edited product photo")),
      outputType,
      outputType === "image/png" ? undefined : 0.92,
    );
  });
  const extension = outputType === "image/png" ? "png" : outputType === "image/webp" ? "webp" : "jpg";
  const name = file.name.replace(/\.[^.]+$/, "");

  return new File([blob], `${name}-averon.${extension}`, {
    type: outputType,
    lastModified: Date.now(),
  });
}
