/* =========================================
   LOGIN PAGE SCRIPT - FIXED VERSION
========================================= */

// Use the Google Apps Script endpoint (same backend used by registration)
const LOGIN_API = 'https://script.google.com/macros/s/AKfycbxxdkWVWlySUilRMCtNL8GMpT9iy6Vnsi0_AHhiRSPiTywlUe2kSqLSntidaI-fieCnOQ/exec';

/* =========================
   PASSWORD VISIBILITY
========================= */
function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const icon = btn.querySelector('i');

  if (input.type === 'password') {
    input.type = 'text';
    if (icon) icon.classList.replace('fa-eye', 'fa-eye-slash');
  } else {
    input.type = 'password';
    if (icon) icon.classList.replace('fa-eye-slash', 'fa-eye');
  }
}

/* =========================
   FORGOT PASSWORD
========================= */
document.addEventListener('DOMContentLoaded', () => {
  // attach handlers for forgot password UI
  const forgotLink = document.getElementById('forgotLink');
  const forgotModal = document.getElementById('forgotModal');
  const forgotCancel = document.getElementById('forgotCancel');
  const forgotSubmit = document.getElementById('forgotSubmit');

  if (forgotLink && forgotModal) {
    forgotLink.addEventListener('click', (e) => {
      e.preventDefault();
      forgotModal.style.display = 'flex';
      // center modal via CSS already in place
    });
  }

  if (forgotCancel && forgotModal) {
    forgotCancel.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('forgotCode').value = '';
      document.getElementById('forgotResult').innerText = '';
      forgotModal.style.display = 'none';
    });
  }

  if (forgotSubmit) {
    forgotSubmit.addEventListener('click', async (e) => {
      e.preventDefault();
      const code = document.getElementById('forgotCode').value.trim();
      const phone = (document.getElementById('forgotPhone') || {}).value;
      const parentPhone = (document.getElementById('forgotParentPhone') || {}).value;
      const resultEl = document.getElementById('forgotResult');
      if (!code || !phone || !parentPhone) {
        resultEl.innerText = 'Please enter code, your phone and parent phone.';
        return;
      }

      resultEl.innerText = 'Verifying...';

      try {
        const url = `${LOGIN_API}?action=forgotPassword&code=${encodeURIComponent(code)}&phone=${encodeURIComponent(phone)}&parentPhone=${encodeURIComponent(parentPhone)}`;
        const resp = await fetch(url, { method: 'GET', mode: 'cors' });
        if (!resp.ok) throw new Error('Network response not ok');
        const text = await resp.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (parseErr) {
          console.error('Forgot password: non-JSON response', text.slice(0, 800));
          resultEl.innerText = 'Server returned non-JSON response. Check the backend URL.';
          return;
        }
        if (data && data.status === 'success') {
          const pwd = data.password || '';
          if (pwd) {
            resultEl.innerHTML = `Password retrieved: <strong style="color:var(--primary-light);">${pwd}</strong>`;
          } else {
            resultEl.innerText = 'Password not available.';
          }
        } else {
          resultEl.innerText = data.message || 'Verification failed or account not found.';
        }
      } catch (err) {
        console.error('Forgot password error', err);
        resultEl.innerText = 'Connection error. Try again later.';
      }
    });
  }
});

/* =========================
   CHECK IF LOGGED IN
========================= */
function getLoggedInUser() {
  try {
    return JSON.parse(localStorage.getItem('loggedInUser'));
  } catch {
    return null;
  }
}

function loginUser(userData) {
  localStorage.setItem('loggedInUser', JSON.stringify(userData));
}

/* =========================
   INIT
========================= */
document.addEventListener('DOMContentLoaded', () => {

  // لو مسجل دخول بالفعل
  const user = getLoggedInUser();
  if (user) {
    window.location.href = 'profile.html';
    return;
  }

  initLoginForm();
});

/* =========================
   LOGIN FORM
========================= */
function initLoginForm() {

  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {

    e.preventDefault();

    const alertEl = document.getElementById('formAlert');
    const submitBtn = form.querySelector('button[type="submit"]');

    const code = document.getElementById('loginCode').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    /* ===== VALIDATION ===== */
    if (!code || !password) {
      if (alertEl) {
        alertEl.innerHTML =
          '<div class="alert alert-error"><i class="fas fa-exclamation-circle"></i> Please fill all fields</div>';
        alertEl.style.display = 'block';
      }
      return;
    }

    /* ===== LOADING STATE ===== */
    submitBtn.disabled = true;
    submitBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Logging in...';

    if (alertEl) {
      alertEl.innerHTML = '';
      alertEl.style.display = 'none';
    }

    try {

      const url = `${LOGIN_API}?action=login&code=${encodeURIComponent(code)}&password=${encodeURIComponent(password)}`;
      console.log('Sending request to:', url);

      const response = await fetch(url, { method: 'GET', mode: 'cors' });
      if (!response.ok) throw new Error('Network response was not ok');

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        console.error('LOGIN: non-JSON response', text.slice(0, 800));
        throw new Error('Server returned non-JSON response. Check LOGIN_API URL or network.');
      }
      console.log('LOGIN RESPONSE:', data);

      /* ===== SUCCESS ===== */
      if (data.status === 'success' && data.data) {

        loginUser(data.data);

        if (alertEl) {
          alertEl.innerHTML =
            '<div class="alert alert-success"><i class="fas fa-check-circle"></i> Login successful!</div>';
          alertEl.style.display = 'block';
        }

        setTimeout(() => {
          window.location.href = 'profile.html';
        }, 1000);

      } else {

        /* ===== ERROR FROM SERVER ===== */
        if (alertEl) {
          alertEl.innerHTML =
            `<div class="alert alert-error"><i class="fas fa-exclamation-circle"></i> ${data.message || "Invalid code or password"}</div>`;
          alertEl.style.display = 'block';
        }

      }

    } catch (error) {

      console.error("LOGIN ERROR:", error);

      if (alertEl) {
        alertEl.innerHTML =
          '<div class="alert alert-error"><i class="fas fa-exclamation-circle"></i> Connection error. Please try again.</div>';
        alertEl.style.display = 'block';
      }

    } finally {

      submitBtn.disabled = false;
      submitBtn.innerHTML =
        '<i class="fas fa-sign-in-alt"></i> Login';

    }

  });

}
