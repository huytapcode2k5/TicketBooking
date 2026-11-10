# TicketHub – Web đặt vé xem phim / sự kiện

React (Vite) + Node.js (Express) + SQL Server + Socket.IO + PayOS.

```
tickethub/
├── docs/API.md                    # danh sách API + sự kiện Socket.IO
├── server/                        # Node.js + Express
│   └── src/ config · middlewares · routes · controllers · services · jobs · sockets · utils
└── client/                        # React + Vite + Tailwind
    └── src/ api · components · contexts · hooks · layouts · pages · routes · utils
```

## 1. Chạy dự án

Cần: Node.js 20 trở lên, SQL Server (đã tạo database `TicketBookingDB`, bật SQL Server Authentication và TCP/IP).

**Server**
```bash
cd server
npm install
cp .env.example .env      # rồi sửa DB_USER, DB_PASSWORD, JWT_SECRET...
npm run dev               # http://localhost:5000/api/health
```

**Client**
```bash
cd client
npm install
npm run dev               # http://localhost:5173
```

Tài khoản mẫu: `admin@ticket.vn / Admin@123`, `staff@ticket.vn / Staff@123`, `user@ticket.vn / User@123`.

**Dữ liệu demo (B9):** sau khi chạy `TicketBookingDB.sql`, chạy thêm `database/seed_demo.sql` (SSMS, hoặc `sqlcmd -S . -E -C -I -f 65001 -i database\seed_demo.sql`). File tạo 6 sự kiện ở mục 7 tài liệu cùng 1 sự kiện đã kết thúc, 31 đơn đã thanh toán và 12 khách `demo01..demo12@ticket.vn / User@123`. Ngày giờ tính theo ngày chạy nên lúc nào demo cũng đủ trạng thái; chạy lại sẽ tự bỏ qua.

## 2. Thanh toán PayOS

1. Đăng ký PayOS, tạo kênh thanh toán, điền `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` vào `server/.env`.
2. Webhook cần URL công khai khi chạy ở máy cá nhân: `cloudflared tunnel --url http://localhost:5000` (hoặc ngrok).
3. Khai báo webhook trong PayOS: `https://<url-tunnel>/api/payments/webhook`.
4. Webhook không về thì giả lập trong SSMS: `EXEC sp_ConfirmPayment @OrderCode = <mã đơn>, @AmountPaid = <số tiền>;`
5. Chưa điền email SMTP thì email vé chỉ in ra console của server.

Gợi ý demo: đặt `HOLD_MINUTES=1` trong `server/.env` để thử cảnh hết hạn giữ chỗ nhanh.

## 3. Phần nào đã làm, phần nào còn lại

| Đã có (chạy được khi có SQL Server) | Còn lại để nhóm làm |
|---|---|
| Đăng ký, đăng nhập, quên/đổi mật khẩu, phân quyền (A3, A4) | Giao diện admin sự kiện, địa điểm/phòng/ghế, suất chiếu, người dùng (A8-A11) – API đã có sẵn, trang hiện đang là `AdminTodo` |
| Trang chủ, tìm kiếm, lọc, chi tiết, suất chiếu, đánh giá (A5-A7) | Giao diện admin mã giảm giá và combo (B6) – API đã có |
| Sơ đồ ghế, giữ ghế, đồng hồ, realtime, job nhả ghế (B1-B4) | Trang yêu thích, upload ảnh trong form |
| Checkout, combo, mã giảm giá, tạo đơn, thông báo, dashboard (B5, B7, B8) | Seed dữ liệu demo 6 sự kiện và đơn mẫu (B9) |
| PayOS, webhook, trang thanh toán, vé QR, email, soát vé, hoàn vé, đối soát (C1-C7) | Test tự động, deploy, tối ưu giao diện điện thoại |

Mỗi người đọc code của mình rồi sửa, mở rộng. Quy ước làm việc xem trong tài liệu phân công của nhóm.

## 4. Lỗi thường gặp

- **Không kết nối được SQL Server:** bật TCP/IP trong SQL Server Configuration Manager, kiểm tra cổng 1433, đăng nhập bằng SQL login (không phải Windows Authentication), đặt `DB_TRUST_CERT=true`.
- **Ghế báo "vừa có người khác chọn":** đúng thiết kế, hai người không giữ chung một ghế được.
- **Camera soát vé không mở:** trình duyệt chỉ cho dùng camera trên `localhost` hoặc HTTPS (khi thử trên điện thoại, dùng link của Cloudflare Tunnel).
