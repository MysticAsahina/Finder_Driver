// Simple module-level store to pass picked image back from upload-guidelines page
let pendingImage: { side: string; uri: string } | null = null;

export const setPendingImage = (side: string, uri: string) => {
    pendingImage = { side, uri };
};

export const getAndClearPendingImage = () => {
    const result = pendingImage;
    pendingImage = null;
    return result;
};
