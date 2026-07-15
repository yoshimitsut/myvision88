import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Páginas Públicas
import Hero from './pages/public/Hero';
import CakeInformation from './pages/public/CakeInformations';
import CakeInformationSize from './pages/public/CakeInformationsSize';
import OrderCake from './pages/public/OrderCake';
import Gift from './pages/public/Gift';
import OrderGift from './pages/public/OrderGift';
import Check from './pages/public/Check';
import Newsletter from './pages/public/Newsletter';

// Páginas Admin
import StoreLogin from './pages/admin/StoreLogin';
import ListOrder from './pages/admin/ListOrder';
import SalesOrder from './pages/admin/SalesOrder';
import OrderCakeStore from './pages/admin/OrderCakeStore';
import TimeSlotsManagement from './pages/admin/TimeSlotsManagement';
import CakeManagement from './pages/admin/CakeManagement';
import SameDayCakeManagement from './pages/admin/SameDayCakeManagement';
import GiftManagement from './pages/admin/GiftManagement';
import StoreManagement from './pages/admin/StoreManagement';
import NewsletterManagement from './pages/admin/NewsletterManagement';
import StoreSettings from './pages/admin/StoreSettings';

// Componentes
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Hero />} />
        <Route path="/cakeinformation" element={<CakeInformation />} />
        <Route path="/cakeinformationsize" element={<CakeInformationSize />} />
        <Route path="/order" element={<OrderCake />} />
        <Route path="/newsletter" element={<Newsletter />} />
        <Route path="/gift" element={<Gift />} />
        <Route path="/gift/order" element={<OrderGift />} />

        <Route path="/orderstore" element={
          <ProtectedRoute>
            <OrderCakeStore />
          </ProtectedRoute>
        } />

        <Route path="/list" element={
          <ProtectedRoute>
            <ListOrder />
          </ProtectedRoute>
        } />

        <Route path="/ordertable" element={
          <ProtectedRoute>
            <SalesOrder />
          </ProtectedRoute>
        } />

        <Route path="/admin/date" element={
          <ProtectedRoute>
            <TimeSlotsManagement />
          </ProtectedRoute>
        } />

        <Route path="/admin/cake" element={
          <ProtectedRoute>
            <CakeManagement />
          </ProtectedRoute>
        } />

        <Route path="/admin/same-day-cake" element={
          <ProtectedRoute>
            <SameDayCakeManagement />
          </ProtectedRoute>
        } />

        <Route path="/admin/gift" element={
          <ProtectedRoute>
            <GiftManagement />
          </ProtectedRoute>
        } />

        <Route path="/admin/store" element={
          <ProtectedRoute>
            <StoreManagement />
          </ProtectedRoute>
        } />

        <Route path="/admin/newsletter" element={
          <ProtectedRoute>
            <NewsletterManagement />
          </ProtectedRoute>
        } />

        <Route path="/admin/storesettings" element={
          <ProtectedRoute>
            <StoreSettings />
          </ProtectedRoute>
        } />


        <Route path="/store-login" element={<StoreLogin />} />

        <Route path="/order/check" element={<Check />} />
      </Routes>

    </Router>
  );
}

export default App;
