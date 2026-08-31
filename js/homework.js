/* =========================================================
   HOMEWORK PAGE
   Dynamic attendance-based homework system
   ========================================================= */


// =========================================================
// API URLS
// =========================================================

const REGISTRATION_API =
  'https://script.google.com/macros/s/AKfycbxvrMgbKDbMYFs69GNTyT76STLZrkJcijusVUKjNGHLLjUpQ9Bho9LNZZCXqNMtstb6cw/exec';


const VIDEO_LIST_API =
  'https://script.google.com/macros/s/AKfycbyb8j3-eF4MkxfcE6O7yADtfKhYJmLyMiVbvYh-Zl5LgB-5bWe7Ql1mmVGHqXVEO386JA/exec';


const VIDEO_LINKS_API =
  'https://script.google.com/macros/s/AKfycbwnuCnwXhf8qGzg0mGd4_HBHQfSlw3T-eZozS4_nAnreu0HlmUw37_XcOBM0kZ-20JG6g/exec';


// =========================================================
// GLOBAL DATA
// =========================================================

let studentAttendance = {};

let allVideos = [];

let videoLinksCache = {};


// =========================================================
// PAGE LOAD
// =========================================================

document.addEventListener(
  'DOMContentLoaded',
  () => {

    const user =
      getLoggedInUser();


    const codeCard =
      document.getElementById(
        'codeCheckCard'
      );


    const autoCard =
      document.getElementById(
        'autoLoadCard'
      );


    if (
      user &&
      user.studentCode
    ) {

      if (codeCard) {
        codeCard.style.display =
          'none';
      }


      if (autoCard) {
        autoCard.style.display =
          'block';
      }


      autoLoadHomework(
        user.studentCode,
        user.studentName || ''
      );


    } else {

      if (codeCard) {
        codeCard.style.display =
          'block';
      }


      if (autoCard) {
        autoCard.style.display =
          'none';
      }
    }

  }
);


// =========================================================
// AUTO LOAD HOMEWORK
// =========================================================

async function autoLoadHomework(
  code,
  displayName
) {

  const autoCard =
    document.getElementById(
      'autoLoadCard'
    );


  const spinner =
    document.getElementById(
      'autoLoadSpinner'
    );


  const titleEl =
    document.getElementById(
      'autoLoadTitle'
    );


  const msgEl =
    document.getElementById(
      'autoLoadMsg'
    );


  try {

    await loadHomeworkData(code);


    const attendedCount =
      Object.values(
        studentAttendance
      )
      .filter(Boolean)
      .length;


    if (
      attendedCount === 0
    ) {

      if (spinner) {

        spinner.className =
          'fas fa-inbox';

        spinner.style.color =
          'var(--text-muted)';
      }


      if (titleEl) {

        titleEl.textContent =
          displayName
            ? `مرحباً ${displayName}`
            : 'Welcome';

        titleEl.setAttribute(
          'data-en',
          displayName
            ? `Welcome, ${displayName}`
            : 'Welcome'
        );

        titleEl.setAttribute(
          'data-ar',
          displayName
            ? `مرحباً، ${displayName}`
            : 'مرحباً'
        );
      }


      if (msgEl) {

        msgEl.textContent =
          'لا توجد واجبات متاحة للمحاضرات التي حضرتها';

        msgEl.setAttribute(
          'data-en',
          'No homework available for your attended lectures.'
        );

        msgEl.setAttribute(
          'data-ar',
          'لا توجد واجبات متاحة للمحاضرات التي حضرتها.'
        );
      }


      updateLanguage();

      return;
    }


    if (autoCard) {
      autoCard.style.display =
        'none';
    }


    const homeworkList =
      document.getElementById(
        'homeworkList'
      );


    if (homeworkList) {

      homeworkList.style.display =
        'block';
    }


    renderHomeworkCards();


    showToast(
      `${attendedCount} homework available!`,
      'success'
    );


  } catch (err) {

    console.error(
      'Homework error:',
      err
    );


    if (spinner) {

      spinner.className =
        'fas fa-exclamation-triangle';

      spinner.style.color =
        'var(--error)';
    }


    if (titleEl) {

      titleEl.textContent =
        'Connection Error';

      titleEl.setAttribute(
        'data-en',
        'Connection Error'
      );

      titleEl.setAttribute(
        'data-ar',
        'خطأ في الاتصال'
      );
    }


    if (msgEl) {

      msgEl.textContent =
        'Failed to load homework. Please refresh the page.';
    }


    updateLanguage();
  }
}


// =========================================================
// LOAD ALL REQUIRED DATA
// =========================================================

async function loadHomeworkData(
  code
) {

  // -------------------------------------------------------
  // 1. Get attendance
  // -------------------------------------------------------

  await fetchAttendance(
    code
  );


  // -------------------------------------------------------
  // 2. Get main homework list
  // -------------------------------------------------------

  await fetchVideoList();


  // -------------------------------------------------------
  // 3. Keep only videos whose lecture was attended
  // -------------------------------------------------------

  allVideos =
    allVideos.filter(
      (video, index) => {

        return (
          studentAttendance[index + 1] === true
        );
      }
    );

}


// =========================================================
// MANUAL CHECK
// =========================================================

async function checkHomeworkAccess() {

  const input =
    document.getElementById(
      'hwStudentCode'
    );


  const alertEl =
    document.getElementById(
      'hwAlert'
    );


  const checkBtn =
    document.getElementById(
      'hwCheckBtn'
    );


  const code =
    input
      ? input.value.trim()
      : '';


  if (!code) {

    alertEl.innerHTML = `

      <div class="alert alert-error">

        <i class="fas fa-exclamation-circle"></i>

        <span>
          يرجى إدخال كود الطالب
        </span>

      </div>

    `;

    return;
  }


  checkBtn.disabled =
    true;


  checkBtn.innerHTML = `

    <i class="fas fa-spinner fa-spin"></i>

    جاري التحقق...

  `;


  alertEl.innerHTML = `

    <div
      class="alert"
      style="
        background:rgba(0,210,255,0.1);
        border-color:var(--primary);
        color:var(--text);
      "
    >

      <i class="fas fa-sync fa-spin"></i>

      جاري التحقق من حضورك...

    </div>

  `;


  try {

    await loadHomeworkData(
      code
    );


    const attendedCount =
      Object.values(
        studentAttendance
      )
      .filter(Boolean)
      .length;


    if (
      attendedCount === 0
    ) {

      alertEl.innerHTML = `

        <div class="alert alert-error">

          <i class="fas fa-times-circle"></i>

          <span>
            لا يوجد حضور مسجل لهذا الكود.
          </span>

        </div>

      `;

      return;
    }


    document
      .getElementById(
        'codeCheckCard'
      )
      .style.display =
      'none';


    document
      .getElementById(
        'homeworkList'
      )
      .style.display =
      'block';


    renderHomeworkCards();


    showToast(
      `${attendedCount} homework available!`,
      'success'
    );


  } catch (err) {

    console.error(err);


    alertEl.innerHTML = `

      <div class="alert alert-error">

        <i class="fas fa-exclamation-triangle"></i>

        <span>
          خطأ في الاتصال. حاول مرة أخرى.
        </span>

      </div>

    `;


  } finally {

    checkBtn.disabled =
      false;


    checkBtn.innerHTML = `

      <i class="fas fa-search"></i>

      عرض واجباتي

    `;
  }
}


// =========================================================
// FETCH ATTENDANCE
// =========================================================

async function fetchAttendance(
  code
) {

  studentAttendance = {};


  const url =
    `${REGISTRATION_API}` +
    `?action=getStudentData` +
    `&code=${encodeURIComponent(code)}`;


  const resp =
    await fetch(
      url,
      {
        credentials: 'omit',
        redirect: 'follow'
      }
    );


  if (!resp.ok) {

    throw new Error(
      'Attendance request failed'
    );
  }


  const data =
    await resp.json();


  if (
    data.status !== 'success'
  ) {

    throw new Error(
      data.message ||
      'Student not found'
    );
  }


  if (
    Array.isArray(
      data.attendance
    )
  ) {

    data.attendance.forEach(
      item => {

        const lectureNumber =
          Number(item.value);


        studentAttendance[
          lectureNumber
        ] =
          item.present === true;

      }
    );
  }


  return data;
}


// =========================================================
// FETCH MAIN VIDEOS
// =========================================================

async function fetchVideoList() {

  const resp =
    await fetch(
      VIDEO_LIST_API,
      {
        credentials: 'omit',
        redirect: 'follow'
      }
    );


  if (!resp.ok) {

    throw new Error(
      'Video list request failed'
    );
  }


  const data =
    await resp.json();


  if (
    !Array.isArray(data)
  ) {

    throw new Error(
      'Invalid video list'
    );
  }


  allVideos =
    data;


  return data;
}


// =========================================================
// RENDER HOMEWORK
// =========================================================

function renderHomeworkCards() {

  const grid =
    document.getElementById(
      'homeworkGrid'
    );


  if (!grid) {
    return;
  }


  if (
    !allVideos ||
    allVideos.length === 0
  ) {

    grid.innerHTML = `

      <div class="empty-state">

        <i class="fas fa-lock"></i>

        <p>
          لا توجد واجبات متاحة للمحاضرات التي حضرتها
        </p>

      </div>

    `;

    return;
  }


  grid.innerHTML = '';


  allVideos.forEach(
    (video, index) => {

      const lectureNum =
        Number(
          video.lecture ||
          index + 1
        );


      const pageName =
        video.videoCode ||
        `video${lectureNum}`;


      const card =
        document.createElement(
          'div'
        );


      card.className =
        'content-card';


      card.style.animationDelay =
        `${index * 0.1}s`;


      const thumbStyle =
        video.imgSrc
          ? `
            background-image:url('${escapeAttr(video.imgSrc)}');
            background-size:cover;
            background-position:center;
            height:160px;
            border-radius:8px;
            margin-bottom:12px;
          `
          : '';


      card.innerHTML = `

        ${
          video.imgSrc

            ? `
              <div
                style="${thumbStyle}"
              ></div>
            `

            : `
              <div class="card-icon">
                <i class="fas fa-play-circle"></i>
              </div>
            `
        }


        <h3 class="card-title">
          ${escapeHtml(
            video.title ||
            `واجب المحاضرة ${lectureNum}`
          )}
        </h3>


        <p
          class="card-desc"
          style="margin-bottom:5px;"
        >

          <span>
            المحاضرة ${lectureNum}
          </span>

          —

          <i
            class="fas fa-check-circle"
            style="color:var(--success);"
          ></i>

          <span>
            حاضر
          </span>

        </p>


        <div
          class="video-source-btns"
          id="videoBtns_${pageName}"
          style="
            display:flex;
            gap:8px;
            flex-wrap:wrap;
            margin-top:10px;
          "
        >

          <button
            class="btn btn-primary btn-sm"
            onclick="loadAndPlay('${escapeAttr(pageName)}')"
          >

            <i class="fas fa-play"></i>

            مشاهدة

          </button>

        </div>

      `;


      grid.appendChild(
        card
      );

    }
  );


  updateLanguage();
}


// =========================================================
// LOAD VIDEO LINKS
// =========================================================

async function loadAndPlay(
  pageName
) {

  const btnsContainer =
    document.getElementById(
      'videoBtns_' +
      pageName
    );


  if (!btnsContainer) {
    return;
  }


  // -------------------------------------------------------
  // Cache
  // -------------------------------------------------------

  if (
    videoLinksCache[
      pageName
    ]
  ) {

    showSourceButtons(
      pageName,
      videoLinksCache[
        pageName
      ],
      btnsContainer
    );

    return;
  }


  btnsContainer.innerHTML = `

    <button
      class="btn btn-primary btn-sm"
      disabled
    >

      <i class="fas fa-spinner fa-spin"></i>

      Loading...

    </button>

  `;


  try {

    const url =
      `${VIDEO_LINKS_API}` +
      `?pageName=${encodeURIComponent(pageName)}`;


    const resp =
      await fetch(
        url,
        {
          credentials: 'omit',
          redirect: 'follow'
        }
      );


    if (!resp.ok) {

      throw new Error(
        'Video links request failed'
      );
    }


    const result =
      await resp.json();


    if (
      result.status !== 'success'
    ) {

      throw new Error(
        result.message ||
        'Video not found'
      );
    }


    videoLinksCache[
      pageName
    ] = result;


    showSourceButtons(
      pageName,
      result,
      btnsContainer
    );


  } catch (err) {

    console.error(err);


    btnsContainer.innerHTML = `

      <span
        style="color:var(--error);"
      >

        <i class="fas fa-exclamation-triangle"></i>

        Failed to load links

      </span>

    `;
  }
}


// =========================================================
// SHOW VIDEO SOURCE BUTTONS
// =========================================================

function showSourceButtons(
  pageName,
  links,
  container
) {

  let html = '';


  if (
    links.mega
  ) {

    html += `

      <button
        class="btn btn-primary btn-sm"
        onclick="playVideo(
          '${escapeAttr(links.mega)}',
          '${escapeAttr(pageName)}',
          'mega'
        )"
      >

        <i class="fas fa-play"></i>

        Mega

      </button>

    `;
  }


  if (
    links.drive
  ) {

    html += `

      <button
        class="btn btn-outline btn-sm"
        onclick="playVideo(
          '${escapeAttr(links.drive)}',
          '${escapeAttr(pageName)}',
          'drive'
        )"
      >

        <i class="fab fa-google-drive"></i>

        Drive

      </button>

    `;
  }


  if (
    links.pcloud
  ) {

    html += `

      <button
        class="btn btn-outline btn-sm"
        onclick="playVideo(
          '${escapeAttr(links.pcloud)}',
          '${escapeAttr(pageName)}',
          'pcloud'
        )"
      >

        <i class="fas fa-cloud"></i>

        pCloud

      </button>

    `;
  }


  if (!html) {

    html = `

      <span
        style="color:var(--text-muted);"
      >

        No links available

      </span>

    `;
  }


  container.innerHTML =
    html;
}


// =========================================================
// PLAY VIDEO
// =========================================================

function playVideo(
  url,
  title,
  source
) {

  const playerSection =
    document.getElementById(
      'videoPlayerSection'
    );


  const listSection =
    document.getElementById(
      'homeworkList'
    );


  const wrapper =
    document.getElementById(
      'videoWrapper'
    );


  const infoTitle =
    document.getElementById(
      'videoTitle'
    );


  if (
    !playerSection ||
    !listSection ||
    !wrapper
  ) {
    return;
  }


  listSection.style.display =
    'none';


  playerSection.style.display =
    'block';


  if (infoTitle) {

    infoTitle.textContent =
      title ||
      'Homework Video';
  }


  if (source === 'drive') {

    const embedUrl =
      convertDriveToEmbed(
        url
      );


    wrapper.innerHTML = `

      <iframe

        src="${escapeAttr(embedUrl)}"

        frameborder="0"

        allowfullscreen

        allow="
          autoplay;
          encrypted-media
        "

        style="
          width:100%;
          aspect-ratio:16/9;
          border-radius:12px;
        "

      ></iframe>

    `;


  } else {

    wrapper.innerHTML = `

      <iframe

        src="${escapeAttr(url)}"

        frameborder="0"

        allowfullscreen

        allow="
          autoplay;
          encrypted-media
        "

        style="
          width:100%;
          aspect-ratio:16/9;
          border-radius:12px;
        "

      ></iframe>

    `;
  }
}


// =========================================================
// GOOGLE DRIVE
// =========================================================

function convertDriveToEmbed(
  url
) {

  const patterns = [

    /\/file\/d\/([a-zA-Z0-9_-]+)/,

    /id=([a-zA-Z0-9_-]+)/,

    /\/d\/([a-zA-Z0-9_-]+)/

  ];


  for (
    const pattern of patterns
  ) {

    const match =
      url.match(pattern);


    if (match) {

      return (
        `https://drive.google.com/file/d/` +
        `${match[1]}/preview`
      );
    }
  }


  return url;
}


// =========================================================
// CLOSE PLAYER
// =========================================================

function closeVideoPlayer() {

  const player =
    document.getElementById(
      'videoPlayerSection'
    );


  const list =
    document.getElementById(
      'homeworkList'
    );


  const wrapper =
    document.getElementById(
      'videoWrapper'
    );


  if (player) {

    player.style.display =
      'none';
  }


  if (list) {

    list.style.display =
      'block';
  }


  if (wrapper) {

    wrapper.innerHTML =
      '';
  }
}


// =========================================================
// SECURITY / HTML ESCAPING
// =========================================================

function escapeHtml(
  value
) {

  return String(value)
    .replace(
      /&/g,
      '&amp;'
    )
    .replace(
      /</g,
      '&lt;'
    )
    .replace(
      />/g,
      '&gt;'
    )
    .replace(
      /"/g,
      '&quot;'
    )
    .replace(
      /'/g,
      '&#039;'
    );
}


function escapeAttr(
  value
) {

  return String(value)
    .replace(
      /\\/g,
      '\\\\'
    )
    .replace(
      /'/g,
      "\\'"
    )
    .replace(
      /"/g,
      '&quot;'
    );
}
