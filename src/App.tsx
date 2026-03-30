import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Providers } from "./context/Providers";
import LandingPage from "./pages/Landing";
import LoginPage from "./pages/Login";
import SignupPage from "./pages/Signup";
import SetupProfilePage from "./pages/SetupProfile";
import LeaderboardPage from "./pages/Leaderboard";
import MyPage from "./pages/MyPage";
import MySubscriptionsPage from "./pages/MySubscriptions";
import CreatorProfilePage from "./pages/CreatorProfile";

export function App() {
  return (
    <BrowserRouter>
      <Providers>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/setup-profile" element={<SetupProfilePage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/my-page" element={<MyPage />} />
          <Route path="/my-subscriptions" element={<MySubscriptionsPage />} />
          <Route path="/creator/:username" element={<CreatorProfilePage />} />
        </Routes>
      </Providers>
    </BrowserRouter>
  );
}
