/* ===== Homework Page JS ===== */
const REGISTRATION_API = '';
const VIDEO_LIST_API = '';
const VIDEO_LINKS_API = '';

let studentAttendance = {};
let allVideos = [];
let videoLinksCache = {};  // cache: { "video1": { drive, pcloud, mega } }

/* ===== On page load: auto-check for logged-in user ===== */
document.addEventListener('DOMContentLoaded', () => {
  const user = getLoggedInUser();
  const codeCard = document.getElementById('codeCheckCard');
  const autoCard = document.getElementById('autoLoadCard');

  if (user && user.studentCode) {
    // Logged in: hide code card, show auto-loading card, start automatically
    codeCard.style.display = 'none';
    autoCard.style.display = 'block';
    autoLoadHomework(user.studentCode, user.studentName || '');
  } else {
    // Not logged in: show manual code card, hide auto card
    codeCard.style.display = 'block';
    autoCard.style.display = 'none';
  }
});

/* ===== Auto-load homework for logged-in users ===== */
async function autoLoadHomework(code, displayName) {
  const autoCard = document.getElementById('autoLoadCard');
  const spinner = document.getElementById('autoLoadSpinner');
  const titleEl = document.getElementById('autoLoadTitle');
  const msgEl = document.getElementById('autoLoadMsg');

  try {
    // Fetch attendance + video list in parallel
    const [attendanceResult, videoListResult] = await Promise.all([
      fetchAttendance(code),
      fetchVideoList()
    ]);

    // Check attendance count
    const attendedCount = Object.values(studentAttendance).filter(Boolean).length;

    if (attendedCount === 0) {
      spinner.className = 'fas fa-inbox';
      spinner.style.color = 'var(--text-muted)';
      titleEl.textContent = displayName ? `مرحباً ${displayName}` : 'Welcome';
      titleEl.setAttribute('data-en', displayName ? `Welcome, ${displayName}` : 'Welcome');
      titleEl.setAttribute('data-ar', displayName ? `مرحباً، ${displayName}` : 'مرحباً');
      msgEl.textContent = 'No attendance records found. Attend a lecture to unlock homework.';
      msgEl.setAttribute('data-en', 'No attendance records found. Attend a lecture to unlock homework.');
      msgEl.setAttribute('data-ar', 'لا يوجد سجل حضور. احضر محاضرة لفتح الواجبات.');
      updateLanguage();
      return;
    }

    // We have attendance & videos — show homework list
    autoCard.style.display = 'none';
    document.getElementById('homeworkList').style.display = 'block';
    renderHomeworkCards();
    showToast(`${attendedCount} homework available!`, 'success');

  } catch (err) {
    spinner.className = 'fas fa-exclamation-triangle';
    spinner.style.color = 'var(--error)';
    titleEl.textContent = 'Connection Error';
    titleEl.setAttribute('data-en', 'Connection Error');
    titleEl.setAttribute('data-ar', 'خطأ في الاتصال');
    msgEl.textContent = 'Failed to load homework. Please refresh the page.';
    msgEl.setAttribute('data-en', 'Failed to load homework. Please refresh the page.');
    msgEl.setAttribute('data-ar', 'فشل تحميل الواجبات. يرجى تحديث الصفحة.');
    updateLanguage();
  }
}

/* ===== Manual check for non-logged-in users ===== */
async function checkHomeworkAccess() {
  const code = document.getElementById('hwStudentCode').value.trim();
  const alertEl = document.getElementById('hwAlert');
  const checkBtn = document.getElementById('hwCheckBtn');

  if (!code) {
    alertEl.innerHTML = '<div class="alert alert-error"><i class="fas fa-exclamation-circle"></i> <span data-en="Please enter your student code" data-ar="يرجى إدخال كود الطالب">Please enter your student code</span></div>';
    return;
  }

  checkBtn.disabled = true;
  checkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span data-en="Checking..." data-ar="جاري التحقق...">Checking...</span>';
  alertEl.innerHTML = '<div class="alert" style="background:rgba(0,210,255,0.1);border-color:var(--primary);color:var(--text);"><i class="fas fa-sync fa-spin"></i> <span data-en="Checking your attendance..." data-ar="جاري التحقق من حضورك...">Checking your attendance...</span></div>';

  try {
    await Promise.all([fetchAttendance(code), fetchVideoList()]);

    const attendedCount = Object.values(studentAttendance).filter(Boolean).length;
    if (attendedCount === 0) {
      alertEl.innerHTML = '<div class="alert alert-error"><i class="fas fa-times-circle"></i> <span data-en="No attendance found for this code." data-ar="لا يوجد حضور مسجل لهذا الكود.">No attendance found for this code.</span></div>';
      return;
    }

    showToast(`${attendedCount} homework available!`, 'success');
    document.getElementById('codeCheckCard').style.display = 'none';
    document.getElementById('homeworkList').style.display = 'block';
    renderHomeworkCards();

  } catch (err) {
    alertEl.innerHTML = '<div class="alert alert-error"><i class="fas fa-exclamation-circle"></i> <span data-en="Connection error. Please try again." data-ar="خطأ في الاتصال. حاول مرة أخرى.">Connection error. Please try again.</span></div>';
  } finally {
    checkBtn.disabled = false;
    checkBtn.innerHTML = '<i class="fas fa-search"></i> <span data-en="Show My Homework" data-ar="عرض واجباتي">Show My Homework</span>';
  }
}

/* ===== Fetch attendance from registration sheet (single request) ===== */
async function fetchAttendance(code) {
  studentAttendance = {};

  const resp = await fetch(
    `${REGISTRATION_API}?action=getStudentData&code=${encodeURIComponent(code)}`,
    { credentials: 'omit', redirect: 'follow' }
  );
  const data = await resp.json();

  if (data.status === 'success' && data.attendance) {
    // data.attendance = [{name, present, value}, ...]
    data.attendance.forEach((item, i) => {
      studentAttendance[i] = item.present === true;
    });
  }
  return data;
}

/* ===== Fetch video list ===== */
async function fetchVideoList() {
  const resp = await fetch(VIDEO_LIST_API, { credentials: 'omit', redirect: 'follow' });
  allVideos = await resp.json();
}

/* ===== Render homework video cards filtered by attendance ===== */
function renderHomeworkCards() {
  const grid = document.getElementById('homeworkGrid');

  if (!allVideos || !Array.isArray(allVideos) || allVideos.length === 0) {
    grid.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p data-en="No homework videos available yet" data-ar="لا توجد فيديوهات واجب متاحة بعد">No homework videos available yet</p></div>';
    return;
  }

  // Filter videos by index: item 0 → attendance index 0 (الحضور الاول), item 1 → index 1, etc.
  // Titles are Arabic like "واجب المحاضرة الاولي", so we use array position, not title parsing.
  const availableVideos = [];
  allVideos.forEach((v, i) => {
    if (studentAttendance[i] !== true) return;

    // Skip empty/placeholder rows or items without meaningful data
    const hasContent = v && (
      (v.title && String(v.title).trim()) ||
      (v.imgSrc && String(v.imgSrc).trim()) ||
      (v.links && Array.isArray(v.links) && v.links.length > 0)
    );
    if (!hasContent) return;

    availableVideos.push({ ...v, _index: i }); // store original index
  });

  if (availableVideos.length === 0) {
    grid.innerHTML = '<div class="empty-state"><i class="fas fa-lock"></i><p data-en="No homework available for your attended lectures" data-ar="لا توجد واجبات متاحة للمحاضرات التي حضرتها">No homework available for your attended lectures</p></div>';
    return;
  }

  grid.innerHTML = '';
  availableVideos.forEach((video, idx) => {
    const lectureNum = video._index + 1; // 1-based lecture number
    const pageName = 'video' + lectureNum;  // "video1", "video2", etc.
    const card = document.createElement('div');
    card.className = 'content-card';
    card.style.animationDelay = `${idx * 0.1}s`;

    // Use thumbnail from list API if available
    const thumbStyle = video.imgSrc
      ? `background-image:url('${video.imgSrc}');background-size:cover;background-position:center;height:160px;border-radius:8px;margin-bottom:12px;`
      : '';

    card.innerHTML = `
      ${video.imgSrc ? `<div style="${thumbStyle}"></div>` : '<div class="card-icon"><i class="fas fa-play-circle"></i></div>'}
      <h3 class="card-title">${video.title || 'Homework ' + lectureNum}</h3>
      <p class="card-desc" style="margin-bottom:5px;">
        <span data-en="Lecture" data-ar="المحاضرة">Lecture</span> ${lectureNum}
        — <i class="fas fa-check-circle" style="color:var(--success);"></i>
        <span data-en="Attended" data-ar="حاضر">Attended</span>
      </p>
      <div class="video-source-btns" id="videoBtns_${pageName}" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
        <button class="btn btn-primary btn-sm" onclick="loadAndPlay('${pageName}')">
          <i class="fas fa-play"></i>
          <span data-en="Watch" data-ar="مشاهدة">Watch</span>
        </button>
      </div>
    `;
    grid.appendChild(card);
  });
  updateLanguage();
}

/* ===== Load video links then show source picker ===== */
async function loadAndPlay(pageName) {
  const btnsContainer = document.getElementById('videoBtns_' + pageName);
  if (!btnsContainer) return;

  // Check cache
  if (videoLinksCache[pageName]) {
    showSourceButtons(pageName, videoLinksCache[pageName], btnsContainer);
    return;
  }

  // Show loading
  btnsContainer.innerHTML = '<button class="btn btn-primary btn-sm" disabled><i class="fas fa-spinner fa-spin"></i> Loading...</button>';

  try {
    const resp = await fetch(`${VIDEO_LINKS_API}?pageName=${encodeURIComponent(pageName)}`, {
      credentials: 'omit', redirect: 'follow'
    });
    const links = await resp.json();
    videoLinksCache[pageName] = links;
    showSourceButtons(pageName, links, btnsContainer);
  } catch (err) {
    btnsContainer.innerHTML = '<span style="color:var(--error);"><i class="fas fa-exclamation-triangle"></i> Failed to load links</span>';
  }
}

/* ===== Show source buttons (Mega / Drive / pCloud) ===== */
function showSourceButtons(title, links, container) {
  let html = '';
  if (links.mega) {
    html += `<button class="btn btn-primary btn-sm" onclick="playVideo('${escapeAttr(links.mega)}', '${escapeAttr(title)}', 'mega')"><i class="fas fa-play"></i> Mega</button> `;
  }
  if (links.drive) {
    html += `<button class="btn btn-outline btn-sm" onclick="playVideo('${escapeAttr(links.drive)}', '${escapeAttr(title)}', 'drive')"><i class="fab fa-google-drive"></i> Drive</button> `;
  }
  if (links.pcloud) {
    html += `<button class="btn btn-outline btn-sm" onclick="playVideo('${escapeAttr(links.pcloud)}', '${escapeAttr(title)}', 'pcloud')"><i class="fas fa-cloud"></i> pCloud</button> `;
  }
  if (!html) {
    html = '<span style="color:var(--text-muted);">No links available</span>';
  }
  container.innerHTML = html;
}

/* ===== Extract number from title like "video1", "video12" ===== */
function extractVideoNumber(name) {
  const match = String(name).match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/* ===== Escape attribute for onclick ===== */
function escapeAttr(str) {
  return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

/* ===== Play Video ===== */
function playVideo(url, title, source) {
  const playerSection = document.getElementById('videoPlayerSection');
  const listSection = document.getElementById('homeworkList');
  const wrapper = document.getElementById('videoWrapper');
  const infoTitle = document.getElementById('videoTitle');

  listSection.style.display = 'none';
  playerSection.style.display = 'block';
  infoTitle.textContent = title || 'Homework Video';

  if (source === 'mega') {
    wrapper.innerHTML = `<iframe src="${url}" frameborder="0" allowfullscreen allow="autoplay; encrypted-media" style="width:100%;aspect-ratio:16/9;border-radius:12px;"></iframe>`;
  } else if (source === 'drive') {
    const embedUrl = convertDriveToEmbed(url);
    wrapper.innerHTML = `<iframe src="${embedUrl}" frameborder="0" allowfullscreen allow="autoplay; encrypted-media" style="width:100%;aspect-ratio:16/9;border-radius:12px;"></iframe>`;
  } else if (source === 'pcloud') {
    wrapper.innerHTML = `<iframe src="${url}" frameborder="0" allowfullscreen allow="autoplay; encrypted-media" style="width:100%;aspect-ratio:16/9;border-radius:12px;"></iframe>`;
  } else {
    wrapper.innerHTML = `<iframe src="${url}" frameborder="0" allowfullscreen style="width:100%;aspect-ratio:16/9;border-radius:12px;"></iframe>`;
  }
}

/* ===== Convert Google Drive share link to embed ===== */
function convertDriveToEmbed(url) {
  const patterns = [/\/file\/d\/([a-zA-Z0-9_-]+)/, /id=([a-zA-Z0-9_-]+)/, /\/d\/([a-zA-Z0-9_-]+)/];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
  }
  return url;
}

/* ===== Close Video Player ===== */
function closeVideoPlayer() {
  document.getElementById('videoPlayerSection').style.display = 'none';
  document.getElementById('homeworkList').style.display = 'block';
  document.getElementById('videoWrapper').innerHTML = '';
}

