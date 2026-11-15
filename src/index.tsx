import ReactDOM from "react-dom/client";
import {
    BrowserRouter, HashRouter, Route, Routes
} from "react-router-dom";

import App from "./App";
import PageTransition from "./components/PageTransition";
import GlossaryPage from "./pages/GlossaryPage";
import HomePage from "./pages/HomePage";
import OpeningsPage from "./pages/OpeningsPage";
import PuzzlesPage from "./pages/PuzzlesPage";
import TrainingPage from "./pages/TrainingPage";

import "./index.css";

const pages = location.hostname.endsWith("github.io")
    || location.pathname.startsWith("/chessassist");
const Router = pages ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById("root")!).render(
    <Router future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
    }}>
        {!pages && <PageTransition/>}
        <Routes>
            <Route path="/" element={<HomePage/>} />
            <Route path="/analysis" element={<App/>} />
            <Route path="/training" element={<TrainingPage/>} />
            <Route path="/puzzles" element={<PuzzlesPage/>} />
            <Route path="/openings" element={<OpeningsPage/>} />
            <Route path="/glossary" element={<GlossaryPage/>} />
            <Route path="*" element={<HomePage/>} />
        </Routes>
    </Router>
);
