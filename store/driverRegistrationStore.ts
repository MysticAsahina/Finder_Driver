import * as SecureStore from 'expo-secure-store';

/**
 * Module-level store accumulating driver registration data across screens.
 * All image fields hold Cloudinary secure URLs after upload.
 * Call clearDriverRegistration() after successful submission or abandonment.
 */

const STORAGE_KEY_TOKEN = 'finder_driver_reg_token';
const STORAGE_KEY_DATA = 'finder_driver_reg_data';
const STORAGE_KEY_SAVED_AT = 'finder_driver_reg_saved_at';
const STORAGE_KEY_CAPTURING = 'finder_driver_reg_capturing';
const TOKEN_SAFETY_BUFFER_MS = 25 * 60 * 1000; // 25 minutes buffer before backend token expires
const MAX_DRAFT_AGE_MS = 95 * 60 * 1000; // 95 minutes max draft age (120 min JWT - 25 min buffer)

interface CloudinaryPublicIds {
  licenseImgFront?:  string;
  licenseImgBack?:   string;
  faceImg?:          string;
  idImg?:            string;
  tricycleOR?:       string;
  regCert?:          string;
  tricycleImgFront?: string;
  tricycleImgBack?:  string;
}

export interface DriverRegistrationData {
  // Token from backend (carries firstName, lastName, mobileNumber internally)
  driverRegToken:    string | null;

  // Screen 3 — Driving license
  licenseImgFront:   string | null;
  licenseImgBack:    string | null;
  licenseNumber:     string;
  licenseExpDate:    string;

  // Screen 4 — Face verification
  faceImg:           string | null;
  idImg:             string | null;

  // Screen 5 — Vehicle registration
  tricycleOR:        string | null;
  regCert:           string | null;

  // Screen 6 — Tricycle details
  tricycleImgFront:  string | null;
  tricycleImgBack:   string | null;
  motorcycleBrand:   string;
  plateNumber:       string;

  // Screen 7 — Password
  password:          string;
  confirmPassword:   string;

  // Screen 8 — MPIN (optional)
  mpin:              string | null;

  // Cloudinary public IDs for cleanup on rejection
  cloudinaryPublicIds: CloudinaryPublicIds;
}

const initialState = (): DriverRegistrationData => ({
  driverRegToken:    null,
  licenseImgFront:   null,
  licenseImgBack:    null,
  licenseNumber:     '',
  licenseExpDate:    '',
  faceImg:           null,
  idImg:             null,
  tricycleOR:        null,
  regCert:           null,
  tricycleImgFront:  null,
  tricycleImgBack:   null,
  motorcycleBrand:   '',
  plateNumber:       '',
  password:          '',
  confirmPassword:   '',
  mpin:              null,
  cloudinaryPublicIds: {},
});

let store: DriverRegistrationData = initialState();

async function persistToStorage(): Promise<void> {
  try {
    if (store.driverRegToken) {
      await SecureStore.setItemAsync(STORAGE_KEY_TOKEN, store.driverRegToken);
      const { driverRegToken, password, confirmPassword, mpin, ...rest } = store;
      await SecureStore.setItemAsync(STORAGE_KEY_DATA, JSON.stringify(rest));
    }
  } catch {
    // Non-blocking catch to ensure UI doesn't crash on storage errors
  }
}

export function setDriverRegToken(token: string): void {
  store.driverRegToken = token;
  SecureStore.setItemAsync(STORAGE_KEY_SAVED_AT, String(Date.now())).catch(() => {});
  persistToStorage().catch(() => {});
}

export function getDriverRegToken(): string | null {
  return store.driverRegToken;
}

export function setDriverRegImage(
  field: keyof CloudinaryPublicIds,
  url: string,
  publicId: string,
): void {
  (store as any)[field] = url;
  store.cloudinaryPublicIds[field] = publicId;
  persistToStorage().catch(() => {});
}

export function setDriverRegLicense(data: {
  licenseNumber: string;
  licenseExpDate: string;
}): void {
  store.licenseNumber  = data.licenseNumber;
  store.licenseExpDate = data.licenseExpDate;
  persistToStorage().catch(() => {});
}

export function setDriverRegTricycleDetails(data: {
  motorcycleBrand: string;
  plateNumber:     string;
}): void {
  store.motorcycleBrand = data.motorcycleBrand;
  store.plateNumber     = data.plateNumber;
  persistToStorage().catch(() => {});
}

export function setDriverRegPassword(password: string, confirmPassword: string): void {
  store.password        = password;
  store.confirmPassword = confirmPassword;
  persistToStorage().catch(() => {});
}

export function setDriverRegMpin(mpin: string | null): void {
  store.mpin = mpin;
  persistToStorage().catch(() => {});
}

export function getDriverRegStore(): DriverRegistrationData {
  return store;
}

export function clearDriverRegistration(): void {
  store = initialState();
  SecureStore.deleteItemAsync(STORAGE_KEY_TOKEN).catch(() => {});
  SecureStore.deleteItemAsync(STORAGE_KEY_DATA).catch(() => {});
  SecureStore.deleteItemAsync(STORAGE_KEY_SAVED_AT).catch(() => {});
  SecureStore.deleteItemAsync(STORAGE_KEY_CAPTURING).catch(() => {});
}

export async function setCapturingCamera(isCapturing: boolean): Promise<void> {
  try {
    if (isCapturing) {
      await SecureStore.setItemAsync(STORAGE_KEY_CAPTURING, String(Date.now()));
    } else {
      await SecureStore.deleteItemAsync(STORAGE_KEY_CAPTURING);
    }
  } catch {}
}

export async function wasKilledDuringCamera(): Promise<boolean> {
  try {
    const timestampStr = await SecureStore.getItemAsync(STORAGE_KEY_CAPTURING);
    if (!timestampStr) return false;
    const timestamp = Number(timestampStr);
    const isRecent = !isNaN(timestamp) && (Date.now() - timestamp < 2 * 60 * 1000); // 2 minutes
    await SecureStore.deleteItemAsync(STORAGE_KEY_CAPTURING);
    return isRecent;
  } catch {
    return false;
  }
}

function getTokenRemainingMs(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const decodedJson = atob(base64);
      const parsed = JSON.parse(decodedJson);
      if (parsed && typeof parsed.exp === 'number') {
        return parsed.exp * 1000 - Date.now();
      }
    }
  } catch {}
  return null;
}

export async function restoreDriverRegistration(): Promise<boolean> {
  try {
    const token = await SecureStore.getItemAsync(STORAGE_KEY_TOKEN);
    const savedAtStr = await SecureStore.getItemAsync(STORAGE_KEY_SAVED_AT);
    const dataStr = await SecureStore.getItemAsync(STORAGE_KEY_DATA);

    if (!token) {
      return false;
    }

    // 1. Dynamic check: check JWT expiration against safety buffer
    const remainingMs = getTokenRemainingMs(token);
    if (remainingMs !== null) {
      if (remainingMs < TOKEN_SAFETY_BUFFER_MS) {
        // Token has less than 25 minutes left: unsafe to resume, purge draft
        clearDriverRegistration();
        return false;
      }
    } else if (savedAtStr) {
      // 2. Fallback check: compare saved timestamp against MAX_DRAFT_AGE_MS (95 mins)
      const savedAt = Number(savedAtStr);
      if (!savedAt || isNaN(savedAt) || Date.now() - savedAt > MAX_DRAFT_AGE_MS) {
        clearDriverRegistration();
        return false;
      }
    }

    let parsedData = {};
    if (dataStr) {
      parsedData = JSON.parse(dataStr);
    }

    store = {
      ...initialState(),
      ...parsedData,
      driverRegToken: token,
    };
    return true;
  } catch {
    return false;
  }
}