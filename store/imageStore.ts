export interface PendingImageOcrData {
  licenseNumber?: string;
  expirationDateYmd?: string;
}

export interface PendingImagePayload {
  side: string;
  uri: string;
  ocrData?: PendingImageOcrData;
}

// Simple module-level store to pass picked image data back from upload-guidelines page.
let pendingImage: PendingImagePayload | null = null;

export const setPendingImage = (
  side: string,
  uri: string,
  ocrData?: PendingImageOcrData,
) => {
  pendingImage = { side, uri, ocrData };
};

export const getAndClearPendingImage = (): PendingImagePayload | null => {
  const result = pendingImage;
  pendingImage = null;
  return result;
};
