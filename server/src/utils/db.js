import { getPool, sql } from '../config/db.js';
import { HttpError } from './httpError.js';

const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);

/** Đổi tên cột PascalCase của SQL Server sang camelCase cho JSON. */
export function camelize(v) {
  if (Array.isArray(v)) return v.map(camelize);
  if (v && typeof v === 'object' && !(v instanceof Date) && !Buffer.isBuffer(v)) {
    return Object.fromEntries(Object.entries(v).map(([k, val]) => [lowerFirst(k), camelize(val)]));
  }
  return v;
}

function toParam(value) {
  if (value === null || value === undefined) return [sql.NVarChar(sql.MAX), null];
  if (value instanceof Date) return [sql.DateTime2, value];
  switch (typeof value) {
    case 'number':
      if (!Number.isInteger(value)) return [sql.Float, value];
      return [Math.abs(value) > 2147483647 ? sql.BigInt : sql.Int, value];
    case 'boolean':
      return [sql.Bit, value];
    default:
      return [sql.NVarChar(sql.MAX), String(value)];
  }
}

function bind(request, params) {
  for (const [name, value] of Object.entries(params)) {
    const [type, val] = toParam(value);
    request.input(name, type, val);
  }
  return request;
}

/** Lỗi THROW 50xxx trong procedure -> HttpError có message tiếng Việt. */
function mapError(e) {
  const num = e?.number ?? e?.originalError?.info?.number;
  if (num >= 50000 && num < 51000) {
    const conflict = [50005, 50006, 50052].includes(num);
    return new HttpError(conflict ? 409 : 400, e.message, { code: num });
  }
  if (num === 2601 || num === 2627) return new HttpError(409, 'Dữ liệu bị trùng.', { code: num });
  return e;
}

/** Gọi stored procedure. outputs: { TenThamSo: sql.Int }. Trả về { rows, output }. */
export async function callProc(name, params = {}, outputs = {}) {
  try {
    const request = bind((await getPool()).request(), params);
    for (const [k, type] of Object.entries(outputs)) request.output(k, type);
    const result = await request.execute(name);
    return { rows: camelize(result.recordset ?? []), output: result.output ?? {} };
  } catch (e) {
    throw mapError(e);
  }
}

/** Chạy câu SQL có tham số @Ten. Trả về mảng dòng (camelCase). */
export async function query(text, params = {}) {
  try {
    const request = bind((await getPool()).request(), params);
    const result = await request.query(text);
    return camelize(result.recordset ?? []);
  } catch (e) {
    throw mapError(e);
  }
}

/** UPDATE theo id; allowed: { tenTruongJson: 'TenCot' } để chỉ cập nhật cột cho phép. */
export async function updateById(table, idCol, id, body, allowed) {
  const sets = [];
  const params = { Id: id };
  for (const [key, col] of Object.entries(allowed)) {
    if (body[key] !== undefined) {
      sets.push(`${col} = @${key}`);
      params[key] = body[key];
    }
  }
  if (!sets.length) throw new HttpError(400, 'Không có dữ liệu để cập nhật.');
  const rows = await query(`UPDATE ${table} SET ${sets.join(', ')} OUTPUT INSERTED.* WHERE ${idCol} = @Id`, params);
  if (!rows.length) throw new HttpError(404, 'Không tìm thấy dữ liệu.');
  return rows[0];
}

export function toId(value, label = 'id') {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, `Tham số ${label} không hợp lệ.`);
  return n;
}

export { sql };
