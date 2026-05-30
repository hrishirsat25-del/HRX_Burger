import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CustomerApp from './CustomerApp';
import StaffApp from './StaffApp';
import AdminApp from './AdminApp';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CustomerApp />} />
        <Route path="/staff" element={<StaffApp />} />
        <Route path="/admin" element={<AdminApp />} />
      </Routes>
    </BrowserRouter>
  );
}
