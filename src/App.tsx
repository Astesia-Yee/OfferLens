/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Settings from './pages/Settings';
import NewInterview from './pages/NewInterview';
import InterviewDetail from './pages/InterviewDetail';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="/new" element={<NewInterview />} />
        <Route path="/interview/:id" element={<InterviewDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

