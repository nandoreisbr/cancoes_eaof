const songsData = [
    { id: '1', title: '01. Bandeirantes do ar', videoId: 'Ph7sa65pLxg' },
    { id: '2', title: '02. Hino dos aviadores', videoId: 'Vmc0QHk6J1w' },
    { id: '3', title: '03. Canção da aviação de transporte de tropa', videoId: '3J1BWb56YXs' },
    { id: '4', title: '04. Hino da aviação embarcada', videoId: 'fIjiZ4SRWcU' },
    { id: '5', title: '05. Canção da aviação de caça', videoId: 'k2bP8UxGDvM' },
    { id: '6', title: '06. Canção do especialista', videoId: 'ULvyok063eI' },
    { id: '7', title: '07. Canção do CIAAR', videoId: 'NhuLs6n62ZY' },
    { id: '8', title: '08. Canção do expedicionário', videoId: '4ZKVujE5Ot0' },
    { id: '9', title: '09. Canção da infantaria da aeronáutica', videoId: 'r3lrc1ESfbk' }
];

// App State
let state = {
    progress: JSON.parse(localStorage.getItem('ciaar_progress')) || {},
    currentSort: 'default'
};

// Initialize missing progress data
songsData.forEach(song => {
    if (!state.progress[song.id]) {
        state.progress[song.id] = {
            watchCount: 0,
            timeWatched: 0, // in seconds
            level: 0 // 0 to 5
        };
    }
});

function saveState() {
    localStorage.setItem('ciaar_progress', JSON.stringify(state.progress));
    updateOverallStats();
}

// DOM Elements
const dashboardView = document.getElementById('dashboard');
const playerView = document.getElementById('player-view');
const songsList = document.getElementById('songs-list');
const totalHoursEl = document.getElementById('total-hours');
const totalViewsEl = document.getElementById('total-views');

let player;
let currentSongId = null;
let watchTimer = null;
let isPlaying = false;

// Format Time
function formatTime(seconds) {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    if (m < 60) return `${m}m ${s}s`;
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}h ${rm}m`;
}

function updateOverallStats() {
    let totalSecs = 0;
    let totalViews = 0;
    Object.values(state.progress).forEach(p => {
        totalSecs += p.timeWatched;
        totalViews += p.watchCount;
    });
    totalHoursEl.innerText = formatTime(totalSecs);
    totalViewsEl.innerText = totalViews;
}

// Render Dashboard
function renderDashboard() {
    songsList.innerHTML = '';
    
    let displaySongs = [...songsData];
    
    if (state.currentSort === 'level') {
        // Sort by level ascending (0 or 1 first)
        displaySongs.sort((a, b) => state.progress[a.id].level - state.progress[b.id].level);
    } else if (state.currentSort === 'views') {
        // Sort by views descending
        displaySongs.sort((a, b) => state.progress[b.id].watchCount - state.progress[a.id].watchCount);
    }
    
    displaySongs.forEach(song => {
        const prog = state.progress[song.id];
        
        const card = document.createElement('div');
        card.className = 'song-card';
        card.onclick = () => openPlayer(song);
        
        let starsHtml = '';
        if (prog.level > 0) {
            starsHtml = `<i class="fa-solid fa-star"></i> ${prog.level}`;
        } else {
            starsHtml = `<i class="fa-regular fa-star"></i> -`;
        }
        
        card.innerHTML = `
            <div class="level-indicator">${starsHtml}</div>
            <div class="song-title">${song.title}</div>
            <div class="song-meta">
                <span><i class="fa-solid fa-play"></i> ${prog.watchCount}x</span>
                <span><i class="fa-solid fa-clock"></i> ${formatTime(prog.timeWatched)}</span>
            </div>
        `;
        songsList.appendChild(card);
    });
}

// Filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        state.currentSort = e.target.getAttribute('data-sort');
        renderDashboard();
    });
});

// YouTube API Ready Callback
window.onYouTubeIframeAPIReady = function() {
    console.log("YouTube API Ready");
}

function openPlayer(song) {
    currentSongId = song.id;
    dashboardView.classList.remove('active');
    playerView.classList.add('active');
    
    document.getElementById('current-title').innerText = song.title;
    updatePlayerStats();
    setupStars(state.progress[song.id].level);
    
    if (player) {
        player.loadVideoById(song.videoId);
    } else {
        player = new YT.Player('yt-player', {
            height: '100%',
            width: '100%',
            videoId: song.videoId,
            events: {
                'onStateChange': onPlayerStateChange
            }
        });
    }
}

function updatePlayerStats() {
    if (!currentSongId) return;
    const prog = state.progress[currentSongId];
    document.getElementById('current-time').innerText = formatTime(prog.timeWatched);
    document.getElementById('current-views').innerText = prog.watchCount;
}

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.PLAYING) {
        isPlaying = true;
        startWatchTimer();
    } else {
        isPlaying = false;
        stopWatchTimer();
        
        if (event.data == YT.PlayerState.ENDED) {
            if (currentSongId) {
                state.progress[currentSongId].watchCount += 1;
                saveState();
                updatePlayerStats();
            }
        }
    }
}

function startWatchTimer() {
    if (watchTimer) clearInterval(watchTimer);
    watchTimer = setInterval(() => {
        if (isPlaying && currentSongId) {
            state.progress[currentSongId].timeWatched += 1;
            saveState();
            updatePlayerStats();
        }
    }, 1000);
}

function stopWatchTimer() {
    if (watchTimer) {
        clearInterval(watchTimer);
        watchTimer = null;
    }
}

// Back button
document.getElementById('back-btn').addEventListener('click', () => {
    if (player && typeof player.pauseVideo === 'function') {
        player.pauseVideo();
    }
    playerView.classList.remove('active');
    dashboardView.classList.add('active');
    renderDashboard();
});

// Stars logic
const stars = document.querySelectorAll('.stars i');
const ratingTexts = ["Ainda não avaliado", "Muito Difícil", "Difícil", "Mais ou Menos", "Quase Lá", "Decorei!"];

function setupStars(level) {
    stars.forEach((star, index) => {
        if (index < level) {
            star.classList.remove('fa-regular');
            star.classList.add('fa-solid', 'active');
        } else {
            star.classList.remove('fa-solid', 'active');
            star.classList.add('fa-solid'); // kept solid but not active for coloring
            star.style.color = "#444";
        }
    });
    
    // Highlight logic
    stars.forEach((star, index) => {
        if(index < level) {
            star.style.color = "var(--gold)";
        } else {
            star.style.color = "#444";
        }
    });
    
    document.getElementById('rating-text').innerText = ratingTexts[level] || ratingTexts[0];
}

stars.forEach(star => {
    star.addEventListener('click', (e) => {
        const val = parseInt(e.target.getAttribute('data-val'));
        if (currentSongId) {
            state.progress[currentSongId].level = val;
            saveState();
            setupStars(val);
            renderDashboard(); // Update dashboard in background
        }
    });
});

// Init
updateOverallStats();
renderDashboard();
