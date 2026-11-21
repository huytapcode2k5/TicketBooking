/* ============================================================================
   Migration: Đăng nhập bằng Google / Facebook & Mở rộng độ dài URL
   Chạy trên database TicketBookingDB đã có (chạy lại nhiều lần cũng an toàn).
   - Thêm cột GoogleId, FacebookId vào Users
   - Cho phép PasswordHash rỗng (tài khoản tạo bằng Google/Facebook chưa có mật khẩu)
   - Tạo unique filtered index cho GoogleId, FacebookId
   - Mở rộng AvatarUrl sang NVARCHAR(MAX)
   ============================================================================ */
USE TicketBookingDB;
GO

-- 1. Thêm cột định danh OAuth
IF COL_LENGTH('dbo.Users', 'GoogleId') IS NULL   ALTER TABLE dbo.Users ADD GoogleId   NVARCHAR(64) NULL;
IF COL_LENGTH('dbo.Users', 'FacebookId') IS NULL ALTER TABLE dbo.Users ADD FacebookId NVARCHAR(64) NULL;
GO

-- 2. Cho phép mật khẩu NULL với tài khoản đăng nhập qua mạng xã hội
ALTER TABLE dbo.Users ALTER COLUMN PasswordHash NVARCHAR(255) NULL;
GO

-- 3. Mở rộng AvatarUrl sang NVARCHAR(MAX) tránh tràn chuỗi từ CDN (Facebook, Google)
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'AvatarUrl')
    ALTER TABLE dbo.Users ALTER COLUMN AvatarUrl NVARCHAR(MAX);
GO

-- 4. Mỗi tài khoản Google/Facebook chỉ liên kết với tối đa một người dùng (unique filtered index)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Users_GoogleId' AND object_id = OBJECT_ID('dbo.Users'))
    CREATE UNIQUE INDEX UX_Users_GoogleId ON dbo.Users(GoogleId) WHERE GoogleId IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Users_FacebookId' AND object_id = OBJECT_ID('dbo.Users'))
    CREATE UNIQUE INDEX UX_Users_FacebookId ON dbo.Users(FacebookId) WHERE FacebookId IS NOT NULL;
GO

-- 5. Kiểm tra kết quả
SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Users' AND COLUMN_NAME IN ('PasswordHash', 'GoogleId', 'FacebookId', 'AvatarUrl');
GO
