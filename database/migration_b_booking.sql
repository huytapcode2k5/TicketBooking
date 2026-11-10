/* ============================================================================
   migration_b_booking.sql - Va cac truong hop hiem trong luong dat ve (Nguoi B)

   Chay SAU TicketBookingDB.sql (chay lai nhieu lan khong sao, chi CREATE OR ALTER):
       sqlcmd -S . -E -C -I -f 65001 -i database\migration_b_booking.sql

   Sua sp_HoldSeats va sp_CreateOrder:
   1. Dang co don cho thanh toan cho suat nay thi KHONG cho doi/bo ghe (50007).
      Truoc day doi ghe se xoa cho giu cua don dang cho -> nguoi khac mua mat ghe,
      khach tra tien xong khong co ve.
   2. Tao don lan nua cho cung suat (bam Back roi bam Thanh toan) thi huy don cu
      va tao don moi, khong de 2 don cho cung giu mot ghe. Tra ve ReplacedOrderCode
      de server huy link PayOS cua don cu.
   3. Kiem tra lai suat chieu (chua huy, chua bat dau) va ghe con hoat dong khi tao don.
   4. Ma gioi han luot: tinh ca cac don dang cho thanh toan co dung ma, khoa dong
      ma khi tao don de 2 nguoi cung luc khong vuot so luot.

   Ma loi moi: 50007 (dang co don cho), 50015 (suat khong con mo ban), 50016 (ghe ngung su dung).
   ============================================================================ */

USE TicketBookingDB;
GO

-- 3.3 Giu ghe tam thoi --------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.sp_HoldSeats
    @UserId       INT,
    @ShowtimeId   INT,
    @SeatIds      NVARCHAR(MAX),
    @HoldMinutes  INT = 10
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Now DATETIME2 = SYSUTCDATETIME();
    DECLARE @Expires DATETIME2 = DATEADD(MINUTE, @HoldMinutes, @Now);

    DECLARE @Seats TABLE (SeatId INT PRIMARY KEY);
    INSERT INTO @Seats (SeatId)
    SELECT DISTINCT CAST(LTRIM(RTRIM(value)) AS INT)
    FROM STRING_SPLIT(@SeatIds, ',')
    WHERE LTRIM(RTRIM(value)) <> '';

    DECLARE @Count INT = (SELECT COUNT(*) FROM @Seats);
    IF @Count = 0 THROW 50001, N'Chưa chọn ghế nào.', 1;
    IF @Count > 8 THROW 50002, N'Mỗi lần chỉ được đặt tối đa 8 ghế.', 1;

    BEGIN TRY
        BEGIN TRAN;

        IF NOT EXISTS (SELECT 1 FROM dbo.Showtimes
                       WHERE ShowtimeId = @ShowtimeId AND Status = 'SCHEDULED' AND StartTime > @Now)
            THROW 50003, N'Suất chiếu không tồn tại hoặc đã bắt đầu.', 1;

        -- [moi] dang co don cho thanh toan cho suat nay: ghe dang giu thuoc ve don do, khong duoc doi
        IF EXISTS (SELECT 1 FROM dbo.Orders o WITH (UPDLOCK, HOLDLOCK)
                   JOIN dbo.OrderItems oi ON oi.OrderId = o.OrderId
                   WHERE o.UserId = @UserId AND o.Status = 'PENDING' AND o.ExpiresAt > @Now
                     AND oi.ShowtimeId = @ShowtimeId)
            THROW 50007, N'Bạn đang có đơn chờ thanh toán cho suất này. Hãy thanh toán hoặc hủy đơn trước khi chọn lại ghế.', 1;

        -- don cac giu cho het han va giu cho cu cua chinh user trong suat nay
        DELETE FROM dbo.SeatHolds WHERE ShowtimeId = @ShowtimeId AND ExpiresAt <= @Now;
        DELETE FROM dbo.SeatHolds WHERE ShowtimeId = @ShowtimeId AND UserId = @UserId;

        -- ghe phai thuoc phong cua suat chieu va dang hoat dong
        IF EXISTS (SELECT 1 FROM @Seats x
                   WHERE NOT EXISTS (SELECT 1
                                     FROM dbo.Seats s
                                     JOIN dbo.Showtimes st ON st.RoomId = s.RoomId
                                     WHERE st.ShowtimeId = @ShowtimeId
                                       AND s.SeatId = x.SeatId AND s.IsActive = 1))
            THROW 50004, N'Có ghế không hợp lệ cho suất chiếu này.', 1;

        IF EXISTS (SELECT 1
                   FROM dbo.Tickets t WITH (UPDLOCK, HOLDLOCK)
                   JOIN @Seats x ON x.SeatId = t.SeatId
                   WHERE t.ShowtimeId = @ShowtimeId AND t.Status IN ('VALID','USED'))
            THROW 50005, N'Có ghế đã được bán. Vui lòng chọn ghế khác.', 1;

        IF EXISTS (SELECT 1
                   FROM dbo.SeatHolds h WITH (UPDLOCK, HOLDLOCK)
                   JOIN @Seats x ON x.SeatId = h.SeatId
                   WHERE h.ShowtimeId = @ShowtimeId)
            THROW 50006, N'Ghế vừa có người khác chọn. Vui lòng chọn ghế khác.', 1;

        INSERT INTO dbo.SeatHolds (ShowtimeId, SeatId, UserId, ExpiresAt)
        SELECT @ShowtimeId, SeatId, @UserId, @Expires FROM @Seats;

        COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        IF ERROR_NUMBER() IN (2601, 2627)
            THROW 50006, N'Ghế vừa có người khác chọn. Vui lòng chọn ghế khác.', 1;
        THROW;
    END CATCH

    SELECT h.SeatId, s.RowLabel, s.ColNumber, s.SeatType, h.ExpiresAt
    FROM dbo.SeatHolds h
    JOIN dbo.Seats s ON s.SeatId = h.SeatId
    WHERE h.ShowtimeId = @ShowtimeId AND h.UserId = @UserId
    ORDER BY s.RowLabel, s.ColNumber;
END
GO

-- 3.4 Tao don hang --------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.sp_CreateOrder
    @UserId      INT,
    @ShowtimeId  INT,
    @SeatIds     NVARCHAR(MAX),
    @CouponCode  VARCHAR(50)    = NULL,
    @CombosJson  NVARCHAR(MAX)  = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Now DATETIME2 = SYSUTCDATETIME();

    DECLARE @Seats TABLE (SeatId INT PRIMARY KEY);
    INSERT INTO @Seats (SeatId)
    SELECT DISTINCT CAST(LTRIM(RTRIM(value)) AS INT)
    FROM STRING_SPLIT(@SeatIds, ',')
    WHERE LTRIM(RTRIM(value)) <> '';
    DECLARE @Count INT = (SELECT COUNT(*) FROM @Seats);
    IF @Count = 0 THROW 50010, N'Chưa chọn ghế nào.', 1;

    DECLARE @Combos TABLE (ProductId INT PRIMARY KEY, Quantity INT NOT NULL);
    IF @CombosJson IS NOT NULL AND LTRIM(RTRIM(@CombosJson)) <> ''
    BEGIN
        INSERT INTO @Combos (ProductId, Quantity)
        SELECT productId, SUM(quantity)
        FROM OPENJSON(@CombosJson) WITH (productId INT '$.productId', quantity INT '$.quantity')
        GROUP BY productId;

        IF EXISTS (SELECT 1 FROM @Combos c
                   WHERE c.Quantity < 1 OR c.Quantity > 20
                      OR NOT EXISTS (SELECT 1 FROM dbo.Products p
                                     WHERE p.ProductId = c.ProductId AND p.IsActive = 1))
            THROW 50011, N'Combo không hợp lệ.', 1;
    END

    DECLARE @TicketTotal INT, @PricedCount INT, @ComboTotal INT = 0;
    DECLARE @SubTotal INT, @Discount INT = 0, @Total INT;
    DECLARE @CouponId INT, @CType VARCHAR(10), @CValue INT, @CMax INT;
    DECLARE @OrderExpires DATETIME2, @OrderId INT, @OrderCode BIGINT;
    DECLARE @Replaced TABLE (OrderId INT, OrderCode BIGINT);

    BEGIN TRY
        BEGIN TRAN;

        -- [moi] suat chieu van mo ban
        IF NOT EXISTS (SELECT 1 FROM dbo.Showtimes
                       WHERE ShowtimeId = @ShowtimeId AND Status = 'SCHEDULED' AND StartTime > @Now)
            THROW 50015, N'Suất chiếu đã bị hủy hoặc đã bắt đầu, không thể đặt vé.', 1;

        -- user phai dang giu du cac ghe nay va chua het han
        IF (SELECT COUNT(*)
            FROM dbo.SeatHolds h WITH (UPDLOCK, HOLDLOCK)
            JOIN @Seats x ON x.SeatId = h.SeatId
            WHERE h.ShowtimeId = @ShowtimeId AND h.UserId = @UserId AND h.ExpiresAt > @Now) <> @Count
            THROW 50012, N'Giữ chỗ đã hết hạn hoặc ghế không thuộc về bạn. Vui lòng chọn lại ghế.', 1;

        -- [moi] ghe bi admin ngung su dung sau khi giu
        IF EXISTS (SELECT 1 FROM @Seats x JOIN dbo.Seats s ON s.SeatId = x.SeatId WHERE s.IsActive = 0)
            THROW 50016, N'Có ghế vừa ngừng sử dụng. Vui lòng chọn ghế khác.', 1;

        -- [moi] don cho cu cua chinh user cho suat nay (bam Back roi tao don lai):
        -- huy don cu nhung GIU NGUYEN cho giu de don moi dung tiep
        UPDATE o SET Status = 'CANCELLED', CancelledAt = @Now, CancelReason = N'Thay bằng đơn mới'
        OUTPUT inserted.OrderId, inserted.OrderCode INTO @Replaced
        FROM dbo.Orders o
        WHERE o.UserId = @UserId AND o.Status = 'PENDING'
          AND EXISTS (SELECT 1 FROM dbo.OrderItems oi WHERE oi.OrderId = o.OrderId AND oi.ShowtimeId = @ShowtimeId);

        UPDATE p SET Status = 'CANCELLED'
        FROM dbo.Payments p JOIN @Replaced r ON r.OrderId = p.OrderId
        WHERE p.Status = 'PENDING';

        SELECT @TicketTotal = SUM(sp.Price), @PricedCount = COUNT(sp.Price)
        FROM @Seats x
        JOIN dbo.Seats s ON s.SeatId = x.SeatId
        JOIN dbo.ShowtimePrices sp ON sp.ShowtimeId = @ShowtimeId AND sp.SeatType = s.SeatType;
        IF @PricedCount <> @Count THROW 50013, N'Suất chiếu chưa cấu hình giá cho loại ghế đã chọn.', 1;

        SELECT @ComboTotal = ISNULL(SUM(p.Price * c.Quantity), 0)
        FROM @Combos c JOIN dbo.Products p ON p.ProductId = c.ProductId;

        SET @SubTotal = @TicketTotal + @ComboTotal;

        IF @CouponCode IS NOT NULL AND LTRIM(RTRIM(@CouponCode)) <> ''
        BEGIN
            -- [moi] khoa dong ma (UPDLOCK) va tinh ca don dang cho thanh toan vao so luot da dung
            SELECT @CouponId = c.CouponId, @CType = c.DiscountType, @CValue = c.DiscountValue, @CMax = c.MaxDiscount
            FROM dbo.Coupons c WITH (UPDLOCK, HOLDLOCK)
            WHERE c.Code = @CouponCode AND c.IsActive = 1
              AND @Now BETWEEN c.StartAt AND c.EndAt
              AND c.MinOrderAmount <= @SubTotal
              AND (c.MaxUses IS NULL
                   OR c.UsedCount + (SELECT COUNT(*) FROM dbo.Orders o
                                     WHERE o.CouponId = c.CouponId AND o.Status = 'PENDING' AND o.ExpiresAt > @Now) < c.MaxUses);

            IF @CouponId IS NULL
                THROW 50014, N'Mã giảm giá không hợp lệ, đã hết lượt hoặc chưa đủ điều kiện áp dụng.', 1;

            SET @Discount = CASE WHEN @CType = 'PERCENT' THEN @SubTotal * @CValue / 100 ELSE @CValue END;
            IF @CType = 'PERCENT' AND @CMax IS NOT NULL AND @Discount > @CMax SET @Discount = @CMax;
            IF @Discount > @SubTotal SET @Discount = @SubTotal;
        END

        SET @Total = @SubTotal - @Discount;

        SELECT @OrderExpires = MIN(h.ExpiresAt)
        FROM dbo.SeatHolds h JOIN @Seats x ON x.SeatId = h.SeatId
        WHERE h.ShowtimeId = @ShowtimeId AND h.UserId = @UserId;

        SET @OrderCode = DATEDIFF_BIG(SECOND, '1970-01-01', @Now) * 1000 + ABS(CHECKSUM(NEWID())) % 1000;
        WHILE EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderCode = @OrderCode)
            SET @OrderCode = @OrderCode + 1;

        INSERT INTO dbo.Orders (OrderCode, UserId, CouponId, SubTotal, DiscountAmount, TotalAmount, ExpiresAt)
        VALUES (@OrderCode, @UserId, @CouponId, @SubTotal, @Discount, @Total, @OrderExpires);
        SET @OrderId = SCOPE_IDENTITY();

        INSERT INTO dbo.OrderItems (OrderId, ItemType, ShowtimeId, SeatId, UnitPrice, Quantity)
        SELECT @OrderId, 'TICKET', @ShowtimeId, x.SeatId, sp.Price, 1
        FROM @Seats x
        JOIN dbo.Seats s ON s.SeatId = x.SeatId
        JOIN dbo.ShowtimePrices sp ON sp.ShowtimeId = @ShowtimeId AND sp.SeatType = s.SeatType;

        INSERT INTO dbo.OrderItems (OrderId, ItemType, ProductId, UnitPrice, Quantity)
        SELECT @OrderId, 'COMBO', c.ProductId, p.Price, c.Quantity
        FROM @Combos c JOIN dbo.Products p ON p.ProductId = c.ProductId;

        -- don cu bi thay co the con giu ghe khong nam trong don moi: tra lai ghe do
        DELETE h FROM dbo.SeatHolds h
        WHERE h.ShowtimeId = @ShowtimeId AND h.UserId = @UserId
          AND NOT EXISTS (SELECT 1 FROM @Seats x WHERE x.SeatId = h.SeatId)
          AND EXISTS (SELECT 1 FROM @Replaced);

        COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH

    SELECT @OrderId AS OrderId, @OrderCode AS OrderCode,
           @SubTotal AS SubTotal, @Discount AS DiscountAmount, @Total AS TotalAmount,
           @OrderExpires AS ExpiresAt,
           (SELECT TOP 1 OrderCode FROM @Replaced) AS ReplacedOrderCode;
END
GO
