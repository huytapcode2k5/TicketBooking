import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import * as c from '../controllers/catalog.controller.js';

const r = Router();
r.get('/movies', c.listMovies);
r.get('/movies/:id', c.getMovie);
r.get('/movies/:id/showtimes', c.movieShowtimes);
r.get('/movies/:id/reviews', c.listReviews);
r.post('/movies/:id/reviews', requireAuth, validate(c.reviewSchema), c.saveReview);
r.get('/genres', c.listGenres);
r.get('/cinemas', c.listCinemas);
r.get('/showtimes/:id', c.getShowtime);
r.get('/favorites', requireAuth, c.listFavorites);
r.post('/favorites/:movieId', requireAuth, c.addFavorite);
r.delete('/favorites/:movieId', requireAuth, c.removeFavorite);
export default r;
