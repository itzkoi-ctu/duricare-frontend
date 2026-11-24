import type { FarmFormValues } from '../components/farm/FarmFields';
import type { FarmRequest } from '../types/farm';

/**
 * Farm validation rules conforming to FARM-SETUP-001 C0-v2 contract.
 *
 * Requirements:
 * - name: required; strip according to Java Character.isWhitespace; nonblank; max 255 UTF-16 units after strip.
 * - location: optional; omitted/empty after strip -> null; max 255 UTF-16 units after strip.
 * - area: optional finite number > 0; omitted/blank -> null. No rounding or unit assumption.
 * - latitude & longitude: both null or both present; latitude in [-90, 90], longitude in [-180, 180]. Explicit (0,0) valid.
 * - NUL (U+0000) in name or location: TEXT_NUL error before stripping/saving.
 * - Unpaired UTF-16 surrogate: TEXT_UNICODE error.
 */

export function isJavaWhitespace(codePoint: number): boolean {
  // Non-breaking spaces are explicitly NOT whitespace in Java
  if (codePoint === 0x00a0 || codePoint === 0x2007 || codePoint === 0x202f) {
    return false;
  }
  // Standard ASCII control whitespaces: 0x09..0x0D (TAB, LF, VT, FF, CR) and 0x1C..0x1F (FS, GS, RS, US)
  if ((codePoint >= 0x0009 && codePoint <= 0x000d) || (codePoint >= 0x001c && codePoint <= 0x001f)) {
    return true;
  }
  // Unicode Space Separators
  if (codePoint === 0x0020) return true; // SPACE
  if (codePoint === 0x1680) return true; // OGHAM SPACE MARK
  if (codePoint >= 0x2000 && codePoint <= 0x200a && codePoint !== 0x2007) return true; // EN QUAD .. HAIR SPACE
  if (codePoint === 0x2028 || codePoint === 0x2029) return true; // LINE SEPARATOR, PARAGRAPH SEPARATOR
  if (codePoint === 0x205f) return true; // MEDIUM MATHEMATICAL SPACE
  if (codePoint === 0x3000) return true; // IDEOGRAPHIC SPACE

  return false;
}

export function stripJavaWhitespace(str: string): string {
  if (!str) return '';
  const codePoints = Array.from(str);
  let start = 0;
  while (start < codePoints.length && isJavaWhitespace(codePoints[start].codePointAt(0)!)) {
    start++;
  }
  let end = codePoints.length;
  while (end > start && isJavaWhitespace(codePoints[end - 1].codePointAt(0)!)) {
    end--;
  }
  return codePoints.slice(start, end).join('');
}

export function checkTextBoundary(value: string): 'OK' | 'TEXT_NUL' | 'TEXT_UNICODE' {
  if (!value) return 'OK';
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code === 0x0000) {
      return 'TEXT_NUL';
    }
    // High surrogate
    if (code >= 0xd800 && code <= 0xdbff) {
      if (i + 1 >= value.length) {
        return 'TEXT_UNICODE';
      }
      const nextCode = value.charCodeAt(i + 1);
      if (nextCode < 0xdc00 || nextCode > 0xdfff) {
        return 'TEXT_UNICODE';
      }
      i++; // skip valid low surrogate
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      // Unpaired low surrogate
      return 'TEXT_UNICODE';
    }
  }
  return 'OK';
}

export interface FarmFormInput {
  name: string;
  location: string;
  area: string;
  latitude: string;
  longitude: string;
}

export interface FarmValidationResult {
  isValid: boolean;
  fieldErrors: Record<string, string>;
  normalizedPayload?: {
    name: string;
    location: string | null;
    area: number | null;
    latitude: number | null;
    longitude: number | null;
  };
}

export function validateFarmInput(
  input: FarmFormInput,
  t: (key: string) => string = (k: string) => k
): FarmValidationResult {
  const fieldErrors: Record<string, string> = {};

  // 1. Text Boundary check for Name (before strip)
  const nameBoundary = checkTextBoundary(input.name);
  if (nameBoundary === 'TEXT_NUL') {
    fieldErrors.name = t('Ký tự NUL không được chấp nhận.');
  } else if (nameBoundary === 'TEXT_UNICODE') {
    fieldErrors.name = t('Chuỗi Unicode không hợp lệ.');
  }

  // 2. Name validation
  const strippedName = stripJavaWhitespace(input.name);
  if (!fieldErrors.name) {
    if (!strippedName) {
      fieldErrors.name = t('Vui lòng nhập tên vườn.');
    } else if (strippedName.length > 255) {
      fieldErrors.name = t('Tên vườn không được vượt quá 255 ký tự.');
    }
  }

  // 3. Location validation (optional)
  let normalizedLocation: string | null = null;
  if (input.location) {
    const locBoundary = checkTextBoundary(input.location);
    if (locBoundary === 'TEXT_NUL') {
      fieldErrors.location = t('Ký tự NUL không được chấp nhận.');
    } else if (locBoundary === 'TEXT_UNICODE') {
      fieldErrors.location = t('Chuỗi Unicode không hợp lệ.');
    }

    if (!fieldErrors.location) {
      const strippedLoc = stripJavaWhitespace(input.location);
      if (strippedLoc.length > 255) {
        fieldErrors.location = t('Địa điểm không được vượt quá 255 ký tự.');
      } else if (strippedLoc.length > 0) {
        normalizedLocation = strippedLoc;
      }
    }
  }

  // 4. Area validation (optional finite number > 0)
  let normalizedArea: number | null = null;
  const rawArea = input.area.trim();
  if (rawArea) {
    const numArea = Number(rawArea);
    if (!Number.isFinite(numArea) || Number.isNaN(numArea)) {
      fieldErrors.area = t('Diện tích phải là một số hợp lệ.');
    } else if (numArea <= 0) {
      fieldErrors.area = t('Diện tích phải lớn hơn 0.');
    } else {
      normalizedArea = numArea;
    }
  }

  // 5. Latitude & Longitude validation (both null or both present)
  let normalizedLat: number | null = null;
  let normalizedLng: number | null = null;
  const rawLat = input.latitude.trim();
  const rawLng = input.longitude.trim();

  const hasLat = rawLat.length > 0;
  const hasLng = rawLng.length > 0;

  if (hasLat !== hasLng) {
    const halfPairMsg = t('Điền cả hai tọa độ hoặc để trống cả hai.');
    fieldErrors.coordinates = halfPairMsg;
  } else if (hasLat && hasLng) {
    const numLat = Number(rawLat);
    const numLng = Number(rawLng);

    if (!Number.isFinite(numLat) || Number.isNaN(numLat) || numLat < -90 || numLat > 90) {
      fieldErrors.latitude = t('Vĩ độ phải từ -90 đến 90.');
    } else {
      // Normalize -0 to 0
      normalizedLat = Object.is(numLat, -0) ? 0 : numLat;
    }

    if (!Number.isFinite(numLng) || Number.isNaN(numLng) || numLng < -180 || numLng > 180) {
      fieldErrors.longitude = t('Kinh độ phải từ -180 đến 180.');
    } else {
      // Normalize -0 to 0
      normalizedLng = Object.is(numLng, -0) ? 0 : numLng;
    }
  }

  const isValid = Object.keys(fieldErrors).length === 0;

  return {
    isValid,
    fieldErrors,
    normalizedPayload: isValid
      ? {
          name: strippedName,
          location: normalizedLocation,
          area: normalizedArea,
          latitude: normalizedLat,
          longitude: normalizedLng,
        }
      : undefined,
  };
}

export interface ValidationOutput {
  valid: boolean;
  errors: Record<string, string | undefined>;
  request?: FarmRequest;
}

export function validateFarmFormValues(
  values: FarmFormValues,
  t: (key: string) => string = (k: string) => k
): ValidationOutput {
  const result = validateFarmInput(values, t);
  return {
    valid: result.isValid,
    errors: result.fieldErrors,
    request: result.normalizedPayload,
  };
}

export function convertFormValuesToRequest(values: FarmFormValues): FarmRequest {
  const strippedName = stripJavaWhitespace(values.name);
  const strippedLoc = stripJavaWhitespace(values.location);
  const rawArea = values.area.trim();
  const rawLat = values.latitude.trim();
  const rawLng = values.longitude.trim();

  const numArea = rawArea ? Number(rawArea) : null;
  const numLat = rawLat ? Number(rawLat) : null;
  const numLng = rawLng ? Number(rawLng) : null;

  return {
    name: strippedName,
    location: strippedLoc.length > 0 ? strippedLoc : null,
    area: numArea !== null && Number.isFinite(numArea) ? numArea : null,
    latitude:
      numLat !== null && Number.isFinite(numLat)
        ? Object.is(numLat, -0)
          ? 0
          : numLat
        : null,
    longitude:
      numLng !== null && Number.isFinite(numLng)
        ? Object.is(numLng, -0)
          ? 0
          : numLng
        : null,
  };
}
