import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import App from "./App";
import HomePage from "./pages/HomePage";

import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <BrowserRouter future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
    }}>
        <Routes>
            <Route path="/" element={<HomePage/>} />
            <Route path="/analysis" element={<App/>} />
            <Route path="*" element={<HomePage/>} />
        </Routes>
    </BrowserRouter>
);
