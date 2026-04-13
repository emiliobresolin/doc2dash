import { Route, Routes } from "react-router-dom";

import { DashboardPage } from "../features/dashboard/DashboardPage";
import { UploadPage } from "../features/upload/UploadPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<UploadPage />} />
      <Route path="/uploads/:uploadId" element={<DashboardPage />} />
    </Routes>
  );
}
