import { Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout.jsx';
import AdminLayout from '../layouts/AdminLayout.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import Home from '../pages/Home.jsx';
import EventDetail from '../pages/EventDetail.jsx';
import Booking from '../pages/Booking.jsx';
import Checkout from '../pages/Checkout.jsx';
import Payment from '../pages/Payment.jsx';
import PaymentResult from '../pages/PaymentResult.jsx';
import MyTickets from '../pages/MyTickets.jsx';
import Login from '../pages/Login.jsx';
import Register from '../pages/Register.jsx';
import { ForgotPassword, ResetPassword } from '../pages/PasswordPages.jsx';
import Profile from '../pages/Profile.jsx';
import NotFound from '../pages/NotFound.jsx';
import CheckIn from '../pages/staff/CheckIn.jsx';
import Dashboard from '../pages/admin/Dashboard.jsx';
import PaymentReview from '../pages/admin/PaymentReview.jsx';
import AdminTodo from '../pages/admin/AdminTodo.jsx';

const authed = (el) => <ProtectedRoute>{el}</ProtectedRoute>;

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/booking/:showtimeId" element={<Booking />} />
        <Route path="/checkout" element={authed(<Checkout />)} />
        <Route path="/payment/result" element={authed(<PaymentResult />)} />
        <Route path="/payment/:orderId" element={authed(<Payment />)} />
        <Route path="/my-tickets" element={authed(<MyTickets />)} />
        <Route path="/profile" element={authed(<Profile />)} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/staff/check-in" element={<ProtectedRoute roles={['STAFF', 'ADMIN']}><CheckIn /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><AdminLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="events" element={<AdminTodo title="Quản lý sự kiện" owner="A8"
          api={['GET /api/admin/movies', 'POST /api/admin/movies', 'PUT /api/admin/movies/:id', 'DELETE /api/admin/movies/:id', 'POST /api/admin/upload']} />} />
        <Route path="venues" element={<AdminTodo title="Địa điểm, phòng và sơ đồ ghế" owner="A9"
          api={['POST /api/admin/cinemas', 'GET/POST /api/admin/rooms', 'POST /api/admin/rooms/:id/generate-seats', 'PATCH /api/admin/seats/:id']} />} />
        <Route path="showtimes" element={<AdminTodo title="Suất chiếu" owner="A10"
          api={['GET /api/admin/showtimes', 'POST /api/admin/showtimes', 'DELETE /api/admin/showtimes/:id']} />} />
        <Route path="coupons" element={<AdminTodo title="Mã giảm giá và combo" owner="B6"
          api={['GET/POST/PUT /api/admin/coupons', 'GET/POST/PUT /api/admin/products']} />} />
        <Route path="users" element={<AdminTodo title="Người dùng" owner="A11"
          api={['GET /api/admin/users?q=', 'PATCH /api/admin/users/:id  { role, isActive }']} />} />
        <Route path="payments" element={<PaymentReview />} />
      </Route>
    </Routes>
  );
}
