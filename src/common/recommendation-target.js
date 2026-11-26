import {urlOf, isMediaUrl} from './urls.js';

// The observed CM sync/v2 msg.e payload is protobuf. Its top-level field 23
// contains the destination, not an arbitrary URL found inside another field.
// Unknown encodings or shapes fall back to the existing redirect resolver.
export function recommendationMediaUrl(value) {
  const source = urlOf(value);
  if (!source || source.hostname !== 'cm.bilibili.com'
      || source.pathname !== '/cm/api/fees/pc/sync/v2') return '';
  const messages = source.searchParams.getAll('msg');
  if (messages.length !== 1 || messages[0].length > 65536) return '';
  const fields = messages[0].split(',').filter(field => field.startsWith('e|'));
  if (fields.length !== 1) return '';
  const encoded = fields[0].slice(2);
  if (!encoded || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return '';
  try {
    const bytes = atob(encoded);
    let offset = 0, destination = '';
    function uint32() {
      let value = 0;
      for (let i = 0; i < 5; i++) {
        if (offset >= bytes.length) throw new Error('Truncated varint');
        const byte = bytes.charCodeAt(offset++);
        if (i === 4 && byte > 15) throw new Error('Varint overflow');
        value += (byte & 127) * 2 ** (7 * i);
        if (!(byte & 128)) return value;
      }
      throw new Error('Invalid varint');
    }
    while (offset < bytes.length) {
      const tag = uint32(), field = Math.floor(tag / 8), wire = tag % 8;
      if (!field) return '';
      if (wire === 2) {
        const length = uint32(), end = offset + length;
        if (end > bytes.length) return '';
        if (field === 23) {
          if (destination || !length) return '';
          destination = new TextDecoder('utf-8', {fatal:true}).decode(
            Uint8Array.from(bytes.slice(offset, end), byte => byte.charCodeAt(0)));
        }
        offset = end;
      } else if (wire === 0) {
        // Other fields include 64-bit IDs. Skip those without losing precision.
        let ended = false;
        for (let i = 0; i < 10 && offset < bytes.length; i++) {
          const byte = bytes.charCodeAt(offset++);
          if (i === 9 && byte > 1) return '';
          if (!(byte & 128)) { ended = true; break; }
        }
        if (!ended || field === 23) return '';
      } else if (wire === 1 || wire === 5) {
        if (field === 23) return '';
        offset += wire === 1 ? 8 : 4;
        if (offset > bytes.length) return '';
      } else return '';
    }
    // Preserve the destination's query/hash, but never accept credentials,
    // external URLs, nested URL parameters, or unsupported playback paths.
    if (!/^https?:\/\//i.test(destination) || /[\u0000-\u0020\u007f]/.test(destination)) return '';
    const target = urlOf(destination);
    return target && !target.username && !target.password && !target.port && isMediaUrl(target) ? target.href : '';
  } catch { return ''; }
}
