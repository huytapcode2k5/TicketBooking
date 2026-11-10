import { z } from 'zod';
import { query, toId } from '../utils/db.js';
import { HttpError } from '../utils/httpError.js';
import { ok, asyncHandler } from '../utils/response.js';

const GENRES_SQL = `STUFF((SELECT ', ' + g.Name FROM MovieGenres mg JOIN Genres g ON g.GenreId = mg.GenreId
                     WHERE mg.MovieId = m.MovieId FOR XML PATH('')), 1, 2, '')`;

/** GET /api/movies?q=&genreId=&status=&cinemaId=&page=&limit= */
export const listMovies = asyncHandler(async (req, res) => {
  const { q, genreId, status, cinemaId } = req.query;
  const limit = Math.min(Number(req.query.limit) || 12, 50);
  const offset = ((Number(req.query.page) || 1) - 1) * limit;
  const params = { Q: q || null, GenreId: genreId ? toId(genreId, 'genreId') : null, Status: status || null, CinemaId: cinemaId ? toId(cinemaId, 'cinemaId') : null, Offset: offset, Limit: limit };
  const where = `m.Status <> 'HIDDEN'
    AND (@Q IS NULL OR m.Title LIKE '%' + @Q + '%')
    AND (@Status IS NULL OR m.Status = @Status)
    AND (@GenreId IS NULL OR EXISTS (SELECT 1 FROM MovieGenres mg WHERE mg.MovieId = m.MovieId AND mg.GenreId = @GenreId))
    AND (@CinemaId IS NULL OR EXISTS (SELECT 1 FROM Showtimes st JOIN Rooms r ON r.RoomId = st.RoomId
         WHERE st.MovieId = m.MovieId AND r.CinemaId = @CinemaId AND st.Status = 'SCHEDULED'))`;
  const items = await query(
    `SELECT m.MovieId, m.Title, m.PosterUrl, m.BannerUrl, m.DurationMin, m.AgeRating, m.Status, m.ReleaseDate,
            ${GENRES_SQL} AS Genres,
            (SELECT MIN(sp.Price) FROM Showtimes st JOIN ShowtimePrices sp ON sp.ShowtimeId = st.ShowtimeId
              WHERE st.MovieId = m.MovieId AND st.Status = 'SCHEDULED' AND st.StartTime > SYSUTCDATETIME()) AS MinPrice,
            (SELECT AVG(CAST(Rating AS FLOAT)) FROM Reviews r WHERE r.MovieId = m.MovieId) AS AvgRating,
            (SELECT COUNT(*) FROM vw_ShowtimeSummary v WHERE v.MovieId = m.MovieId AND v.Status = 'SCHEDULED' AND v.StartTime > SYSUTCDATETIME()
               AND v.SoldSeats >= v.TotalSeats) AS SoldOutShowtimes,
            (SELECT COUNT(*) FROM vw_ShowtimeSummary v WHERE v.MovieId = m.MovieId AND v.Status = 'SCHEDULED' AND v.StartTime > SYSUTCDATETIME()) AS UpcomingShowtimes
     FROM Movies m WHERE ${where}
     ORDER BY m.ReleaseDate DESC, m.MovieId DESC
     OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY`,
    params,
  );
  const [{ total }] = await query(`SELECT COUNT(*) AS Total FROM Movies m WHERE ${where}`, params);
  ok(res, { items, total, page: Math.floor(offset / limit) + 1, limit });
});

export const getMovie = asyncHandler(async (req, res) => {
  const id = toId(req.params.id);
  const [movie] = await query(
    `SELECT m.*, (SELECT AVG(CAST(Rating AS FLOAT)) FROM Reviews WHERE MovieId = m.MovieId) AS AvgRating,
            (SELECT COUNT(*) FROM Reviews WHERE MovieId = m.MovieId) AS ReviewCount
     FROM Movies m WHERE m.MovieId = @Id AND m.Status <> 'HIDDEN'`,
    { Id: id },
  );
  if (!movie) throw new HttpError(404, 'Không tìm thấy sự kiện.');
  movie.genres = await query('SELECT g.GenreId, g.Name FROM MovieGenres mg JOIN Genres g ON g.GenreId = mg.GenreId WHERE mg.MovieId = @Id', { Id: id });
  ok(res, movie);
});

export const listGenres = asyncHandler(async (req, res) => ok(res, await query('SELECT GenreId, Name FROM Genres ORDER BY Name')));
export const listCinemas = asyncHandler(async (req, res) =>
  ok(res, await query('SELECT CinemaId, Name, Address, City FROM Cinemas WHERE IsActive = 1 ORDER BY City, Name')),
);

/** GET /api/movies/:id/showtimes?date=YYYY-MM-DD&cinemaId= (ngày tính theo giờ Việt Nam) */
export const movieShowtimes = asyncHandler(async (req, res) => {
  const id = toId(req.params.id);
  let from = null;
  let to = null;
  if (req.query.date) {
    from = new Date(`${req.query.date}T00:00:00+07:00`);
    if (Number.isNaN(from.getTime())) throw new HttpError(400, 'Ngày không hợp lệ.');
    to = new Date(from.getTime() + 24 * 3600 * 1000);
  }
  const rows = await query(
    `SELECT * FROM vw_ShowtimeSummary
     WHERE MovieId = @Id AND Status = 'SCHEDULED' AND StartTime > SYSUTCDATETIME()
       AND (@From IS NULL OR (StartTime >= @From AND StartTime < @To))
       AND (@CinemaId IS NULL OR CinemaId = @CinemaId)
     ORDER BY StartTime`,
    { Id: id, From: from, To: to, CinemaId: req.query.cinemaId ? toId(req.query.cinemaId, 'cinemaId') : null },
  );
  ok(res, rows);
});

export const getShowtime = asyncHandler(async (req, res) => {
  const id = toId(req.params.id);
  const [st] = await query(
    `SELECT v.*, m.PosterUrl, m.AgeRating, m.DurationMin, c.Address FROM vw_ShowtimeSummary v
     JOIN Movies m ON m.MovieId = v.MovieId JOIN Cinemas c ON c.CinemaId = v.CinemaId WHERE v.ShowtimeId = @Id`,
    { Id: id },
  );
  if (!st) throw new HttpError(404, 'Không tìm thấy suất chiếu.');
  st.prices = await query('SELECT SeatType, Price FROM ShowtimePrices WHERE ShowtimeId = @Id', { Id: id });
  ok(res, st);
});

// ---- Đánh giá / yêu thích ----
export const reviewSchema = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().max(1000).optional() });

export const listReviews = asyncHandler(async (req, res) =>
  ok(res, await query(
    `SELECT r.ReviewId, r.Rating, r.Comment, r.CreatedAt, u.FullName FROM Reviews r JOIN Users u ON u.UserId = r.UserId
     WHERE r.MovieId = @Id ORDER BY r.CreatedAt DESC`, { Id: toId(req.params.id) })),
);

export const saveReview = asyncHandler(async (req, res) => {
  const movieId = toId(req.params.id);
  const params = { UserId: req.user.userId, MovieId: movieId, Rating: req.body.rating, Comment: req.body.comment ?? null };
  const updated = await query('UPDATE Reviews SET Rating = @Rating, Comment = @Comment, CreatedAt = SYSUTCDATETIME() OUTPUT INSERTED.ReviewId WHERE UserId = @UserId AND MovieId = @MovieId', params);
  if (!updated.length) await query('INSERT INTO Reviews (UserId, MovieId, Rating, Comment) VALUES (@UserId, @MovieId, @Rating, @Comment)', params);
  ok(res, null, 'Đã lưu đánh giá', 201);
});

export const listFavorites = asyncHandler(async (req, res) =>
  ok(res, await query(
    `SELECT m.MovieId, m.Title, m.PosterUrl, m.Status FROM MovieFavorites f JOIN Movies m ON m.MovieId = f.MovieId
     WHERE f.UserId = @UserId ORDER BY f.CreatedAt DESC`, { UserId: req.user.userId })),
);
export const addFavorite = asyncHandler(async (req, res) => {
  const p = { UserId: req.user.userId, MovieId: toId(req.params.movieId, 'movieId') };
  await query('IF NOT EXISTS (SELECT 1 FROM MovieFavorites WHERE UserId = @UserId AND MovieId = @MovieId) INSERT INTO MovieFavorites (UserId, MovieId) VALUES (@UserId, @MovieId)', p);
  ok(res, null, 'Đã thêm vào yêu thích', 201);
});
export const removeFavorite = asyncHandler(async (req, res) => {
  await query('DELETE FROM MovieFavorites WHERE UserId = @UserId AND MovieId = @MovieId', { UserId: req.user.userId, MovieId: toId(req.params.movieId, 'movieId') });
  ok(res, null, 'Đã bỏ yêu thích');
});
