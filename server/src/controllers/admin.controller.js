import { z } from 'zod';
import { query, callProc, updateById, toId, sql } from '../utils/db.js';
import { HttpError } from '../utils/httpError.js';
import { ok, asyncHandler } from '../utils/response.js';

// ---------- Phim / sự kiện ----------
export const movieSchema = z.object({
  title: z.string().min(1, 'Nhập tên'),
  description: z.string().optional(),
  durationMin: z.number().int().positive(),
  ageRating: z.enum(['P', 'K', 'T13', 'T16', 'T18']).default('P'),
  director: z.string().optional(),
  actors: z.string().optional(),
  language: z.string().optional(),
  posterUrl: z.string().optional(),
  bannerUrl: z.string().optional(),
  trailerUrl: z.string().optional(),
  releaseDate: z.string().optional(),
  status: z.enum(['NOW_SHOWING', 'COMING_SOON', 'ENDED', 'HIDDEN']).default('COMING_SOON'),
  genreIds: z.array(z.number().int()).default([]),
});

const MOVIE_FIELDS = {
  title: 'Title', description: 'Description', durationMin: 'DurationMin', ageRating: 'AgeRating', director: 'Director', actors: 'Actors',
  language: 'Language', posterUrl: 'PosterUrl', bannerUrl: 'BannerUrl', trailerUrl: 'TrailerUrl', releaseDate: 'ReleaseDate', status: 'Status',
};

async function setGenres(movieId, genreIds) {
  await query('DELETE FROM MovieGenres WHERE MovieId = @MovieId', { MovieId: movieId });
  for (const g of genreIds) await query('INSERT INTO MovieGenres (MovieId, GenreId) VALUES (@MovieId, @GenreId)', { MovieId: movieId, GenreId: g });
}

export const adminListMovies = asyncHandler(async (req, res) =>
  ok(res, await query('SELECT MovieId, Title, DurationMin, AgeRating, Status, ReleaseDate, PosterUrl FROM Movies ORDER BY MovieId DESC')),
);

export const createMovie = asyncHandler(async (req, res) => {
  const b = req.body;
  const [movie] = await query(
    `INSERT INTO Movies (Title, Description, DurationMin, AgeRating, Director, Actors, Language, PosterUrl, BannerUrl, TrailerUrl, ReleaseDate, Status)
     OUTPUT INSERTED.* VALUES (@Title, @Description, @DurationMin, @AgeRating, @Director, @Actors, @Language, @PosterUrl, @BannerUrl, @TrailerUrl, @ReleaseDate, @Status)`,
    { Title: b.title, Description: b.description ?? null, DurationMin: b.durationMin, AgeRating: b.ageRating, Director: b.director ?? null, Actors: b.actors ?? null,
      Language: b.language ?? null, PosterUrl: b.posterUrl ?? null, BannerUrl: b.bannerUrl ?? null, TrailerUrl: b.trailerUrl ?? null, ReleaseDate: b.releaseDate ?? null, Status: b.status },
  );
  await setGenres(movie.movieId, b.genreIds);
  ok(res, movie, 'Đã tạo sự kiện', 201);
});

export const updateMovie = asyncHandler(async (req, res) => {
  const id = toId(req.params.id);
  const { genreIds, ...rest } = req.body;
  const movie = Object.keys(rest).length ? await updateById('Movies', 'MovieId', id, rest, MOVIE_FIELDS) : null;
  if (genreIds) await setGenres(id, genreIds);
  ok(res, movie, 'Đã cập nhật');
});

export const hideMovie = asyncHandler(async (req, res) => {
  await updateById('Movies', 'MovieId', toId(req.params.id), { status: 'HIDDEN' }, MOVIE_FIELDS);
  ok(res, null, 'Đã ẩn sự kiện');
});

// ---------- Địa điểm / phòng / ghế ----------
export const cinemaSchema = z.object({ name: z.string().min(1), address: z.string().min(1), city: z.string().min(1), phone: z.string().optional() });
export const createCinema = asyncHandler(async (req, res) => {
  const b = req.body;
  const [row] = await query('INSERT INTO Cinemas (Name, Address, City, Phone) OUTPUT INSERTED.* VALUES (@Name, @Address, @City, @Phone)',
    { Name: b.name, Address: b.address, City: b.city, Phone: b.phone ?? null });
  ok(res, row, 'Đã tạo địa điểm', 201);
});
export const updateCinema = asyncHandler(async (req, res) =>
  ok(res, await updateById('Cinemas', 'CinemaId', toId(req.params.id), req.body, { name: 'Name', address: 'Address', city: 'City', phone: 'Phone', isActive: 'IsActive' })),
);

export const roomSchema = z.object({ cinemaId: z.number().int(), name: z.string().min(1) });
export const listRooms = asyncHandler(async (req, res) =>
  ok(res, await query('SELECT r.RoomId, r.CinemaId, c.Name AS CinemaName, r.Name, r.TotalRows, r.TotalCols, r.IsActive FROM Rooms r JOIN Cinemas c ON c.CinemaId = r.CinemaId ORDER BY c.Name, r.Name')),
);
export const createRoom = asyncHandler(async (req, res) => {
  const [row] = await query('INSERT INTO Rooms (CinemaId, Name) OUTPUT INSERTED.* VALUES (@CinemaId, @Name)', { CinemaId: req.body.cinemaId, Name: req.body.name });
  ok(res, row, 'Đã tạo phòng', 201);
});

export const generateSeatsSchema = z.object({
  rows: z.number().int().min(1).max(26), cols: z.number().int().min(1).max(30),
  vipFromRow: z.number().int().optional(), vipToRow: z.number().int().optional(),
});
export const generateSeats = asyncHandler(async (req, res) => {
  const { rows, cols, vipFromRow, vipToRow } = req.body;
  await callProc('sp_GenerateSeats', { RoomId: toId(req.params.id), Rows: rows, Cols: cols, VipFromRow: vipFromRow ?? null, VipToRow: vipToRow ?? null });
  ok(res, null, 'Đã tạo sơ đồ ghế', 201);
});
export const roomSeats = asyncHandler(async (req, res) =>
  ok(res, await query('SELECT SeatId, RowLabel, ColNumber, SeatType, IsActive FROM Seats WHERE RoomId = @Id ORDER BY RowLabel, ColNumber', { Id: toId(req.params.id) })),
);
export const updateSeat = asyncHandler(async (req, res) =>
  ok(res, await updateById('Seats', 'SeatId', toId(req.params.id), req.body, { seatType: 'SeatType', isActive: 'IsActive' })),
);

// ---------- Suất chiếu ----------
export const showtimeSchema = z.object({
  movieId: z.number().int(), roomId: z.number().int(), startTime: z.string(),
  normalPrice: z.number().int().min(0), vipPrice: z.number().int().min(0), couplePrice: z.number().int().min(0),
});
export const adminListShowtimes = asyncHandler(async (req, res) =>
  ok(res, await query('SELECT * FROM vw_ShowtimeSummary WHERE (@MovieId IS NULL OR MovieId = @MovieId) ORDER BY StartTime DESC', { MovieId: req.query.movieId ? toId(req.query.movieId) : null })),
);
export const createShowtime = asyncHandler(async (req, res) => {
  const b = req.body;
  const start = new Date(b.startTime);
  if (Number.isNaN(start.getTime())) throw new HttpError(400, 'Giờ bắt đầu không hợp lệ.');
  const { output } = await callProc('sp_CreateShowtime',
    { MovieId: b.movieId, RoomId: b.roomId, StartTime: start, NormalPrice: b.normalPrice, VipPrice: b.vipPrice, CouplePrice: b.couplePrice },
    { ShowtimeId: sql.Int });
  ok(res, { showtimeId: output.ShowtimeId }, 'Đã tạo suất chiếu', 201);
});
export const cancelShowtime = asyncHandler(async (req, res) => {
  await updateById('Showtimes', 'ShowtimeId', toId(req.params.id), { status: 'CANCELLED' }, { status: 'Status' });
  ok(res, null, 'Đã hủy suất chiếu');
});

// ---------- Người dùng ----------
export const listUsers = asyncHandler(async (req, res) =>
  ok(res, await query(
    `SELECT UserId, Email, FullName, Phone, Role, IsActive, CreatedAt FROM Users
     WHERE @Q IS NULL OR Email LIKE '%' + @Q + '%' OR FullName LIKE '%' + @Q + '%' ORDER BY UserId DESC`, { Q: req.query.q || null })),
);
export const userSchema = z.object({ role: z.enum(['USER', 'STAFF', 'ADMIN']).optional(), isActive: z.boolean().optional() });
export const updateUser = asyncHandler(async (req, res) => {
  const id = toId(req.params.id);
  if (id === req.user.userId) throw new HttpError(400, 'Không thể tự đổi quyền hoặc khóa chính mình.');
  ok(res, await updateById('Users', 'UserId', id, req.body, { role: 'Role', isActive: 'IsActive' }), 'Đã cập nhật');
});

// ---------- Upload ảnh ----------
export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Chưa chọn ảnh hợp lệ (png, jpg, webp, gif, tối đa 5MB).');
  ok(res, { url: `/uploads/${req.file.filename}` }, 'Đã tải ảnh lên', 201);
});
