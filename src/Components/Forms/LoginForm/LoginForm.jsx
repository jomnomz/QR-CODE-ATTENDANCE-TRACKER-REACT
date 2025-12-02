import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import styles from "./LoginForm.module.css";
import Button from "../../UI/Buttons/Button/Button";
import stonino from "../../../assets/sto nino.png";
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ReportGmailerrorredIcon from '@mui/icons-material/ReportGmailerrorred';

function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: username,
        password,
      });

      if (error) {
        setError("Email or password is invalid");
        return;
      }

      const { data: userData, error: profileError } = await supabase
        .from("users")
        .select("role, status")
        .eq("user_id", data.user.id)
        .single();

      if (profileError || !userData) {
        setError("User profile not found");
        return;
      }

      if (userData.status !== "active") {
        if (userData.status === "inactive") {
          setError("This account has been deactivated");
        } else {
          setError("Your account is not yet approved");
        }
        return;
      }

      if (userData.role === "admin") navigate("/admin/dashboard");
      else if (userData.role === "teacher") navigate("/teacher/dashboard");
      else navigate("/");

    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleLogin}>
      <div className={styles.logo}>
        <img src={stonino} alt="Stonino" />
      </div>

      <div className={styles.inputWrapper}>
        <input
          className={styles.input}
          type="text"
          placeholder="Email"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>

      <div className={styles.inputWrapper}>
        <div className={styles.passwordContainer}>
          <input
            className={styles.input}
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className={styles.eyeButton}
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <VisibilityOffIcon sx={{ fontSize: 20 }}/> : <VisibilityIcon sx={{ fontSize: 20 }}/>} 
          </button>
        </div>
      </div>

  <div className={styles.inputWrapper}>
        <Button
          label={loading ? "Logging in..." : "Login"}
          color="success"
          width="95"
          type="submit"
          disabled={loading}
      />
  </div>

      {error && <div className={styles.error}><ReportGmailerrorredIcon/> {error}</div>}
    </form>
  );
}

export default LoginForm;