import { useState } from "react";
import axios from "axios";
import { Eye, EyeOff } from "lucide-react";
import type { AccessTokenResponse } from "@shared/auth";
import { api } from "../api";
import Toast from "./Toast";

const Auth = ({ onAuth }: { onAuth: (accessToken: string) => void }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const handleSubmit = async () => {
    try {
      const res = await api.post(`/api/auth/${mode}`, {
        email,
        password,
      });

      if (mode === "login") {
        const data = res.data as AccessTokenResponse;

        onAuth(data.accessToken);
      } else {
        setMode("login");
        setToast({
          message: "Registration successful. Please login.",
          type: "success",
        });
      }
    } catch (err: unknown) {
      let message = "Something went wrong";

      if (axios.isAxiosError(err)) {
        if (err.response?.data?.error) {
          message = err.response.data.error;
        } else {
          message =
            "Cannot reach server. Check that backend is running and API URL is correct.";
        }
      }

      setToast({
        message,
        type: "error",
      });
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>{mode === "login" ? "Login" : "Register"}</h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div className="password-wrapper">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <span
            className="eye-toggle"
            onClick={() => setShowPassword((prev) => !prev)}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </span>
        </div>

        <button onClick={handleSubmit}>
          {mode === "login" ? "Login" : "Register"}
        </button>

        <p
          className="auth-toggle"
          onClick={() =>
            setMode((prev) => {
              const newMode = prev === "login" ? "register" : "login";

              setEmail("");
              setPassword("");
              setShowPassword(false);

              return newMode;
            })
          }
        >
          {mode === "login"
            ? "No account? Register"
            : "Already have an account? Login"}
        </p>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default Auth;
