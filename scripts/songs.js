// =============================================
// songs.js — Left Slide Music Player (Song Box)
// To add a song, drop an mp3 + cover in /songs and
// add an entry to the SONGS array below.
// =============================================

const SONGS = [
    { src: "/songs/under-pressure.mp3", cover: "/songs/under-pressure.jpg", title: "Under Pressure", artist: "Queen & David Bowie" },
];

// ── Inject HTML + Styles ─────────────────────────

(function () {
    const html = `
    <div id="song-box-wrapper">

        <div id="song-box-tab">
            <span id="song-box-tab-text">Song Box</span>
        </div>

        <div id="song-box-panel">
            <div id="sb-disc-container">
                    <div id="sb-disc-outer">
                    <div id="sb-disc-rings"></div>
                    <img id="sb-cover" alt="Album cover">
                    <div id="sb-disc-center"></div>
                </div>
            </div>

            <div id="sb-info">
                <p id="sb-title">Coming Soon</p>
                <p id="sb-artist">No songs yet</p>
            </div>

            <div id="sb-progress-wrap">
                <span id="sb-time-cur">0:00</span>
                <input type="range" id="sb-progress" value="0" min="0" max="100" step="0.1" disabled>
                <span id="sb-time-dur">0:00</span>
            </div>

            <div id="sb-controls">
                <button id="sb-prev" title="Previous" disabled>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/>
                    </svg>
                </button>
                <button id="sb-play" title="Play/Pause" disabled>
                    <svg id="sb-play-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                </button>
                <button id="sb-next" title="Next" disabled>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z"/>
                    </svg>
                </button>
            </div>

            <audio id="sb-audio"></audio>
        </div>
    </div>

    <style>
        #song-box-wrapper {
            position: fixed;
            left: -260px;
            bottom: 100px;
            display: flex;
            flex-direction: row;
            align-items: flex-end;
            z-index: 99999;
            pointer-events: auto;
            font-family: 'Fira Mono', monospace;
            transition: left 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        #song-box-wrapper.open {
            left: 0;
        }

        #song-box-panel {
            width: 260px;
            height: 260px;
            background: #0d0d0d;
            border: 1.5px solid var(--nav-color);
            border-radius: 0 14px 0 0;
            padding: 18px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            box-sizing: border-box;
            order: 1;
        }

        #song-box-tab {
            background: var(--nav-color);
            color: white;
            width: 24px;
            height: 80px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            border-radius: 0 8px 8px 0;
            transition: background 0.3s ease;
            overflow: hidden;
            flex-shrink: 0;
            writing-mode: vertical-rl;
            order: 2;
        }

        #song-box-tab:hover {
            background: rgba(var(--nav-color-rgb), 0.75);
        }

        #song-box-tab-text {
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 2px;
            text-transform: uppercase;
            white-space: nowrap;
            color: white;
            transform: rotate(180deg);
        }

        #sb-disc-container {
            width: 90px;
            height: 90px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        #sb-disc-outer {
            width: 90px;
            height: 90px;
            border-radius: 50%;
            background: radial-gradient(circle, #2a2a2a 28%, #1a1a1a 32%, #111 60%, #0a0a0a 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            box-shadow:
                0 0 0 2px var(--nav-color),
                0 0 0 5px #111,
                0 0 0 7px #333,
                0 0 20px rgba(var(--nav-color-rgb), 0.3);
            animation: disc-spin 4s linear infinite;
            animation-play-state: paused;
        }

        #sb-disc-rings {
            position: absolute;
            inset: 0;
            border-radius: 50%;
            background:
                repeating-radial-gradient(
                    circle at center,
                    transparent 28%,
                    rgba(255,255,255,0.03) 30%,
                    transparent 32%,
                    transparent 36%,
                    rgba(255,255,255,0.03) 38%,
                    transparent 40%,
                    transparent 44%,
                    rgba(255,255,255,0.03) 46%,
                    transparent 48%
                );
        }

        #sb-cover {
            width: 42px;
            height: 42px;
            border-radius: 50%;
            object-fit: cover;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            z-index: 2;
            animation: disc-spin 4s linear infinite;
            animation-play-state: paused;
        }

        #sb-disc-center {
            position: absolute;
            width: 9px;
            height: 9px;
            border-radius: 50%;
            background: var(--nav-color);
            z-index: 3;
            box-shadow: 0 0 6px rgba(var(--nav-color-rgb), 0.8);
        }

        @keyframes disc-spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
        }

        #song-box-wrapper.playing #sb-disc-outer,
        #song-box-wrapper.playing #sb-cover {
            animation-play-state: running;
        }

        #sb-info {
            text-align: center;
            width: 100%;
            flex-shrink: 0;
        }

        #sb-title {
            color: white;
            font-size: 12px;
            font-weight: 600;
            margin: 0 0 2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        #sb-artist {
            color: var(--nav-color);
            font-size: 10px;
            margin: 0;
            opacity: 0.9;
        }

        #sb-progress-wrap {
            display: flex;
            align-items: center;
            gap: 6px;
            width: 100%;
            flex-shrink: 0;
        }

        #sb-time-cur, #sb-time-dur {
            color: #888;
            font-size: 9px;
            min-width: 24px;
            font-variant-numeric: tabular-nums;
        }

        #sb-time-dur {
            text-align: right;
        }

        #sb-progress {
            flex: 1;
            -webkit-appearance: none;
            appearance: none;
            height: 3px;
            border-radius: 2px;
            background: #2a2a2a;
            outline: none;
            cursor: pointer;
        }

        #sb-progress:disabled {
            cursor: not-allowed;
            opacity: 0.6;
        }

        #sb-progress::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 11px;
            height: 11px;
            border-radius: 50%;
            background: var(--nav-color);
            cursor: pointer;
            transition: transform 0.15s ease;
        }

        #sb-progress::-webkit-slider-thumb:hover {
            transform: scale(1.3);
        }

        #sb-progress::-moz-range-thumb {
            width: 11px;
            height: 11px;
            border-radius: 50%;
            background: var(--nav-color);
            cursor: pointer;
            border: none;
        }

        #sb-controls {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            flex-shrink: 0;
        }

        #sb-controls button {
            background: none;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            transition: transform 0.15s ease, opacity 0.15s ease;
            color: var(--nav-color);
        }

        #sb-controls button:disabled {
            opacity: 0.35;
            cursor: not-allowed;
        }

        #sb-controls button:not(:disabled):hover {
            opacity: 0.75;
            transform: scale(1.1);
        }

        #sb-controls button:not(:disabled):active {
            transform: scale(0.95);
        }

        #sb-prev svg, #sb-next svg {
            width: 20px;
            height: 20px;
        }

        #sb-play {
            width: 40px;
            height: 40px;
            border-radius: 50% !important;
            background: var(--nav-color) !important;
            color: white !important;
            box-shadow: 0 0 14px rgba(var(--nav-color-rgb), 0.45);
            transition: opacity 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease !important;
        }

        #sb-play:not(:disabled):hover {
            opacity: 0.85 !important;
            box-shadow: 0 0 20px rgba(var(--nav-color-rgb), 0.65) !important;
            transform: scale(1.08) !important;
        }

        #sb-play svg {
            width: 18px;
            height: 18px;
        }
    </style>
    `;

    const div = document.createElement("div");
    div.innerHTML = html;
    document.body.appendChild(div);
})();

// ── Logic (only runs when songs exist) ─────────

document.addEventListener("DOMContentLoaded", () => {
    if (SONGS.length === 0) return;

    const wrapper  = document.getElementById("song-box-wrapper");
    const tab      = document.getElementById("song-box-tab");
    const audio    = document.getElementById("sb-audio");
    const playBtn  = document.getElementById("sb-play");
    const playIcon = document.getElementById("sb-play-icon");
    const nextBtn  = document.getElementById("sb-next");
    const prevBtn  = document.getElementById("sb-prev");
    const cover    = document.getElementById("sb-cover");
    const titleEl  = document.getElementById("sb-title");
    const artistEl = document.getElementById("sb-artist");
    const progress = document.getElementById("sb-progress");
    const timeCur  = document.getElementById("sb-time-cur");
    const timeDur  = document.getElementById("sb-time-dur");

    playBtn.disabled = false;
    nextBtn.disabled = false;
    prevBtn.disabled = false;
    progress.disabled = false;

    let currentIndex = parseInt(sessionStorage.getItem('sb_index') || '0');
    let wasPlaying   = sessionStorage.getItem('sb_playing') === 'true';
    let savedTime    = parseFloat(sessionStorage.getItem('sb_time') || '0');

    function getNavColor() {
        return getComputedStyle(document.body).getPropertyValue('--nav-color').trim();
    }

    function fmt(s) {
        if (isNaN(s) || !isFinite(s)) return '0:00';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60).toString().padStart(2, '0');
        return `${m}:${sec}`;
    }

    function updateProgressFill(pct) {
        const color = getNavColor();
        progress.style.background = `linear-gradient(to right, ${color} ${pct}%, #2a2a2a ${pct}%)`;
    }

    function loadSong(i, autoplay) {
        const s = SONGS[i];
        audio.src   = s.src;
        cover.src   = s.cover;
        titleEl.textContent  = s.title;
        artistEl.textContent = s.artist;
        timeCur.textContent  = '0:00';
        timeDur.textContent  = '0:00';
        progress.value = 0;
        updateProgressFill(0);

        audio.addEventListener('canplay', () => {
            timeDur.textContent = fmt(audio.duration);
            if (savedTime > 0) {
                audio.currentTime = savedTime;
                savedTime = 0;
            }
            if (autoplay) play();
        }, { once: true });
    }

    function setPlayIcon(playing) {
        if (playing) {
            playIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
        } else {
            playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
        }
    }

    function play() {
        audio.play();
        setPlayIcon(true);
        wrapper.classList.add('playing');
        sessionStorage.setItem('sb_playing', 'true');
    }

    function pause() {
        audio.pause();
        setPlayIcon(false);
        wrapper.classList.remove('playing');
        sessionStorage.setItem('sb_playing', 'false');
    }

    audio.addEventListener('timeupdate', () => {
        sessionStorage.setItem('sb_time', audio.currentTime);
        sessionStorage.setItem('sb_index', currentIndex);
        timeCur.textContent = fmt(audio.currentTime);
        if (audio.duration) {
            const pct = (audio.currentTime / audio.duration) * 100;
            progress.value = pct;
            updateProgressFill(pct);
        }
    });

    audio.addEventListener('loadedmetadata', () => {
        timeDur.textContent = fmt(audio.duration);
    });

    audio.addEventListener('ended', () => {
        currentIndex = (currentIndex + 1) % SONGS.length;
        savedTime = 0;
        loadSong(currentIndex, true);
    });

    playBtn.addEventListener('click', () => audio.paused ? play() : pause());

    nextBtn.addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % SONGS.length;
        savedTime = 0;
        loadSong(currentIndex, true);
    });

    prevBtn.addEventListener('click', () => {
        if (audio.currentTime > 3) {
            audio.currentTime = 0;
        } else {
            currentIndex = (currentIndex - 1 + SONGS.length) % SONGS.length;
            savedTime = 0;
            loadSong(currentIndex, true);
        }
    });

    progress.addEventListener('input', () => {
        if (audio.duration) {
            audio.currentTime = (progress.value / 100) * audio.duration;
            updateProgressFill(parseFloat(progress.value));
        }
    });

    // Drag / swipe to open & close
    let dragStartX = null;
    let dragStartLeft = null;
    let isDragging = false;
    const PANEL_WIDTH = 260;

    function getCurrentLeft() {
        return wrapper.classList.contains('open') ? 0 : -PANEL_WIDTH;
    }

    function startDrag(clientX) {
        dragStartX = clientX;
        dragStartLeft = getCurrentLeft();
        isDragging = false;
        wrapper.style.transition = 'none';
    }

    function moveDrag(clientX) {
        if (dragStartX === null) return;
        const dx = clientX - dragStartX;
        if (Math.abs(dx) > 4) isDragging = true;
        if (!isDragging) return;
        const newLeft = Math.min(0, Math.max(-PANEL_WIDTH, dragStartLeft + dx));
        wrapper.style.left = newLeft + 'px';
    }

    function endDrag(clientX) {
        if (dragStartX === null) return;
        wrapper.style.transition = '';
        const dx = clientX - dragStartX;
        if (!isDragging) {
            wrapper.classList.toggle('open');
            wrapper.style.left = '';
            dragStartX = null;
            return;
        }
        const currentLeft = parseFloat(wrapper.style.left) || getCurrentLeft();
        const shouldOpen = dx > 40 || currentLeft > -PANEL_WIDTH / 2;
        wrapper.classList.toggle('open', shouldOpen);
        wrapper.style.left = '';
        dragStartX = null;
        isDragging = false;
    }

    tab.addEventListener('mousedown', e => { e.preventDefault(); startDrag(e.clientX); });
    window.addEventListener('mousemove', e => { moveDrag(e.clientX); });
    window.addEventListener('mouseup', e => { endDrag(e.clientX); });

    tab.addEventListener('touchstart', e => { startDrag(e.touches[0].clientX); }, { passive: true });
    window.addEventListener('touchmove', e => { moveDrag(e.touches[0].clientX); }, { passive: true });
    window.addEventListener('touchend', e => { endDrag(e.changedTouches[0].clientX); });

    window.addEventListener('beforeunload', () => {
        sessionStorage.setItem('sb_time', audio.currentTime);
    });

    loadSong(currentIndex, wasPlaying);
    if (wasPlaying) {
        wrapper.classList.add('playing');
        setPlayIcon(true);
    }
});
