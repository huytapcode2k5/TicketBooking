-- =========================================================================
-- MIGRATION: Cap nhat thu tuc sp_CheckInTicket
-- 1. Tra ve StartTime, EndTime, CheckInAllowedFrom (mo cua truoc gio chieu 60 phut)
-- 2. Ho tro quet bang ca ma QrToken dai HOAC ma ve TicketId (vd: 182 hoac TK-182)
-- =========================================================================

CREATE OR ALTER PROCEDURE dbo.sp_CheckInTicket
    @QrToken  VARCHAR(64),
    @StaffId  INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Now DATETIME2 = SYSUTCDATETIME();
    DECLARE @Result VARCHAR(20);
    DECLARE @CleanToken VARCHAR(64) = LTRIM(RTRIM(@QrToken));
    DECLARE @CleanId VARCHAR(64) = REPLACE(@CleanToken, 'TK-', '');

    UPDATE t
    SET t.Status = 'USED', t.CheckedInAt = @Now, t.CheckedInBy = @StaffId
    FROM dbo.Tickets t
    JOIN dbo.Showtimes st ON st.ShowtimeId = t.ShowtimeId
    WHERE (t.QrToken = @CleanToken OR CAST(t.TicketId AS VARCHAR(64)) = @CleanId)
      AND t.Status = 'VALID'
      AND st.Status <> 'CANCELLED'
      AND @Now >= DATEADD(MINUTE, -60, st.StartTime)
      AND @Now <= st.EndTime;

    IF @@ROWCOUNT = 1
        SET @Result = 'SUCCESS';
    ELSE
    BEGIN
        DECLARE @TStatus VARCHAR(10), @Start DATETIME2;
        SELECT @TStatus = t.Status, @Start = st.StartTime
        FROM dbo.Tickets t JOIN dbo.Showtimes st ON st.ShowtimeId = t.ShowtimeId
        WHERE (t.QrToken = @CleanToken OR CAST(t.TicketId AS VARCHAR(64)) = @CleanId);

        IF @TStatus IS NULL               SET @Result = 'INVALID';
        ELSE IF @TStatus = 'USED'         SET @Result = 'ALREADY_USED';
        ELSE IF @TStatus = 'CANCELLED'    SET @Result = 'CANCELLED';
        ELSE IF @Now < DATEADD(MINUTE, -60, @Start) SET @Result = 'TOO_EARLY';
        ELSE                              SET @Result = 'EXPIRED';
    END

    SELECT @Result AS Result,
           t.TicketId,
           m.Title       AS MovieTitle,
           r.Name        AS RoomName,
           s.RowLabel + CAST(s.ColNumber AS VARCHAR(3)) AS SeatLabel,
           st.StartTime,
           st.EndTime,
           DATEADD(MINUTE, -60, st.StartTime) AS CheckInAllowedFrom,
           t.CheckedInAt
    FROM (SELECT @CleanToken AS QrToken) q
    LEFT JOIN dbo.Tickets   t  ON (t.QrToken = q.QrToken OR CAST(t.TicketId AS VARCHAR(64)) = @CleanId)
    LEFT JOIN dbo.Showtimes st ON st.ShowtimeId = t.ShowtimeId
    LEFT JOIN dbo.Movies    m  ON m.MovieId = st.MovieId
    LEFT JOIN dbo.Rooms     r  ON r.RoomId = st.RoomId
    LEFT JOIN dbo.Seats     s  ON s.SeatId = t.SeatId;
END;
GO
