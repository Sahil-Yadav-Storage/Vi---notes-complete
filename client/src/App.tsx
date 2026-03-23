import { useEffect, useState } from "react";
import type { AccessTokenResponse } from "@shared/auth";
import { api, setAccessToken } from "./api";
import Editor from "./components/Editor";
import Auth from "./components/Auth";
import "./styles.css";

function App() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    if (saved) return saved;

    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    return prefersDark ? "dark" : "light";
  });

  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isBootstrappingAuth, setIsBootstrappingAuth] = useState(true);

  useEffect(() => {
    if (theme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }

    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    setAccessToken(accessToken);
  }, [accessToken]);

  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      try {
        const response =
          await api.post<AccessTokenResponse>("/api/auth/refresh");

        if (isMounted) {
          setAccessTokenState(response.data.accessToken);
        }
      } catch {
        if (isMounted) {
          setAccessTokenState(null);
        }
      } finally {
        if (isMounted) {
          setIsBootstrappingAuth(false);
        }
      }
    };

    bootstrapAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleLogout = async () => {
    try {
      await api.post("/api/auth/logout");
    } finally {
      setAccessTokenState(null);
    }
  };

  if (isBootstrappingAuth) {
    return <div className="app">Loading...</div>;
  }

  const isAuth = !!accessToken;

  return (
    <div className="app">
      <div className="app-header">
        <div className="header-inner">
          <div className="header-left">
            <label className="theme-switch">
              <input
                type="checkbox"
                checked={theme === "light"}
                onChange={toggleTheme}
                aria-label="Toggle light theme"
                title="Toggle light theme"
              />
              <span className="slider" />
            </label>
          </div>

          <h1 className="header-title">Vi-Notes Editor</h1>

          <div className="header-right">
            {isAuth && (
              <button className="logout-btn" onClick={handleLogout}>
                Logout
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="app-content">
        {!isAuth ? <Auth onAuth={setAccessTokenState} /> : <Editor />}
      </div>
    </div>
  );
}

export default App;
