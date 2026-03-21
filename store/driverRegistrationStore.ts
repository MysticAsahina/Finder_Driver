/**
 * Module-level store accumulating driver registration data across screens.
 * All image fields hold Cloudinary secure URLs after upload.
 * Call clearDriverRegistration() after successful submission or abandonment.
 */

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

interface DriverRegistrationData {
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

export function setDriverRegToken(token: string): void {
  store.driverRegToken = token;
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
}

export function setDriverRegLicense(data: {
  licenseNumber: string;
  licenseExpDate: string;
}): void {
  store.licenseNumber  = data.licenseNumber;
  store.licenseExpDate = data.licenseExpDate;
}

export function setDriverRegTricycleDetails(data: {
  motorcycleBrand: string;
  plateNumber:     string;
}): void {
  store.motorcycleBrand = data.motorcycleBrand;
  store.plateNumber     = data.plateNumber;
}

export function setDriverRegPassword(password: string, confirmPassword: string): void {
  store.password        = password;
  store.confirmPassword = confirmPassword;
}

export function setDriverRegMpin(mpin: string | null): void {
  store.mpin = mpin;
}

export function getDriverRegStore(): DriverRegistrationData {
  return store;
}

export function clearDriverRegistration(): void {
  store = initialState();
}