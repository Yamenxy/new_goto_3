/* ============================
   MAIN.JS - Shared functionality
   ============================ */

// ===== AUTH GUARD (runs immediately) =====
(function() {
  const page = window.location.pathname.split('/').pop().toLowerCase() || 'index.html';
  const publicPages = ['register.html', 'login.html'];
  if (!publicPages.includes(page)) {
    try {
      const userData = localStorage.getItem('loggedInUser');
      if (!userData) {
        window.location.replace('register.html');
        return;
      }
    } catch (e) {
      window.location.replace('register.html');
      return;
    }
  }
})();

// ===== Language System =====
let currentLang = localStorage.getItem('lang') || 'en';

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  
  const isArabic = lang === 'ar';
  document.documentElement.lang = lang;
  document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
  document.body.dir = isArabic ? 'rtl' : 'ltr';
  
  document.querySelectorAll('[data-en]').forEach(el => {
    const text = el.getAttribute(`data-${lang}`);
    if (text) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = text;
      } else {
        el.textContent = text;
      }
    }
  });
  
  const langText = document.getElementById('langText');
  if (langText) langText.textContent = isArabic ? 'English' : 'عربي';
  
  document.body.style.fontFamily = isArabic ? "'Cairo', sans-serif" : "'Poppins', sans-serif";
  
  updateNavAuth();
}

function toggleLanguage() {
  setLanguage(currentLang === 'en' ? 'ar' : 'en');
}

// ===== Loader =====
window.addEventListener('load', () => {
  setTimeout(() => {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.add('hidden');
  }, 1000);
  
  setLanguage(currentLang);
  updateNavAuth();
  initScrollAnimations();
  initParticles();
  initCounters();
});

// ===== Mobile Menu =====
function toggleMenu() {
  const navLinks = document.getElementById('navLinks');
  const menuToggle = document.getElementById('menuToggle');
  navLinks.classList.toggle('active');
  menuToggle.classList.toggle('active');
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      const navLinks = document.getElementById('navLinks');
      const menuToggle = document.getElementById('menuToggle');
      if (navLinks) navLinks.classList.remove('active');
      if (menuToggle) menuToggle.classList.remove('active');
    });
  });
});

// ===== Scroll Effects =====
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (navbar) {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      if (document.querySelector('.hero')) navbar.classList.remove('scrolled');
    }
  }
});

// ===== Scroll Animations =====
function initScrollAnimations() {
  const elements = document.querySelectorAll('.about-card, .team-card, .content-card');
  elements.forEach(el => el.classList.add('fade-in'));
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  
  elements.forEach(el => observer.observe(el));
}

// ===== Particles =====
function initParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  
  for (let i = 0; i < 30; i++) {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDuration = (Math.random() * 10 + 8) + 's';
    particle.style.animationDelay = (Math.random() * 10) + 's';
    particle.style.width = (Math.random() * 4 + 2) + 'px';
    particle.style.height = particle.style.width;
    
    const colors = ['var(--primary-light)', 'var(--secondary)', 'var(--accent)'];
    particle.style.background = colors[Math.floor(Math.random() * colors.length)];
    container.appendChild(particle);
  }
}

// ===== Counter Animation =====
function initCounters() {
  const counters = document.querySelectorAll('.stat-number[data-count]');
  if (!counters.length) return;
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target, parseInt(entry.target.getAttribute('data-count')));
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  
  counters.forEach(counter => observer.observe(counter));
}

function animateCounter(element, target) {
  let current = 0;
  const increment = target / 60;
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      element.textContent = target;
      clearInterval(timer);
    } else {
      element.textContent = Math.floor(current);
    }
  }, 33);
}

// ===== Toast Notifications =====
function showToast(message, type = 'success') {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? 'fa-check-circle' : 
               type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
  toast.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 100);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ===== Alert Helper =====
function showAlert(containerId, message, type = 'error') {
  const container = document.getElementById(containerId);
  if (!container) return;
  const icon = type === 'success' ? 'fa-check-circle' : 
               type === 'error' ? 'fa-exclamation-circle' :
               type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';
  container.innerHTML = `<div class="alert alert-${type}"><i class="fas ${icon}"></i> ${message}</div>`;
  container.style.display = 'block';
}

function hideAlert(containerId) {
  const container = document.getElementById(containerId);
  if (container) { container.style.display = 'none'; container.innerHTML = ''; }
}

// ===== Utility =====
function validatePhone(phone) {
  return /^01[0-9]{9}$/.test(phone);
}

// ============================
// AUTH SYSTEM
// ============================
function getLoggedInUser() {
  try {
    const userData = localStorage.getItem('loggedInUser');
    if (!userData) return null;
    return JSON.parse(userData);
  } catch (e) { return null; }
}

function loginUser(userData) {
  localStorage.setItem('loggedInUser', JSON.stringify(userData));
  updateNavAuth();
}

function logoutUser() {
  localStorage.removeItem('loggedInUser');
  const lang = localStorage.getItem('lang') || 'en';
  showToast(lang === 'ar' ? 'تم تسجيل الخروج' : 'Logged out successfully', 'success');
  setTimeout(() => { window.location.href = 'register.html'; }, 600);
}

function updateNavAuth() {
  const navAuth = document.getElementById('navAuth');
  if (!navAuth) return;

  const user = getLoggedInUser();
  const lang = localStorage.getItem('lang') || 'en';

  if (user) {
    const profileText = lang === 'ar' ? 'ملفي' : 'Profile';
    const logoutText = lang === 'ar' ? 'خروج' : 'Logout';
    navAuth.innerHTML = `
      <a href="profile.html" class="nav-link nav-profile-link" data-en="Profile" data-ar="ملفي">
        <i class="fas fa-user-circle"></i> ${profileText}
      </a>
      <a href="#" class="nav-link" onclick="logoutUser(); return false;" data-en="Logout" data-ar="خروج">
        <i class="fas fa-sign-out-alt"></i> ${logoutText}
      </a>
    `;
    // Replace all register links with profile
    document.querySelectorAll('a[href="register.html"]').forEach(link => {
      link.href = 'profile.html';
      const icon = link.querySelector('i.fa-user-plus');
      if (icon) { icon.classList.remove('fa-user-plus'); icon.classList.add('fa-user-circle'); }
      if (link.getAttribute('data-en')) {
        link.setAttribute('data-en', 'Profile');
        link.setAttribute('data-ar', 'ملفي');
        link.textContent = lang === 'ar' ? 'ملفي' : 'Profile';
      }
      const span = link.querySelector('span[data-en]');
      if (span) {
        span.setAttribute('data-en', 'My Profile');
        span.setAttribute('data-ar', 'ملفي الشخصي');
        span.textContent = lang === 'ar' ? 'ملفي الشخصي' : 'My Profile';
      }
    });
  } else {
    const loginText = lang === 'ar' ? 'دخول' : 'Login';
    const registerText = lang === 'ar' ? 'التسجيل' : 'Register';
    navAuth.innerHTML = `
      <a href="login.html" class="nav-link" data-en="Login" data-ar="دخول">
        <i class="fas fa-sign-in-alt"></i> ${loginText}
      </a>
      <a href="register.html" class="nav-link" data-en="Register" data-ar="التسجيل">
        <i class="fas fa-user-plus"></i> ${registerText}
      </a>
    `;
  }
}