// login.js - Handles Firebase authentication for Cafe Vita Admin Panel
import { 
  auth, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  initializeDefaultData 
} from "./firebase.js";
import { createUserWithEmailAndPassword } from "firebase/auth";

document.addEventListener("DOMContentLoaded", async () => {
  // Initialize default Firestore seed data if needed
  initializeDefaultData().catch(err => console.warn("Seed init:", err));

  const loginForm = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const loginBtn = document.getElementById("loginBtn");
  const alertBox = document.getElementById("alertBox");
  const btnSpinner = document.getElementById("btnSpinner");
  const btnText = document.getElementById("btnText");
  const togglePassword = document.getElementById("togglePassword");

  // Helper: Show Alert Message
  function showAlert(message, type = "error") {
    if (!alertBox) return;
    alertBox.style.display = "block";
    alertBox.className = `alert-box alert-${type}`;
    alertBox.innerHTML = `<i class="fas fa-${type === 'error' ? 'exclamation-triangle' : 'check-circle'}"></i> ${message}`;
  }

  // Helper: Hide Alert Message
  function hideAlert() {
    if (!alertBox) return;
    alertBox.style.display = "none";
  }

  // Check if arriving from a Logout action
  const urlParams = new URLSearchParams(window.location.search);
  const isLoggedOut = urlParams.get("logout") === "success" || 
                      urlParams.get("loggedOut") === "true" || 
                      sessionStorage.getItem("loggedOutMsg") === "true";

  if (isLoggedOut) {
    try {
      sessionStorage.removeItem("loggedOutMsg");
      localStorage.clear();
    } catch (e) {}

    // Force sign out from Firebase
    signOut(auth).catch(err => console.warn("Signout cleanup error:", err));

    showAlert("Logged out successfully.", "success");

    // Clean up URL parameters without refreshing page
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  // Toggle Password Visibility
  if (togglePassword && passwordInput) {
    togglePassword.addEventListener("click", () => {
      const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
      passwordInput.setAttribute("type", type);
      togglePassword.classList.toggle("fa-eye");
      togglePassword.classList.toggle("fa-eye-slash");
    });
  }

  // Check if user is already authenticated
  onAuthStateChanged(auth, (user) => {
    if (user && !isLoggedOut) {
      window.location.href = "admin.html";
    }
  });

  // Helper: Set Loading State
  function setLoading(loading) {
    loginBtn.disabled = loading;
    if (loading) {
      btnSpinner.style.display = "inline-block";
      btnText.style.opacity = "0.7";
    } else {
      btnSpinner.style.display = "none";
      btnText.style.opacity = "1";
    }
  }

  // Handle Form Submit
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      showAlert("Please fill in both email and password.", "error");
      return;
    }

    setLoading(true);

    try {
      // 1. Try Signing In
      await signInWithEmailAndPassword(auth, email, password);
      showAlert("Login successful! Redirecting to Dashboard...", "success");
      setTimeout(() => {
        window.location.href = "admin.html";
      }, 800);
    } catch (err) {
      console.warn("Sign-in error code:", err.code, err.message);

      // If user not found or auth credentials error, attempt to auto-create admin account on first use
      if (
        err.code === "auth/user-not-found" || 
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password"
      ) {
        try {
          // Attempt account creation if password length is valid
          if (password.length >= 6) {
            await createUserWithEmailAndPassword(auth, email, password);
            showAlert("Admin account registered & logged in! Redirecting...", "success");
            setTimeout(() => {
              window.location.href = "admin.html";
            }, 800);
            return;
          }
        } catch (createErr) {
          console.warn("Auto-create fallback failed:", createErr.message);
        }
      }

      // Display friendly error messages
      let msg = "Failed to sign in. Please check your credentials.";
      if (err.code === "auth/invalid-email") msg = "Invalid email format.";
      if (err.code === "auth/wrong-password") msg = "Incorrect password. Please try again.";
      if (err.code === "auth/too-many-requests") msg = "Access temporarily disabled due to many failed attempts. Try again later.";
      
      showAlert(msg, "error");
      setLoading(false);
    }
  });
});
