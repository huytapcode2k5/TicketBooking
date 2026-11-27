import { useEffect, useState, useCallback, useRef } from 'react';
import { getSocket } from '../api/socket.js';
import { useAuth } from '../contexts/AuthContext.jsx';

/**
 * Hook quản lý trạng thái Admin đang chỉnh sửa dữ liệu theo thời gian thực (Collaborative Presence Lock).
 */
export function useAdminPresence() {
  const { user } = useAuth();
  const [activeEdits, setActiveEdits] = useState({});
  const heartbeatTimerRef = useRef(null);
  const currentEditingRef = useRef(null);

  // Nhận cập nhật trạng thái khóa sửa từ server
  useEffect(() => {
    const s = getSocket();

    const handleActiveEdits = (edits) => {
      setActiveEdits(edits || {});
    };

    s.on('admin:active_edits', handleActiveEdits);

    // Lấy dữ liệu khóa đang hoạt động ngay khi kết nối
    s.emit('admin:get_active_edits', (edits) => {
      if (edits) setActiveEdits(edits);
    });

    return () => {
      s.off('admin:active_edits', handleActiveEdits);
    };
  }, []);

  // Lấy thông tin người đang sửa một đối tượng cụ thể
  const getEditor = useCallback(
    (entity, id) => {
      if (!entity || !id) return null;
      return activeEdits[`${entity}:${id}`] || null;
    },
    [activeEdits]
  );

  // Kiểm tra xem đối tượng có đang bị Admin KHÁC sửa không
  const isLockedByOther = useCallback(
    (entity, id) => {
      if (!entity || !id) return false;
      const editor = activeEdits[`${entity}:${id}`];
      return Boolean(editor && editor.adminId !== user?.userId);
    },
    [activeEdits, user?.userId]
  );

  // Bắt đầu khóa sửa
  const startEditing = useCallback(
    (entity, id) => {
      if (!entity || !id) return;
      const s = getSocket();
      currentEditingRef.current = { entity, id: String(id) };

      s.emit(
        'admin:start_edit',
        {
          entity,
          entityId: String(id),
          adminName: user?.fullName || user?.email || 'Admin',
        },
        (res) => {
          // Callback trả về kết quả
        }
      );

      // Thiết lập heartbeat định kỳ 35 giây để giữ khóa không bị quá hạn
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = setInterval(() => {
        if (currentEditingRef.current) {
          s.emit('admin:heartbeat_edit', {
            entity: currentEditingRef.current.entity,
            entityId: currentEditingRef.current.id,
          });
        }
      }, 35000);
    },
    [user?.fullName, user?.email]
  );

  // Dừng khóa sửa
  const stopEditing = useCallback((entity, id) => {
    const s = getSocket();
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    const targetEntity = entity || currentEditingRef.current?.entity;
    const targetId = id || currentEditingRef.current?.id;
    if (targetEntity && targetId) {
      s.emit('admin:stop_edit', { entity: targetEntity, entityId: String(targetId) });
    }
    currentEditingRef.current = null;
  }, []);

  // Tự động giải phóng khóa khi unmount hook
  useEffect(() => {
    return () => {
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      if (currentEditingRef.current) {
        const s = getSocket();
        s.emit('admin:stop_edit', {
          entity: currentEditingRef.current.entity,
          entityId: String(currentEditingRef.current.id),
        });
      }
    };
  }, []);

  return {
    activeEdits,
    getEditor,
    isLockedByOther,
    startEditing,
    stopEditing,
  };
}
