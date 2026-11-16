# API TicketHub (bản nháp để cả nhóm thống nhất)

Mọi phản hồi có dạng `{ "success": true|false, "data": ..., "message": "..." }`. JSON dùng camelCase. Thời gian là UTC (chuỗi ISO), client đổi sang giờ Việt Nam khi hiển thị.
Đăng nhập: gửi header `Authorization: Bearer <token>`.
Lỗi nghiệp vụ từ procedure (mã 50001–50052) trả HTTP 400, riêng ghế bị chiếm / trùng lịch (50005, 50006, 50052) trả 409. Chưa đăng nhập: 401. Sai quyền: 403.

## Người A – nội dung và quản trị

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| POST | /api/auth/register, /login, /forgot-password, /reset-password | Tài khoản |
| GET | /api/auth/me | Thông tin người đăng nhập |
| PUT | /api/users/me, /api/users/me/password | Hồ sơ, đổi mật khẩu |
| GET | /api/movies?q&genreId&status&cinemaId&page&limit | Danh sách + lọc |
| GET | /api/movies/:id, /api/movies/:id/showtimes?date&cinemaId | Chi tiết, suất chiếu |
| GET | /api/genres, /api/cinemas, /api/showtimes/:id | Dữ liệu tham chiếu |
| GET/POST | /api/movies/:id/reviews | Đánh giá |
| GET/POST/DELETE | /api/favorites, /api/favorites/:movieId | Yêu thích |
| CRUD | /api/admin/movies, /cinemas, /rooms, /showtimes, /users | Quản trị (ADMIN) |
| POST | /api/admin/rooms/:id/generate-seats, /api/admin/upload | Sinh sơ đồ ghế, upload ảnh |

## Người B – đặt vé, đơn hàng, thống kê

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | /api/showtimes/:id/seats | Sơ đồ ghế (AVAILABLE/HELD/SOLD, `heldByMe`) |
| POST/DELETE | /api/showtimes/:id/hold | Giữ ghế `{ seatIds: [] }` / bỏ giữ |
| GET | /api/products | Combo |
| POST | /api/coupons/validate | Xem trước giảm giá `{ code, subTotal }` |
| POST | /api/orders | Tạo đơn `{ showtimeId, seatIds, couponCode?, combos? }` |
| GET | /api/orders/me, /api/orders/:id | Đơn của tôi |
| POST | /api/orders/:id/cancel | Hủy đơn chưa thanh toán |
| GET/PATCH | /api/notifications, /api/notifications/:id/read | Thông báo |
| CRUD | /api/admin/coupons, /api/admin/products | Mã giảm giá, combo (ADMIN). Không xóa, chỉ tắt bằng `PUT { isActive: false }`. PUT mã giảm giá chỉ sửa được `description, maxDiscount, minOrderAmount, maxUses, startAt, endAt, isActive` (không đổi mã, loại, mức giảm); tạo trùng mã trả 409 |
| GET | /api/admin/stats/summary, /revenue-by-day, /revenue-by-movie, /api/admin/orders/recent | Dashboard (ADMIN) |

## Người C – thanh toán, vé, soát vé

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| POST | /api/payments/create | Tạo link/QR PayOS `{ orderId }` |
| POST | /api/payments/webhook | PayOS gọi (không JWT, xác thực bằng chữ ký) |
| GET | /api/payments/:orderId/status | Trạng thái đơn để client hỏi lại |
| GET | /api/tickets/me, /api/tickets/:id | Vé kèm ảnh QR |
| POST | /api/staff/checkin | Soát vé `{ qrToken }` (STAFF/ADMIN) |
| POST | /api/orders/:id/refund | Hoàn vé (người dùng) |
| POST | /api/admin/orders/:id/refund | Hoàn vé (admin) |
| GET | /api/admin/payments/review | Giao dịch cần đối soát |

## Socket.IO

| Sự kiện | Phòng nhận | Dữ liệu |
|---|---|---|
| client gửi `showtime:join` / `showtime:leave` | | `showtimeId` |
| `seat:held`, `seat:released`, `seat:sold` | `showtime:{id}` | `{ showtimeId, seatIds }` |
| `payment:success`, `notification:new` | `user:{id}` (tự vào khi kết nối kèm token) | `{ orderId }` |
