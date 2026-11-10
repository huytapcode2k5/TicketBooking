import cron from 'node-cron';
import { query, callProc } from '../utils/db.js';
import { emitSeatRows } from '../sockets/seat.socket.js';

/** Mỗi 30 giây: nhả ghế hết hạn, đánh dấu đơn PENDING quá hạn là EXPIRED, báo realtime cho client. */
export function startExpireHoldsJob() {
  cron.schedule('*/30 * * * * *', async () => {
    try {
      const expired = await query('SELECT ShowtimeId, SeatId FROM SeatHolds WHERE ExpiresAt <= SYSUTCDATETIME()');
      const { rows } = await callProc('sp_ReleaseExpiredHolds');
      if (expired.length) {
        emitSeatRows('seat:released', expired);
        console.log(`[job] nhả ${rows[0]?.releasedHolds ?? expired.length} ghế, ${rows[0]?.expiredOrders ?? 0} đơn hết hạn`);
      }
    } catch (e) {
      console.error('[job] expireHolds lỗi:', e.message);
    }
  });
}
