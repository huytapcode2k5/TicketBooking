import { getIO } from './io.js';

// Quản lý trạng thái khóa sửa trực tiếp trong bộ nhớ
// Key: `${entity}:${entityId}` (ví dụ: 'movie:12', 'showtime:4', ...)
const activeEdits = new Map();
const LOCK_TIMEOUT_MS = 2 * 60 * 1000; // 2 phút tự động giải phóng nếu mất kết nối/không có heartbeat

function cleanExpiredLocks() {
  const now = Date.now();
  let changed = false;
  for (const [key, lock] of activeEdits.entries()) {
    if (now - lock.updatedAt > LOCK_TIMEOUT_MS) {
      activeEdits.delete(key);
      changed = true;
    }
  }
  return changed;
}

function getActiveLocksPayload() {
  cleanExpiredLocks();
  const obj = {};
  for (const [key, lock] of activeEdits.entries()) {
    obj[key] = {
      entity: lock.entity,
      entityId: lock.entityId,
      adminId: lock.adminId,
      adminName: lock.adminName,
      startedAt: lock.startedAt,
    };
  }
  return obj;
}

export function registerPresenceSocket(io, socket) {
  const user = socket.data.user;

  // Chỉ cho phép tài khoản Admin tham gia kiểm soát khóa chỉnh sửa
  if (user?.role !== 'ADMIN') return;

  // 1. Khi client admin yêu cầu danh sách các mục đang được chỉnh sửa
  socket.on('admin:get_active_edits', (callback) => {
    if (typeof callback === 'function') {
      callback(getActiveLocksPayload());
    }
  });

  // 2. Khi admin bắt đầu mở form / modal chỉnh sửa một thực thể
  socket.on('admin:start_edit', ({ entity, entityId, adminName }, callback) => {
    if (!entity || !entityId) return;
    const key = `${entity}:${entityId}`;
    const now = Date.now();
    cleanExpiredLocks();

    const existing = activeEdits.get(key);
    // Nếu đang có một admin khác sửa và chưa hết hạn
    if (existing && existing.adminId !== user.userId && now - existing.updatedAt < LOCK_TIMEOUT_MS) {
      if (typeof callback === 'function') {
        callback({
          success: false,
          lockedByOther: true,
          editor: {
            adminId: existing.adminId,
            adminName: existing.adminName,
            startedAt: existing.startedAt,
          },
        });
      }
      return;
    }

    // Đặt khóa chỉnh sửa cho admin hiện tại
    const lock = {
      entity,
      entityId: String(entityId),
      adminId: user.userId,
      adminName: adminName || user.fullName || user.email || 'Admin',
      socketId: socket.id,
      startedAt: existing?.startedAt || new Date().toISOString(),
      updatedAt: now,
    };
    activeEdits.set(key, lock);

    // Phát thông báo cho toàn bộ các Admin khác trên hệ thống
    io.to('role:admin').emit('admin:active_edits', getActiveLocksPayload());

    if (typeof callback === 'function') {
      callback({
        success: true,
        lockedByOther: false,
        editor: {
          adminId: lock.adminId,
          adminName: lock.adminName,
          startedAt: lock.startedAt,
        },
      });
    }
  });

  // 3. Heartbeat giữ khóa khi form vẫn đang mở
  socket.on('admin:heartbeat_edit', ({ entity, entityId }) => {
    if (!entity || !entityId) return;
    const key = `${entity}:${entityId}`;
    const existing = activeEdits.get(key);
    if (existing && existing.adminId === user.userId) {
      existing.updatedAt = Date.now();
    }
  });

  // 4. Khi admin đóng form, lưu thành công hoặc hủy
  socket.on('admin:stop_edit', ({ entity, entityId }) => {
    if (!entity || !entityId) return;
    const key = `${entity}:${entityId}`;
    const existing = activeEdits.get(key);
    if (existing && (existing.adminId === user.userId || existing.socketId === socket.id)) {
      activeEdits.delete(key);
      io.to('role:admin').emit('admin:active_edits', getActiveLocksPayload());
    }
  });

  // 5. Khi socket ngắt kết nối (tắt tab / tải lại trang), tự động giải phóng tất cả khóa của socket đó
  socket.on('disconnect', () => {
    let released = false;
    for (const [key, lock] of activeEdits.entries()) {
      if (lock.socketId === socket.id) {
        activeEdits.delete(key);
        released = true;
      }
    }
    if (released) {
      io.to('role:admin').emit('admin:active_edits', getActiveLocksPayload());
    }
  });
}

// Định kỳ dọn dẹp các khóa quá hạn
setInterval(() => {
  if (cleanExpiredLocks()) {
    const io = getIO();
    if (io) io.to('role:admin').emit('admin:active_edits', getActiveLocksPayload());
  }
}, 30000);
