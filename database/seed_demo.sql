/* ============================================================================
   seed_demo.sql - Du lieu demo cho TicketHub (B9)

   Chay SAU file TicketBookingDB.sql (can co san bang, procedure, combo va
   tai khoan staff@ticket.vn). Chay bang SSMS, hoac:
       sqlcmd -S . -E -C -I -f 65001 -i database\seed_demo.sql

   Tao them:
   - 6 su kien o muc 7 tai lieu + 1 su kien da ket thuc, moi su kien mot dia diem
     va mot so do ghe dung kich thuoc / hang VIP / hang ghe doi
   - Ma giam gia EARLYBIRD va SINHVIEN (bo qua neu da co)
   - 12 khach demo: demo01..demo12@ticket.vn, mat khau User@123
   - 31 don da thanh toan rai trong 10 ngay gan nhat (co ve, thanh toan, thong bao)

   Trang thai de demo trang chu:
   - Sap het ve : Stand-up "Cuoi Khong Nghi"  (ban san 55/60 ghe)
   - Het ve     : Workshop, suat phu buoi sang (ban het 50/50 ghe)
   - Dang mo ban: Dem nhac "Ha Vang", "Startup Day" (khong ban san), Workshop suat chinh
   - Sap mo ban : "Arena Cup" (COMING_SOON, chua co suat)
   - Da ket thuc: Talkshow "Sinh vien thoi AI" (ENDED, ve da soat)

   NGAY GIO TINH THEO NGAY CHAY SCRIPT (giu dung gio dien va thu tu cua tai lieu)
   de luc nao demo cung du cac trang thai. Gio luu UTC, viet theo gio VN (UTC+7).
   Workshop suat chinh gia 10.000d de thanh toan that bang PayOS khi demo.

   Chay lai: script tu bo qua neu da co du lieu demo. Muon tao lai tu dau thi
   chay lai TicketBookingDB.sql (xoa toan bo du lieu) roi chay file nay.
   ============================================================================ */

USE TicketBookingDB;
GO

IF EXISTS (SELECT 1 FROM dbo.Movies WHERE Title = N'Workshop "Xây web full-stack với React và Node.js"')
BEGIN
    PRINT N'Đã có dữ liệu demo, bỏ qua. Muốn tạo lại: chạy lại TicketBookingDB.sql rồi chạy file này.';
    SET NOEXEC ON;
END
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;   -- loi bat ky dong nao thi huy toan bo, khong de du lieu do dang
BEGIN TRAN;

DECLARE @Now    DATETIME2 = SYSUTCDATETIME();
-- 00:00 hom nay theo gio VN, doi ra UTC
DECLARE @Today0 DATETIME2 = DATEADD(HOUR, -7, CAST(CAST(DATEADD(HOUR, 7, @Now) AS DATE) AS DATETIME2));
DECLARE @StaffId INT = COALESCE(
    (SELECT UserId FROM dbo.Users WHERE Email = N'staff@ticket.vn'),
    (SELECT TOP 1 UserId FROM dbo.Users WHERE Role IN ('STAFF', 'ADMIN') ORDER BY UserId));
IF @StaffId IS NULL THROW 50090, N'Chưa có tài khoản STAFF/ADMIN. Hãy chạy TicketBookingDB.sql trước.', 1;

/* ---------------------------------------------------------------------------
   1. The loai
   --------------------------------------------------------------------------- */
INSERT INTO dbo.Genres (Name)
SELECT g.Name FROM (VALUES (N'Workshop'), (N'Âm nhạc'), (N'Hài'), (N'Hội thảo'), (N'Ngoài trời'), (N'Esports'), (N'Talkshow')) g(Name)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Genres x WHERE x.Name = g.Name);

/* ---------------------------------------------------------------------------
   2. Dia diem, phong, so do ghe
   --------------------------------------------------------------------------- */
DECLARE @Venue TABLE (
    K INT PRIMARY KEY, Name NVARCHAR(150), Address NVARCHAR(300),
    NumRows INT, NumCols INT, VipFrom INT NULL, VipTo INT NULL, CoupleRow VARCHAR(2) NULL,
    CinemaId INT NULL, RoomId INT NULL);
INSERT INTO @Venue (K, Name, Address, NumRows, NumCols, VipFrom, VipTo, CoupleRow) VALUES
 (1, N'Hội trường A2',                    N'Khu giảng đường A, Trường Đại học (giả định)', 5,  10, 1, 2, NULL),
 (2, N'Nhà văn hóa Thanh Niên',           N'4 Phạm Ngọc Thạch, Quận 1 (giả định)',        10, 12, 1, 3, 'J'),
 (3, N'Phòng trà The Mic',                N'12 Đường Mẫu, Quận 3 (giả định)',              6,  10, 1, 2, NULL),
 (4, N'Trung tâm Hội nghị Sao Mai',       N'88 Đường Mẫu, Quận 7 (giả định)',             15, 20, 1, 3, NULL),
 (5, N'Công viên Hồ Xanh - Sân cỏ khu A', N'Công viên Hồ Xanh, TP. Thủ Đức (giả định)',    8,  15, NULL, NULL, 'H'),
 (6, N'Nhà thi đấu Đa Năng',              N'200 Đường Mẫu, Quận 10 (giả định)',           20, 25, 1, 4, NULL);

DECLARE @k INT = 1, @CinemaId INT, @RoomId INT, @r INT, @c INT, @vf INT, @vt INT;
WHILE @k <= 6
BEGIN
    INSERT INTO dbo.Cinemas (Name, Address, City, Phone)
    SELECT Name, Address, N'TP. Hồ Chí Minh', NULL FROM @Venue WHERE K = @k;
    SET @CinemaId = SCOPE_IDENTITY();

    INSERT INTO dbo.Rooms (CinemaId, Name) VALUES (@CinemaId, N'Khu khán giả');
    SET @RoomId = SCOPE_IDENTITY();

    SELECT @r = NumRows, @c = NumCols, @vf = VipFrom, @vt = VipTo FROM @Venue WHERE K = @k;
    EXEC dbo.sp_GenerateSeats @RoomId = @RoomId, @Rows = @r, @Cols = @c, @VipFromRow = @vf, @VipToRow = @vt;

    UPDATE s SET SeatType = 'COUPLE'
    FROM dbo.Seats s JOIN @Venue v ON v.K = @k
    WHERE s.RoomId = @RoomId AND s.RowLabel = v.CoupleRow;

    UPDATE @Venue SET CinemaId = @CinemaId, RoomId = @RoomId WHERE K = @k;
    SET @k += 1;
END

/* ---------------------------------------------------------------------------
   3. Su kien
   DayOffset/StartMin: so ngay tinh tu hom nay va gio bat dau theo gio VN (phut)
   --------------------------------------------------------------------------- */
DECLARE @Event TABLE (
    K INT PRIMARY KEY, Title NVARCHAR(250), Descr NVARCHAR(1000), Duration INT, Age VARCHAR(5),
    Organizer NVARCHAR(150), Performers NVARCHAR(500), Genre1 NVARCHAR(100), Genre2 NVARCHAR(100) NULL,
    VenueK INT, DayOffset INT, StartMin INT, PNormal INT, PVip INT, PCouple INT, Status VARCHAR(20),
    Poster VARCHAR(40), MovieId INT NULL);
INSERT INTO @Event VALUES
 (1, N'Workshop "Xây web full-stack với React và Node.js"',
     N'3 giờ thực hành dựng một web đặt vé từ A đến Z: React + Vite ở client, Node.js + Express ở server, SQL Server và thanh toán VietQR. Vé VIP (hàng A–B) kèm tài liệu in và chứng nhận tham dự.',
     180, 'P', N'CLB Lập trình Web (giả định)', N'Diễn giả: kỹ sư phần mềm khách mời', N'Workshop', N'Hội thảo',
     1, 3, 14*60, 10000, 20000, 20000, 'NOW_SHOWING', 'Workshop+React', NULL),
 (2, N'Đêm nhạc acoustic "Hạ Vàng"',
     N'Đêm nhạc mộc với guitar, cajon và những bản tình ca quen thuộc. Ghế đôi ở hàng cuối dành cho các cặp đôi.',
     150, 'P', N'Hạ Vàng Band (giả định)', N'Ca sĩ khách mời, ban nhạc Hạ Vàng', N'Âm nhạc', NULL,
     2, 7, 19*60+30, 120000, 250000, 220000, 'NOW_SHOWING', 'Ha+Vang', NULL),
 (3, N'Stand-up comedy "Cười Không Nghỉ"',
     N'100 phút hài độc thoại về đời sinh viên, công sở và mạng xã hội. Nội dung dành cho khán giả từ 16 tuổi.',
     100, 'T16', N'The Mic Comedy Club (giả định)', N'Các nghệ sĩ hài độc thoại', N'Hài', NULL,
     3, 10, 20*60, 150000, 300000, 300000, 'NOW_SHOWING', 'Cuoi+Khong+Nghi', NULL),
 (4, N'Hội thảo khởi nghiệp "Startup Day"',
     N'Một buổi sáng với các nhà sáng lập, quỹ đầu tư và phần gọi vốn trực tiếp. Vé VIP (hàng A–C) được giao lưu riêng với diễn giả.',
     240, 'P', N'Vườn ươm Khởi nghiệp (giả định)', N'Nhà sáng lập, nhà đầu tư khách mời', N'Hội thảo', NULL,
     4, 14, 8*60+30, 200000, 500000, 500000, 'NOW_SHOWING', 'Startup+Day', NULL),
 (5, N'Chiếu phim ngoài trời "Đêm phim dưới sao"',
     N'Xem phim trên bãi cỏ với màn chiếu lớn, bắp rang và chăn mỏng. Hàng ghế đôi H là ghế lười cho hai người.',
     120, 'P', N'Công viên Hồ Xanh (giả định)', N'Phim chiếu: tuyển chọn phim gia đình', N'Ngoài trời', NULL,
     5, 18, 19*60, 60000, 60000, 110000, 'NOW_SHOWING', 'Dem+Phim', NULL),
 (6, N'Chung kết esports "Arena Cup"',
     N'Trận chung kết giải sinh viên với bình luận trực tiếp và mini game cho khán giả. Vé sẽ mở bán sau khi chốt lịch thi đấu.',
     300, 'P', N'Arena Cup BTC (giả định)', N'Các đội tuyển vào chung kết', N'Esports', NULL,
     6, 25, 13*60, 80000, 200000, 200000, 'COMING_SOON', 'Arena+Cup', NULL),
 (7, N'Talkshow "Sinh viên thời AI"',
     N'Talkshow về học và làm việc cùng AI. Sự kiện đã diễn ra, giữ lại để xem lịch sử vé và doanh thu.',
     120, 'P', N'Đoàn Thanh niên (giả định)', N'Khách mời từ các công ty công nghệ', N'Talkshow', NULL,
     1, -6, 18*60, 50000, 80000, 80000, 'ENDED', 'Talkshow+AI', NULL);

INSERT INTO dbo.Movies (Title, Description, DurationMin, AgeRating, Director, Actors, Language, PosterUrl, BannerUrl, ReleaseDate, Status)
SELECT Title, Descr, Duration, Age, Organizer, Performers, N'Tiếng Việt',
       'https://placehold.co/300x450/151B2E/FFFFFF?text=' + Poster,
       'https://placehold.co/1200x500/151B2E/FFFFFF?text=' + Poster,
       CAST(DATEADD(HOUR, 7, DATEADD(MINUTE, StartMin, DATEADD(DAY, DayOffset, @Today0))) AS DATE),
       Status
FROM @Event ORDER BY K;

UPDATE e SET MovieId = m.MovieId FROM @Event e JOIN dbo.Movies m ON m.Title = e.Title;

INSERT INTO dbo.MovieGenres (MovieId, GenreId)
SELECT e.MovieId, g.GenreId FROM @Event e JOIN dbo.Genres g ON g.Name IN (e.Genre1, e.Genre2);

/* ---------------------------------------------------------------------------
   4. Suat dien (su kien 6 chua co suat vi dang "sap mo ban")
   --------------------------------------------------------------------------- */
DECLARE @Show TABLE (K VARCHAR(10) PRIMARY KEY, ShowtimeId INT, StartTime DATETIME2, Finished BIT);
DECLARE @ShowPlan TABLE (K VARCHAR(10), EventK INT, DayOffset INT NULL, StartMin INT NULL);
INSERT INTO @ShowPlan (K, EventK, DayOffset, StartMin) VALUES
 ('WORKSHOP', 1, NULL, NULL),
 ('WS_SANG',  1, 4, 9*60),      -- suat phu buoi sang, se ban het ve
 ('HAVANG',   2, NULL, NULL),
 ('STANDUP',  3, NULL, NULL),
 ('STARTUP',  4, NULL, NULL),
 ('DEMPHIM',  5, NULL, NULL),
 ('TALKSHOW', 7, NULL, NULL);

DECLARE @sk VARCHAR(10), @mid INT, @rid INT, @start DATETIME2, @pn INT, @pv INT, @pc INT, @sid INT;
DECLARE sc CURSOR LOCAL FAST_FORWARD FOR
    SELECT p.K, e.MovieId, v.RoomId,
           DATEADD(MINUTE, ISNULL(p.StartMin, e.StartMin), DATEADD(DAY, ISNULL(p.DayOffset, e.DayOffset), @Today0)),
           e.PNormal, e.PVip, e.PCouple
    FROM @ShowPlan p JOIN @Event e ON e.K = p.EventK JOIN @Venue v ON v.K = e.VenueK;
OPEN sc;
FETCH NEXT FROM sc INTO @sk, @mid, @rid, @start, @pn, @pv, @pc;
WHILE @@FETCH_STATUS = 0
BEGIN
    EXEC dbo.sp_CreateShowtime @mid, @rid, @start, @pn, @pv, @pc, @sid OUTPUT;
    INSERT INTO @Show VALUES (@sk, @sid, @start, CASE WHEN @start < @Now THEN 1 ELSE 0 END);
    FETCH NEXT FROM sc INTO @sk, @mid, @rid, @start, @pn, @pv, @pc;
END
CLOSE sc; DEALLOCATE sc;

UPDATE st SET Status = 'FINISHED'
FROM dbo.Showtimes st JOIN @Show s ON s.ShowtimeId = st.ShowtimeId WHERE s.Finished = 1;

/* ---------------------------------------------------------------------------
   5. Ma giam gia
   --------------------------------------------------------------------------- */
DECLARE @StartupAt DATETIME2 = (SELECT StartTime FROM @Show WHERE K = 'STARTUP');
INSERT INTO dbo.Coupons (Code, Description, DiscountType, DiscountValue, MaxDiscount, MinOrderAmount, MaxUses, StartAt, EndAt)
SELECT c.Code, c.Descr, c.DType, c.DValue, c.MaxD, c.MinO, c.MaxU, @Now, c.EndAt
FROM (VALUES
  ('EARLYBIRD', N'Giảm 20% vé Startup Day, tối đa 100.000đ, 50 lượt đầu', 'PERCENT', 20, 100000, 0, 50, @StartupAt),
  ('SINHVIEN',  N'Giảm 15.000đ cho đơn từ 100.000đ',                       'FIXED', 15000, NULL, 100000, NULL, DATEADD(MONTH, 3, @Now))
) c(Code, Descr, DType, DValue, MaxD, MinO, MaxU, EndAt)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Coupons x WHERE x.Code = c.Code);

/* ---------------------------------------------------------------------------
   6. Khach demo (mat khau User@123, bcrypt)
   --------------------------------------------------------------------------- */
INSERT INTO dbo.Users (Email, PasswordHash, FullName, Phone, Role, CreatedAt)
SELECT u.Email, N'$2a$10$yjA48p8B37GAVrR0AImkmOy6LkPdxu/Dyb3Le14Zgd14jsgj5jCjq', u.FullName, u.Phone, 'USER', DATEADD(DAY, -20, @Now)
FROM (VALUES
  (N'demo01@ticket.vn', N'Trần Minh Anh',    '0901000001'),
  (N'demo02@ticket.vn', N'Lê Hoàng Bảo',     '0901000002'),
  (N'demo03@ticket.vn', N'Phạm Thu Hà',      '0901000003'),
  (N'demo04@ticket.vn', N'Võ Quốc Huy',      '0901000004'),
  (N'demo05@ticket.vn', N'Đặng Ngọc Lan',    '0901000005'),
  (N'demo06@ticket.vn', N'Bùi Đức Long',     '0901000006'),
  (N'demo07@ticket.vn', N'Hoàng Gia Linh',   '0901000007'),
  (N'demo08@ticket.vn', N'Ngô Thanh Tùng',   '0901000008'),
  (N'demo09@ticket.vn', N'Đỗ Khánh Vy',      '0901000009'),
  (N'demo10@ticket.vn', N'Huỳnh Tấn Phát',   '0901000010'),
  (N'demo11@ticket.vn', N'Phan Mai Chi',     '0901000011'),
  (N'demo12@ticket.vn', N'Lý Nhật Nam',      '0901000012')
) u(Email, FullName, Phone)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Users x WHERE x.Email = u.Email);

/* ---------------------------------------------------------------------------
   7. Don da thanh toan
   Moi dong: suat, so ghe, khach, ngay truoc (0 = hom nay), gio thanh toan (gio VN),
   ma giam gia, combo. Ghe lay lan luot tu hang dau trong so ghe con trong.
   Talkshow da dien ra 6 ngay truoc nen don cua no thanh toan 7-10 ngay truoc.
   --------------------------------------------------------------------------- */
DECLARE @Plan TABLE (
    N INT IDENTITY(1,1) PRIMARY KEY, ShowK VARCHAR(10), SeatCount INT, Email NVARCHAR(255),
    DaysAgo INT, PayMin INT, Coupon VARCHAR(50) NULL, Combo NVARCHAR(150) NULL, ComboQty INT NULL);
INSERT INTO @Plan (ShowK, SeatCount, Email, DaysAgo, PayMin, Coupon, Combo, ComboQty) VALUES
 -- Talkshow da ket thuc: 40 ve, da soat
 ('TALKSHOW', 6, N'demo01@ticket.vn', 10,  9*60+12, NULL,        NULL, NULL),
 ('TALKSHOW', 5, N'demo02@ticket.vn', 10, 20*60+40, 'WELCOME10', NULL, NULL),
 ('TALKSHOW', 8, N'demo03@ticket.vn',  9, 12*60+5,  NULL,        N'Combo 2 người', 2),
 ('TALKSHOW', 4, N'user@ticket.vn',    9, 21*60+30, 'GIAM20K',   NULL, NULL),
 ('TALKSHOW', 7, N'demo04@ticket.vn',  8, 10*60+50, NULL,        NULL, NULL),
 ('TALKSHOW', 5, N'demo05@ticket.vn',  8, 19*60+15, NULL,        N'Combo 1 người', 1),
 ('TALKSHOW', 5, N'demo06@ticket.vn',  7,  8*60+45, 'WELCOME10', NULL, NULL),
 -- Workshop suat phu: ban het 50/50
 ('WS_SANG',  6, N'demo07@ticket.vn',  9, 15*60+20, NULL,        NULL, NULL),
 ('WS_SANG',  5, N'demo08@ticket.vn',  8, 11*60+10, NULL,        NULL, NULL),
 ('WS_SANG',  4, N'demo09@ticket.vn',  7, 22*60+5,  NULL,        NULL, NULL),
 ('WS_SANG',  8, N'demo10@ticket.vn',  6,  9*60+35, NULL,        NULL, NULL),
 ('WS_SANG',  5, N'demo11@ticket.vn',  5, 14*60+0,  NULL,        NULL, NULL),
 ('WS_SANG',  6, N'demo12@ticket.vn',  4, 20*60+25, NULL,        NULL, NULL),
 ('WS_SANG',  4, N'demo01@ticket.vn',  3, 13*60+45, NULL,        NULL, NULL),
 ('WS_SANG',  7, N'demo02@ticket.vn',  2, 10*60+15, NULL,        NULL, NULL),
 ('WS_SANG',  5, N'demo03@ticket.vn',  1, 16*60+50, NULL,        NULL, NULL),
 -- Stand-up: ban 55/60 -> sap het ve
 ('STANDUP',  8, N'demo04@ticket.vn',  8, 21*60+0,  'WELCOME10', N'Combo 2 người', 2),
 ('STANDUP',  6, N'demo05@ticket.vn',  7, 12*60+30, NULL,        NULL, NULL),
 ('STANDUP',  4, N'demo06@ticket.vn',  6, 19*60+55, 'GIAM20K',   NULL, NULL),
 ('STANDUP',  7, N'demo07@ticket.vn',  5, 10*60+40, NULL,        N'Combo 1 người', 3),
 ('STANDUP',  5, N'demo08@ticket.vn',  4, 22*60+10, 'SINHVIEN',  NULL, NULL),
 ('STANDUP',  8, N'demo09@ticket.vn',  3, 11*60+25, NULL,        NULL, NULL),
 ('STANDUP',  6, N'demo10@ticket.vn',  2, 20*60+0,  'WELCOME10', NULL, NULL),
 ('STANDUP',  5, N'user@ticket.vn',    1, 15*60+35, NULL,        N'Combo 2 người', 1),
 ('STANDUP',  6, N'demo11@ticket.vn',  0,  9*60+20, 'GIAM20K',   NULL, NULL),
 -- Dem phim ngoai troi: 24 ve
 ('DEMPHIM',  4, N'demo12@ticket.vn',  6, 18*60+5,  NULL,        N'Combo 2 người', 2),
 ('DEMPHIM',  2, N'demo01@ticket.vn',  5, 21*60+45, NULL,        NULL, NULL),
 ('DEMPHIM',  6, N'demo02@ticket.vn',  4,  8*60+55, 'SINHVIEN',  NULL, NULL),
 ('DEMPHIM',  4, N'demo03@ticket.vn',  3, 17*60+10, 'GIAM20K',   N'Combo 1 người', 2),
 ('DEMPHIM',  2, N'demo04@ticket.vn',  1, 12*60+0,  NULL,        NULL, NULL),
 ('DEMPHIM',  6, N'demo05@ticket.vn',  0, 10*60+30, NULL,        N'Combo 2 người', 3);

DECLARE @Seat TABLE (SeatId INT PRIMARY KEY, Price INT);
DECLARE @i INT = 1, @cnt INT = (SELECT COUNT(*) FROM @Plan);
DECLARE @ShowK VARCHAR(10), @n INT, @Email NVARCHAR(255), @DaysAgo INT, @PayMin INT, @Coupon VARCHAR(50),
        @Combo NVARCHAR(150), @ComboQty INT, @St INT, @StStart DATETIME2, @Finished BIT, @UserId INT,
        @ProductId INT, @ComboPrice INT, @Sub INT, @Disc INT, @CouponId INT, @DType VARCHAR(10), @DVal INT,
        @MaxD INT, @MinO INT, @PaidAt DATETIME2, @OrderCode BIGINT, @OrderId INT;

WHILE @i <= @cnt
BEGIN
    SELECT @ShowK = ShowK, @n = SeatCount, @Email = Email, @DaysAgo = DaysAgo, @PayMin = PayMin,
           @Coupon = Coupon, @Combo = Combo, @ComboQty = ComboQty
    FROM @Plan WHERE N = @i;
    SELECT @St = ShowtimeId, @StStart = StartTime, @Finished = Finished FROM @Show WHERE K = @ShowK;
    SET @UserId = (SELECT UserId FROM dbo.Users WHERE Email = @Email);
    IF @UserId IS NULL SET @UserId = (SELECT UserId FROM dbo.Users WHERE Email = N'demo01@ticket.vn');

    -- Thoi diem thanh toan; don "hom nay" lui ve truoc hien tai de khong nam o tuong lai
    SET @PaidAt = DATEADD(MINUTE, @PayMin, DATEADD(DAY, -@DaysAgo, @Today0));
    IF @PaidAt > @Now SET @PaidAt = DATEADD(MINUTE, -(15 + 7 * @i), @Now);

    DELETE FROM @Seat;
    INSERT INTO @Seat (SeatId, Price)
    SELECT TOP (@n) s.SeatId, sp.Price
    FROM dbo.Showtimes st
    JOIN dbo.Seats s ON s.RoomId = st.RoomId AND s.IsActive = 1
    JOIN dbo.ShowtimePrices sp ON sp.ShowtimeId = st.ShowtimeId AND sp.SeatType = s.SeatType
    WHERE st.ShowtimeId = @St
      AND NOT EXISTS (SELECT 1 FROM dbo.Tickets t WHERE t.ShowtimeId = @St AND t.SeatId = s.SeatId AND t.Status IN ('VALID','USED'))
    ORDER BY s.RowLabel, s.ColNumber;
    IF (SELECT COUNT(*) FROM @Seat) < @n THROW 50091, N'Không đủ ghế trống cho đơn demo.', 1;

    SELECT @ProductId = NULL, @ComboPrice = 0;
    IF @Combo IS NOT NULL
        SELECT TOP 1 @ProductId = ProductId, @ComboPrice = Price FROM dbo.Products WHERE Name = @Combo ORDER BY ProductId;

    SET @Sub = (SELECT SUM(Price) FROM @Seat) + CASE WHEN @ProductId IS NULL THEN 0 ELSE @ComboPrice * @ComboQty END;

    -- Giam gia: cung cong thuc voi sp_CreateOrder, khong du dieu kien thi bo qua ma
    SELECT @CouponId = NULL, @Disc = 0;
    SELECT @CouponId = CouponId, @DType = DiscountType, @DVal = DiscountValue, @MaxD = MaxDiscount, @MinO = MinOrderAmount
    FROM dbo.Coupons WHERE Code = @Coupon AND IsActive = 1 AND (MaxUses IS NULL OR UsedCount < MaxUses);
    IF @CouponId IS NOT NULL AND @Sub >= @MinO
    BEGIN
        SET @Disc = CASE WHEN @DType = 'PERCENT' THEN @Sub * @DVal / 100 ELSE @DVal END;
        IF @DType = 'PERCENT' AND @MaxD IS NOT NULL AND @Disc > @MaxD SET @Disc = @MaxD;
        IF @Disc > @Sub SET @Disc = @Sub;
    END
    ELSE SET @CouponId = NULL;

    -- OrderCode giong kieu that (mili giay), tranh trung
    SET @OrderCode = DATEDIFF_BIG(MILLISECOND, '1970-01-01', @PaidAt);
    WHILE EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderCode = @OrderCode) SET @OrderCode += 1;

    INSERT INTO dbo.Orders (OrderCode, UserId, CouponId, SubTotal, DiscountAmount, TotalAmount, Status, ExpiresAt, CreatedAt, PaidAt)
    VALUES (@OrderCode, @UserId, @CouponId, @Sub, @Disc, @Sub - @Disc, 'PAID',
            DATEADD(MINUTE, 7, @PaidAt), DATEADD(MINUTE, -3, @PaidAt), @PaidAt);
    SET @OrderId = SCOPE_IDENTITY();

    INSERT INTO dbo.OrderItems (OrderId, ItemType, ShowtimeId, SeatId, UnitPrice, Quantity)
    SELECT @OrderId, 'TICKET', @St, SeatId, Price, 1 FROM @Seat;
    IF @ProductId IS NOT NULL
        INSERT INTO dbo.OrderItems (OrderId, ItemType, ProductId, UnitPrice, Quantity)
        VALUES (@OrderId, 'COMBO', @ProductId, @ComboPrice, @ComboQty);

    INSERT INTO dbo.Tickets (OrderId, ShowtimeId, SeatId, Price, Status, IssuedAt, CheckedInAt, CheckedInBy)
    SELECT @OrderId, @St, SeatId, Price,
           CASE WHEN @Finished = 1 THEN 'USED' ELSE 'VALID' END, @PaidAt,
           CASE WHEN @Finished = 1 THEN DATEADD(MINUTE, -(SeatId % 30) - 5, @StStart) END,
           CASE WHEN @Finished = 1 THEN @StaffId END
    FROM @Seat;

    INSERT INTO dbo.Payments (OrderId, Provider, ProviderRef, Amount, Status, CreatedAt, PaidAt)
    VALUES (@OrderId, 'PAYOS', N'DEMO-' + CAST(@OrderCode AS NVARCHAR(20)), @Sub - @Disc, 'PAID', DATEADD(MINUTE, -3, @PaidAt), @PaidAt);

    IF @CouponId IS NOT NULL UPDATE dbo.Coupons SET UsedCount = UsedCount + 1 WHERE CouponId = @CouponId;

    INSERT INTO dbo.Notifications (UserId, Title, Content, IsRead, CreatedAt)
    VALUES (@UserId, N'Đặt vé thành công',
            N'Đơn hàng #' + CAST(@OrderCode AS NVARCHAR(20)) + N' đã thanh toán. Xem vé trong mục "Vé của tôi".',
            CASE WHEN @DaysAgo >= 2 THEN 1 ELSE 0 END, @PaidAt);

    SET @i += 1;
END

COMMIT;

/* ---------------------------------------------------------------------------
   8. Tom tat
   --------------------------------------------------------------------------- */
SELECT s.K AS Suat, m.Title AS SuKien, v.StartTime, v.SoldSeats, v.TotalSeats, v.Status
FROM @Show s
JOIN dbo.vw_ShowtimeSummary v ON v.ShowtimeId = s.ShowtimeId
JOIN dbo.Movies m ON m.MovieId = v.MovieId
ORDER BY v.StartTime;

PRINT N'Đã tạo dữ liệu demo: ' + CAST(@cnt AS NVARCHAR(10)) + N' đơn đã thanh toán.';
GO

SET NOEXEC OFF;
GO
