import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminPage } from "@/pages/admin-page";
import { AdminLoginPage } from "@/pages/admin-login-page";
import { SurveyE2Page } from "@/pages/survey-e2-page";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename="/pesquisa">
      <Routes>
        <Route path="/" element={<SurveyE2Page />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
