/* ===== Sections Page JS ===== */
const SECTIONS_API = '';

let currentSectionId = null;
let unlockedSections = JSON.parse(localStorage.getItem('unlockedSections') || '{}');
let videoUrlCache = JSON.parse(localStorage.getItem('videoUrlCache') || '{}');
let sectionsListCache = null; // in-memory cache for current session

document.addEventListener('DOMContentLoaded', () => {
  loadSectionsList();
});

/* ----- Load Sections List (cached 10 min in sessionStorage) ----- */
async function loadSectionsList() {
  const grid = document.getElementById('sectionsGrid');
  grid.innerHTML = '<div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div>';

  try {
    // Check sessionStorage cache first (10 min)
    const cached = sessionStorage.getItem('sectionsListCache');
    const cacheTime = sessionStorage.getItem('sectionsListCacheTime');
    let data;

    if (cached && cacheTime && (Date.now() - Number(cacheTime)) < 600000) {
      data = JSON.parse(cached);
    } else {
      const response = await fetch(`${SECTIONS_API}?action=list`, { credentials: 'omit', redirect: 'follow' });
      data = await response.json();
      if (data && Array.isArray(data)) {
        sessionStorage.setItem('sectionsListCache', JSON.stringify(data));
        sessionStorage.setItem('sectionsListCacheTime', String(Date.now()));
      }
    }

    sectionsListCache = data;

    if (data && data.length > 0) {
      grid.innerHTML = '';
      data.forEach((item, index) => {
        const isUnlocked = unlockedSections[item.id || index];
        const card = document.createElement('div');
        card.className = 'content-card';
        card.style.animationDelay = `${index * 0.1}s`;
        card.innerHTML = `
          <div class="card-icon"><i class="fas ${isUnlocked ? 'fa-unlock' : 'fa-lock'}"></i></div>
          <h3 class="card-title">${item.title || item.name || 'Section ' + (index + 1)}</h3>
          <p class="card-desc">${item.description || item.desc || ''}</p>
          <button class="btn ${isUnlocked ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="${isUnlocked ? `playSectionVideo('${item.id || index}', '${(item.title || item.name || '').replace(/'/g, "\\'")}')` : `openPasswordModal('${item.id || index}', '${(item.title || item.name || '').replace(/'/g, "\\'")}')`}">
            <i class="fas ${isUnlocked ? 'fa-play' : 'fa-key'}"></i>
            <span data-en="${isUnlocked ? 'Watch' : 'Unlock'}" data-ar="${isUnlocked ? 'مشاهدة' : 'فتح'}">${isUnlocked ? 'Watch' : 'Unlock'}</span>
          </button>
        `;
        grid.appendChild(card);
      });
    } else {
      grid.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p data-en="No sections available yet" data-ar="لا توجد حصص متاحة بعد">No sections available yet</p></div>';
    }
  } catch (err) {
    grid.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p data-en="Failed to load sections" data-ar="فشل تحميل الحصص">Failed to load sections</p></div>';
  }
}

/* ----- Password Modal ----- */
function openPasswordModal(sectionId, title) {
  currentSectionId = sectionId;
  document.getElementById('passwordModal').classList.add('active');
  document.getElementById('sectionPassword').value = '';
  document.getElementById('passwordAlert').innerHTML = '';
  document.getElementById('sectionPassword').focus();
}

function closePasswordModal() {
  document.getElementById('passwordModal').classList.remove('active');
  currentSectionId = null;
}

async function submitSectionPassword() {
  const password = document.getElementById('sectionPassword').value.trim();
  const alertEl = document.getElementById('passwordAlert');

  if (!password) {
    alertEl.innerHTML = '<div class="alert alert-error"><i class="fas fa-exclamation-circle"></i> <span data-en="Please enter password" data-ar="يرجى إدخال كلمة المرور">Please enter password</span></div>';
    return;
  }

  try {
    const response = await fetch(`${SECTIONS_API}?action=checkPassword&id=${encodeURIComponent(currentSectionId)}&password=${encodeURIComponent(password)}`, {
      credentials: 'omit',
      redirect: 'follow'
    });
    const data = await response.json();

    if (data.status === 'success' || data.valid === true) {
      // Mark section as unlocked
      unlockedSections[currentSectionId] = true;
      localStorage.setItem('unlockedSections', JSON.stringify(unlockedSections));

      // Cache the video URL returned by server (saves extra API call)
      if (data.videoUrl) {
        videoUrlCache[currentSectionId] = {
          videoUrl: data.videoUrl,
          title: data.title || '',
          description: data.description || ''
        };
        localStorage.setItem('videoUrlCache', JSON.stringify(videoUrlCache));
      }

      showToast('تم فتح الحصة بنجاح!', 'success');
      closePasswordModal();
      loadSectionsList();
    } else {
      alertEl.innerHTML = `<div class="alert alert-error"><i class="fas fa-times-circle"></i> ${data.message || '<span data-en="Wrong password" data-ar="كلمة المرور خاطئة">Wrong password</span>'}</div>`;
    }
  } catch (err) {
    alertEl.innerHTML = '<div class="alert alert-error"><i class="fas fa-exclamation-circle"></i> <span data-en="Connection error" data-ar="خطأ في الاتصال">Connection error</span></div>';
  }
}

// Allow Enter key to submit password
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && document.getElementById('passwordModal').classList.contains('active')) {
    submitSectionPassword();
  }
});

/* ----- Video Player (uses cache first, then API) ----- */
async function playSectionVideo(id, title) {
  const playerSection = document.getElementById('videoPlayerSection');
  const listSection = document.getElementById('sectionsList');
  const wrapper = document.getElementById('videoWrapper');
  const infoTitle = document.getElementById('videoTitle');
  const infoDesc = document.getElementById('videoDescription');

  listSection.style.display = 'none';
  playerSection.style.display = 'block';
  infoTitle.textContent = title || 'Section Video';
  infoDesc.textContent = '';

  // Check cache first — no API call needed if we already have the URL
  if (videoUrlCache[id] && videoUrlCache[id].videoUrl) {
    const cached = videoUrlCache[id];
    wrapper.innerHTML = `<iframe src="${cached.videoUrl}" frameborder="0" allowfullscreen allow="autoplay; encrypted-media" style="width:100%;aspect-ratio:16/9;border-radius:12px;"></iframe>`;
    if (cached.title) infoTitle.textContent = cached.title;
    if (cached.description) infoDesc.textContent = cached.description;
    return;
  }

  // Not cached — fetch from API
  wrapper.innerHTML = '<div class="skeleton" style="padding-top:56.25%;border-radius:12px;"></div>';

  try {
    const response = await fetch(`${SECTIONS_API}?action=getVideo&id=${encodeURIComponent(id)}`, { credentials: 'omit', redirect: 'follow' });
    const data = await response.json();

    if (data && (data.videoUrl || data.embedUrl)) {
      const url = data.videoUrl || data.embedUrl;
      // Cache for next time
      videoUrlCache[id] = { videoUrl: url, title: data.title || '', description: data.description || '' };
      localStorage.setItem('videoUrlCache', JSON.stringify(videoUrlCache));

      wrapper.innerHTML = `<iframe src="${url}" frameborder="0" allowfullscreen allow="autoplay; encrypted-media" style="width:100%;aspect-ratio:16/9;border-radius:12px;"></iframe>`;
      if (data.description) infoDesc.textContent = data.description;
    } else {
      wrapper.innerHTML = '<div class="empty-state"><i class="fas fa-video-slash"></i><p>Video not available</p></div>';
    }
  } catch (err) {
    wrapper.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Failed to load video</p></div>';
  }
}

function closeSectionVideo() {
  document.getElementById('videoPlayerSection').style.display = 'none';
  document.getElementById('sectionsList').style.display = 'block';
  document.getElementById('videoWrapper').innerHTML = '';
}
