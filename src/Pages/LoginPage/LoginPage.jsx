import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Components/Authentication/AuthProvider/AuthProvider";
import styles from "./LoginPage.module.css";
import LoginForm from "../../Components/forms/LoginForm/LoginForm";
import stoninoschool from "../../assets/sto nino school.png";

const LoginPage = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect if user is logged in AND account is active
    if (!loading && user && profile && profile.status === "active") {
      if (profile.role === "admin") navigate("/admin/dashboard");
      else if (profile.role === "teacher") navigate("/teacher/dashboard");
    }
  }, [loading, user, profile, navigate]);

 /*  if (loading) {
    return (
      <div style={{
        width: "100vw",
        height: "100vh",
        backgroundColor: "white",
        display: "flex",
        justifyContent: "center",
        alignItems: "center"
      }}>
        <div>Loading...</div>
      </div>
    );
  } */

  return (
    <div
      className={styles.body}
      style={{
        backgroundImage: `
          linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)),
          url(${stoninoschool})
        `
      }}
    >
      <div className={styles.tagLineContainer}>
        <div className={styles.tagLine}>
          <h1>Welcome!</h1>
          <h6>Login to your account to continue.</h6>
        </div>
      </div>

      <div className={styles.formContainer}>
        <LoginForm />
      </div>
    </div>
  );
};

export default LoginPage;