# TicketHub – Web đặt vé xem phim / sự kiện

React (Vite) + Node.js (Express) + SQL Server + Socket.IO + MoMo Sandbox.

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

Sau `TicketBookingDB.sql`, chạy thêm bản vá đặt vé `database/migration_b_booking.sql` (chạy lại nhiều lần không sao): chặn đổi ghế khi đang có đơn chờ thanh toán, không để 2 đơn chờ cùng giữ một ghế, kiểm tra lại suất chiếu khi tạo đơn, tính cả đơn đang chờ vào số lượt của mã giảm giá.

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

## 2. Thanh toán MoMo Sandbox

1. Cấu hình MoMo Sandbox đã có sẵn trong `server/.env.example` và `server/.env`.
2. Hỗ trợ tạo mã thanh toán, QR code MoMo Test và link chuyển tiếp sang cổng MoMo Sandbox.
3. Hỗ trợ tự động đối soát giao dịch (polling mỗi 3s) và IPN webhook (`/api/payments/momo/ipn`).
4. Có sẵn nút **"⚡ Giả lập thanh toán thành công (Dev/Demo)"** trực tiếp trên trang thanh toán để test nhanh toàn bộ luồng mà không cần nhập thẻ.
5. Chưa điền email SMTP thì email vé chỉ in ra console của server.

Gợi ý demo: đặt `HOLD_MINUTES=1` trong `server/.env` để thử cảnh hết hạn giữ chỗ nhanh.

## Lấy code mới của nhóm (pull)

Chạy trong thư mục dự án:

```bash
git switch dev
git pull
```

Sau mỗi lần pull, kiểm tra 4 việc (bỏ qua việc nào không có thay đổi):

1. **Thư viện:** nếu `server/package.json` hoặc `client/package.json` đổi thì chạy `npm install` trong thư mục đó.
2. **Database:** nếu `database/` có file `migration_*.sql` mới thì chạy file đó (các file migration chạy lại nhiều lần không sao):
   ```bash
   sqlcmd -S . -E -C -I -f 65001 -d TicketBookingDB -i database\ten_file.sql
   ```
   Hoặc mở file trong SSMS, chọn database `TicketBookingDB` rồi bấm Execute.
3. **Cấu hình:** so `server/.env.example` với `server/.env` của mình, dòng nào mới thì chép sang `.env` và điền giá trị. Không commit file `.env`.
4. **Khởi động lại** server (`npm run dev`) để nhận code và cấu hình mới.

Làm việc mới thì tạo nhánh từ `dev`: `git switch -c feature/<mã-việc>-<mô-tả>`, xong mở Pull Request vào `dev`.

## Trợ lý AI (chatbot Gemini)

Ô chat **"Hỏi trợ lý"** ở góc phải các trang khách. Bot trả lời từ dữ liệu thật (sự kiện, suất, ghế trống, giá, mã giảm giá, combo) và gợi ý link đặt vé; bot chỉ đọc dữ liệu, không giữ ghế hay tạo đơn.

Mỗi người tự tạo key **miễn phí** của Google (không cần thẻ):

1. Vào https://aistudio.google.com, đăng nhập bằng Gmail.
2. Bấm biểu tượng **chìa khóa** ở góc dưới bên trái (trang API keys) → **Create API key** → đặt tên (VD `TicketHub`), chọn **Default Gemini Project** → **Create key** → **Copy**.
3. Thêm vào cuối `server/.env`:
   ```
   GEMINI_API_KEY=key-vừa-copy
   GEMINI_MODEL=gemini-3.5-flash-lite
   ```
4. Trong `server` chạy `npm install` (lần đầu, để cài `@google/genai`) rồi khởi động lại server.

Lưu ý:
- Key là bí mật: chỉ để trong `server/.env`, không dán vào code, README hay nhóm chat.
- Gói miễn phí giới hạn số lượt mỗi ngày (tính theo project). Hết lượt thì bot báo "đang quá tải"; đợi qua ngày hoặc đổi `GEMINI_MODEL` sang model khác trong AI Studio (VD `gemini-4-hydrogen`).
- Chưa có key thì ô chat báo "Trợ lý AI chưa được cấu hình", phần còn lại của web vẫn chạy bình thường.
- Server giới hạn mỗi IP 15 câu / 5 phút để giữ lượt miễn phí.

## 3. Phần nào đã làm, phần nào còn lại

| Đã có (chạy được khi có SQL Server) | Còn lại để nhóm làm |
|---|---|
| Đăng ký, đăng nhập, quên/đổi mật khẩu, phân quyền (A3, A4) | Giao diện admin sự kiện, địa điểm/phòng/ghế, suất chiếu, người dùng (A8-A11) – API đã có sẵn, trang hiện đang là `AdminTodo` |
| Trang chủ, tìm kiếm, lọc, chi tiết, suất chiếu, đánh giá (A5-A7) | Giao diện admin mã giảm giá và combo (B6) – API đã có |
| Sơ đồ ghế, giữ ghế, đồng hồ, realtime, job nhả ghế (B1-B4) | Trang yêu thích, upload ảnh trong form |
| Checkout, combo, mã giảm giá, tạo đơn, thông báo, dashboard (B5, B7, B8) | Seed dữ liệu demo 6 sự kiện và đơn mẫu (B9) |
| MoMo Sandbox, IPN, trang thanh toán, vé QR, email, soát vé, hoàn vé, đối soát (C1-C7) | Test tự động, deploy, tối ưu giao diện điện thoại |

Mỗi người đọc code của mình rồi sửa, mở rộng. Quy ước làm việc xem trong tài liệu phân công của nhóm.

## 4. Lỗi thường gặp

- **Không kết nối được SQL Server:** bật TCP/IP trong SQL Server Configuration Manager, kiểm tra cổng 1433, đăng nhập bằng SQL login (không phải Windows Authentication), đặt `DB_TRUST_CERT=true`.
- **Ghế báo "vừa có người khác chọn":** đúng thiết kế, hai người không giữ chung một ghế được.
- **Camera soát vé không mở:** trình duyệt chỉ cho dùng camera trên `localhost` hoặc HTTPS (khi thử trên điện thoại, dùng link của Cloudflare Tunnel).
