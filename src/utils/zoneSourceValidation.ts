import { ALL_SENSOR_TYPES, type SensorType } from '../types/sensor';
import {
  isValidDecimalVersion,
  isValidPositiveDecimalId,
  type AssignIotLabOperationRequest,
  type AssignMqttOperationRequest,
  type ReplaceIotLabOperationRequest,
  type ReplaceMqttOperationRequest,
  type ZoneSourceFieldError,
  type ZoneSourceOperationRequest,
} from '../types/zoneSource';
import { checkTextBoundary, stripJavaWhitespace } from './farmValidation';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export const MAX_COMMAND_BYTES = 16384;

export function isValidUuidV4(value: string | null | undefined): boolean {
  if (typeof value !== 'string') return false;
  return UUID_V4_REGEX.test(value);
}

export function hasJavaIsoControl(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if ((code >= 0x0000 && code <= 0x001f) || (code >= 0x007f && code <= 0x009f)) {
      return true;
    }
  }
  return false;
}

export type TextFieldCode =
  | 'OK'
  | 'REQUIRED'
  | 'TOO_LONG'
  | 'TEXT_NUL'
  | 'TEXT_CONTROL'
  | 'TEXT_UNICODE';

export function validateStrictText(
  value: string | null | undefined,
  options: {
    nullable: boolean;
    maxLength: number;
    allowBlank?: boolean;
    allowControls?: boolean;
  }
): TextFieldCode {
  if (value === null || value === undefined) {
    return options.nullable ? 'OK' : 'REQUIRED';
  }
  const boundary = checkTextBoundary(value);
  if (boundary !== 'OK') return boundary;
  if (!options.allowControls && hasJavaIsoControl(value)) {
    return 'TEXT_CONTROL';
  }
  if (!options.allowBlank && stripJavaWhitespace(value).length === 0) {
    return 'REQUIRED';
  }
  if (value.length > options.maxLength) {
    return 'TOO_LONG';
  }
  return 'OK';
}

export function validateThreeLevelMqttTopic(topic: string | null | undefined): string | null {
  const code = validateStrictText(topic, {
    nullable: false,
    maxLength: 1024,
    allowBlank: false,
    allowControls: false,
  });
  if (code !== 'OK') return code;
  const raw = topic!;
  if (raw.includes('+') || raw.includes('#')) return 'MQTT_WILDCARD';
  if (raw.startsWith('/') || raw.endsWith('/')) return 'MQTT_SLASH';
  const parts = raw.split('/');
  if (parts.length !== 3 || parts.some(p => stripJavaWhitespace(p).length === 0)) {
    return 'MQTT_THREE_LEVELS_REQUIRED';
  }
  return null;
}

export function getUtf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function quoteCanonString(s: string): string {
  let out = '"';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const code = s.charCodeAt(i);
    if (c === '"' || c === '\\') {
      out += '\\' + c;
    } else if (code < 32) {
      out += '\\u' + code.toString(16).padStart(4, '0');
    } else {
      out += c;
    }
  }
  out += '"';
  return out;
}

/**
 * Matches backend ZoneSourceCodec.canonical(SortedMap<String, Object>)
 * which sorts keys lexicographically and excludes operationId from the canonical comparison body.
 */
export function canonicalSerializeZoneSourceBody(
  command: ZoneSourceOperationRequest
): string {
  const map: Record<string, string | boolean | null> = {};
  for (const [k, v] of Object.entries(command)) {
    if (k === 'operationId') continue;
    map[k] = v === undefined ? null : (v as string | boolean | null);
  }
  if (command.kind === 'REGISTER_NODE' && !('displayName' in map)) {
    map.displayName = null;
  }
  if (command.kind === 'REGISTER_STREAM') {
    if (!('nodeId' in map)) map.nodeId = null;
    if (!('mqttTopic' in map)) map.mqttTopic = null;
  }
  const sortedKeys = Object.keys(map).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const pairs = sortedKeys.map(key => {
    const val = map[key];
    const encodedVal =
      val === null
        ? 'null'
        : typeof val === 'boolean'
        ? String(val)
        : quoteCanonString(String(val));
    return `${quoteCanonString(key)}:${encodedVal}`;
  });
  return `{${pairs.join(',')}}`;
}

export function serializeZoneSourceWirePayload(
  command: ZoneSourceOperationRequest
): string {
  return JSON.stringify(command);
}

export function formatTextValidationMessage(
  fieldLabel: string,
  code: string,
  maxLength: number,
  t: (k: string, values?: readonly (string | number | null)[]) => string = (k, vals) => {
    if (!vals || vals.length === 0) return k;
    return vals.reduce<string>(
      (acc, v, idx) => acc.replace(new RegExp(`\\{${idx}\\}`, 'g'), String(v ?? '')),
      k
    );
  }
): string {
  switch (code) {
    case 'REQUIRED':
      return t('{0} là bắt buộc.', [fieldLabel]);
    case 'TOO_LONG':
      return t('{0} không được vượt quá {1} ký tự.', [fieldLabel, maxLength]);
    case 'TEXT_NUL':
      return t('{0} không được chứa ký tự NUL.', [fieldLabel]);
    case 'TEXT_CONTROL':
      return t('{0} không được chứa ký tự điều khiển hoặc xuống dòng/tab không hợp lệ.', [
        fieldLabel,
      ]);
    case 'TEXT_UNICODE':
      return t('{0} chứa ký tự Unicode không hợp lệ.', [fieldLabel]);
    case 'MQTT_WILDCARD':
      return t('Topic MQTT không được chứa ký tự đại diện wildcard (#, +).');
    case 'MQTT_SLASH':
      return t('Topic MQTT không được bắt đầu hoặc kết thúc bằng dấu /.');
    case 'MQTT_THREE_LEVELS_REQUIRED':
      return t('Topic MQTT phải gồm đúng 3 tầng phân cách bởi /.');
    default:
      return t('{0} không hợp lệ.', [fieldLabel]);
  }
}

export function isMqttAssignOrReplace(
  cmd:
    | AssignMqttOperationRequest
    | AssignIotLabOperationRequest
    | ReplaceMqttOperationRequest
    | ReplaceIotLabOperationRequest
): cmd is AssignMqttOperationRequest | ReplaceMqttOperationRequest {
  return (
    !('mappingId' in cmd) &&
    !('expectedMappingVersion' in cmd) &&
    !('bindIfUnbound' in cmd)
  );
}

export function validateZoneSourceOperationRequest(
  command: ZoneSourceOperationRequest,
  options?: { adapterKind?: 'MQTT' | 'IOTLAB_HTTP' }
): { valid: boolean; fieldErrors: ZoneSourceFieldError[] } {
  const errors: ZoneSourceFieldError[] = [];
  const push = (field: string, code: string) => errors.push({ field, code });

  if (command.contractVersion !== 'ZS-1') {
    push('contractVersion', 'INVALID_CONTRACT_VERSION');
  }
  if (!isValidUuidV4(command.operationId)) {
    push('operationId', 'INVALID_UUID_V4');
  }

  const reasonCode = validateStrictText(command.reason, {
    nullable: false,
    maxLength: 1000,
    allowBlank: false,
    allowControls: false,
  });
  if (reasonCode !== 'OK') push('reason', reasonCode);

  if (command.kind === 'REGISTER_NODE') {
    if (!isValidPositiveDecimalId(command.providerId)) push('providerId', 'INVALID_ID');
    if (command.nodeKind !== 'STATION' && command.nodeKind !== 'DEVICE') {
      push('nodeKind', 'INVALID_NODE_KIND');
    }
    const extCode = validateStrictText(command.externalId, {
      nullable: false,
      maxLength: 255,
      allowBlank: false,
      allowControls: false,
    });
    if (extCode !== 'OK') push('externalId', extCode);

    const dnCode = validateStrictText(command.displayName, {
      nullable: true,
      maxLength: 200,
      allowBlank: true,
      allowControls: true,
    });
    if (dnCode !== 'OK') push('displayName', dnCode);
  } else if (command.kind === 'REGISTER_STREAM') {
    if (!isValidPositiveDecimalId(command.providerId)) push('providerId', 'INVALID_ID');
    const extCode = validateStrictText(command.externalId, {
      nullable: false,
      maxLength: 255,
      allowBlank: false,
      allowControls: false,
    });
    if (extCode !== 'OK') push('externalId', extCode);
    if (!(ALL_SENSOR_TYPES as readonly SensorType[]).includes(command.sensorType)) {
      push('sensorType', 'INVALID_SENSOR_TYPE');
    }

    const hasNode = command.nodeId !== null;
    const hasTopic = command.mqttTopic !== null;
    if (hasNode === hasTopic) {
      push('nodeId', 'MUTUALLY_EXCLUSIVE_NODE_OR_TOPIC');
    } else if (hasNode) {
      if (!isValidPositiveDecimalId(command.nodeId)) push('nodeId', 'INVALID_ID');
    } else {
      const topicErr = validateThreeLevelMqttTopic(command.mqttTopic);
      if (topicErr) push('mqttTopic', topicErr);
    }
  } else if (command.kind === 'ASSIGN' || command.kind === 'REPLACE') {
    const zoneCodeErr = validateStrictText(command.zoneCode, {
      nullable: false,
      maxLength: 255,
      allowBlank: false,
      allowControls: false,
    });
    if (zoneCodeErr !== 'OK') push('zoneCode', zoneCodeErr);
    if (!isValidPositiveDecimalId(command.sensorId)) push('sensorId', 'INVALID_ID');
    if (!isValidPositiveDecimalId(command.newStreamId)) push('newStreamId', 'INVALID_ID');
    if (!isValidDecimalVersion(command.newExpectedVersion)) {
      push('newExpectedVersion', 'INVALID_VERSION');
    }
    if (
      command.expectedCurrentAssignmentId !== null &&
      !isValidPositiveDecimalId(command.expectedCurrentAssignmentId)
    ) {
      push('expectedCurrentAssignmentId', 'INVALID_ID');
    }
    if (!['OPEN', 'NONE', 'CLOSED'].includes(command.expectedCurrentState)) {
      push('expectedCurrentState', 'INVALID_STATE');
    }
    const unitCode = validateStrictText(command.expectedUnit, {
      nullable: true,
      maxLength: 64,
      allowBlank: false,
      allowControls: false,
    });
    if (unitCode !== 'OK') push('expectedUnit', unitCode);

    const extSensorCode = validateStrictText(command.expectedExternalSensorId, {
      nullable: true,
      maxLength: 255,
      allowBlank: false,
      allowControls: false,
    });
    if (extSensorCode !== 'OK') push('expectedExternalSensorId', extSensorCode);

    if (command.kind === 'REPLACE') {
      if (!isValidPositiveDecimalId(command.oldStreamId)) push('oldStreamId', 'INVALID_ID');
      if (!isValidPositiveDecimalId(command.oldAssignmentId)) push('oldAssignmentId', 'INVALID_ID');
      if (!isValidDecimalVersion(command.oldExpectedVersion)) {
        push('oldExpectedVersion', 'INVALID_VERSION');
      }
      if (command.oldStreamId === command.newStreamId) {
        push('newStreamId', 'SAME_STREAM_NOT_ALLOWED_FOR_REPLACE');
      }
      if ((command.expectedCurrentState as string) === 'OPEN') {
        push('expectedCurrentState', 'REPLACE_TARGET_MUST_BE_NONE_OR_CLOSED');
      }
    }

    const hasAnyIotField =
      'mappingId' in command ||
      'expectedMappingVersion' in command ||
      'bindIfUnbound' in command;

    if (options?.adapterKind === 'MQTT' || (!hasAnyIotField && command.mqttTopic !== null)) {
      if (hasAnyIotField) {
        push('mappingId', 'FORBIDDEN_ON_MQTT');
      }
      if (command.reactivatePolling !== false) {
        push('reactivatePolling', 'FORBIDDEN_ON_MQTT');
      }
      if (command.expectedExternalSensorId !== null) {
        push('expectedExternalSensorId', 'FORBIDDEN_ON_MQTT');
      }
      const topicErr = validateThreeLevelMqttTopic(command.mqttTopic);
      if (topicErr) push('mqttTopic', topicErr);
    } else {
      const iot = command as AssignIotLabOperationRequest | ReplaceIotLabOperationRequest;
      if (iot.mqttTopic !== null) {
        push('mqttTopic', 'FORBIDDEN_ON_IOTLAB');
      }
      if (!isValidPositiveDecimalId(iot.mappingId)) {
        push('mappingId', 'INVALID_ID');
      }
      if (!isValidDecimalVersion(iot.expectedMappingVersion)) {
        push('expectedMappingVersion', 'INVALID_VERSION');
      }
      if (typeof iot.bindIfUnbound !== 'boolean') {
        push('bindIfUnbound', 'INVALID_BOOLEAN');
      }
    }
  } else if (command.kind === 'DISABLE') {
    const zoneCodeErr = validateStrictText(command.zoneCode, {
      nullable: false,
      maxLength: 255,
      allowBlank: false,
      allowControls: false,
    });
    if (zoneCodeErr !== 'OK') push('zoneCode', zoneCodeErr);
    if (!isValidPositiveDecimalId(command.sensorId)) push('sensorId', 'INVALID_ID');
    if (!isValidPositiveDecimalId(command.oldStreamId)) push('oldStreamId', 'INVALID_ID');
    if (!isValidPositiveDecimalId(command.oldAssignmentId)) push('oldAssignmentId', 'INVALID_ID');
    if (!isValidDecimalVersion(command.oldExpectedVersion)) {
      push('oldExpectedVersion', 'INVALID_VERSION');
    }
  }

  const wireBytes = getUtf8ByteLength(serializeZoneSourceWirePayload(command));
  if (wireBytes > MAX_COMMAND_BYTES) {
    push('$request', 'BODY_TOO_LARGE');
  }

  return {
    valid: errors.length === 0,
    fieldErrors: errors,
  };
}

export function formatGmt7DateTime(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00';
  return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}:${get('second')} GMT+7`;
}

export function formatRelativeAge(
  ageSeconds: number | null | undefined,
  lang: 'vi' | 'en' = 'vi'
): string {
  if (ageSeconds === null || ageSeconds === undefined || !Number.isFinite(ageSeconds)) {
    return lang === 'vi' ? 'Chưa xác định' : 'Unknown';
  }
  if (ageSeconds < 0) {
    return lang === 'vi' ? 'Mốc thời gian vượt hiện tại' : 'Future timestamp';
  }
  if (ageSeconds < 60) {
    return lang === 'vi' ? `${Math.floor(ageSeconds)} giây trước` : `${Math.floor(ageSeconds)}s ago`;
  }
  const mins = Math.floor(ageSeconds / 60);
  if (mins < 60) {
    return lang === 'vi' ? `${mins} phút trước` : `${mins}m ago`;
  }
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return lang === 'vi' ? `${hours} giờ trước` : `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return lang === 'vi' ? `${days} ngày trước` : `${days}d ago`;
}
