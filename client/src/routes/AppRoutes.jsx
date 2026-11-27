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
import AdminCoupons from '../pages/admin/AdminCoupons.jsx';
import AdminEvents from '../pages/admin/AdminEvents.jsx';
import AdminVenues from '../pages/admin/AdminVenues.jsx';
import AdminShowtimes from '../pages/admin/AdminShowtimes.jsx';
import AdminUsers from '../pages/admin/AdminUsers.jsx';
import AdminOrders from '../pages/admin/AdminOrders.jsx';

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
        <Route path="orders" element={<AdminOrders />} />
        <Route path="events" element={<AdminEvents />} />
        <Route path="venues" element={<AdminVenues />} />
        <Route path="showtimes" element={<AdminShowtimes />} />
        <Route path="coupons" element={<AdminCoupons />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="payments" element={<PaymentReview />} />
      </Route>
    </Routes>
  );
}
