// Function to convert MM:SS duration string to total seconds
const durationToSeconds = (duration) => {
    if (!duration || typeof duration !== 'string') return 0;
    const parts = duration.split(':');
    if (parts.length === 2) {
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 0; 
};

let songs = [
    // ADDED cover property
    { name: "We are Acropolians...", artist: "Lakshy Jain", path: "songs/Acropolians.mp3", duration: "03:15", mood: "Happy", duration_sec: durationToSeconds("03:15"), cover: "public/acropolis.jpg" },
    { name: "Kesariya - Brahmastra", artist: "Arijit Singh", path: "songs/kesariya.mp3", duration: "04:28", mood: "Chill", duration_sec: durationToSeconds("04:28"), cover: "public/kesariya.jpg" },
    { name: "Believer", artist: "Imagine Dragons", path: "songs/beliver.mp3", duration: "03:24", mood: "Workout", duration_sec: durationToSeconds("03:24"), cover: "public/believer.jpg" },
    { name: "Bones - Imagine Dragons", artist: "Imagine Dragons", path: "songs/bones.mp3", duration: "02:46", mood: "Workout", duration_sec: durationToSeconds("02:46"), cover: "public/bones.jpg" },
    { name: "Nile Nile Ambar - Kishore Kumar", artist: "Kishore Kumar", path: "songs/nile.mp3", duration: "05:07", mood: "Chill", duration_sec: durationToSeconds("05:07"), cover: "public/nile.jpg" },
    { name: "Aaj ki Raat", artist: "Sonu Nigam", path: "songs/aaj.mp3", duration: "04:58", mood: "Happy", duration_sec: durationToSeconds("04:58"), cover: "public/aaj.jpg" }
];

// Local Storage Keys
const LAST_SONG_INDEX_KEY = 'spotify_last_song_index';
const PLAYBACK_TIME_KEY = 'spotify_playback_time';
const VOLUME_KEY = 'spotify_volume';

// Global Filter State
let filterState = {
    mood: 'All',
    duration: 'All',
    search: ''
};


// Get persisted state or use defaults
let currentSongIndex = parseInt(localStorage.getItem(LAST_SONG_INDEX_KEY)) || 0;
// Ensure index is valid for current songs array length
if (currentSongIndex >= songs.length) {
    currentSongIndex = 0; 
    localStorage.setItem(LAST_SONG_INDEX_KEY, 0);
}

let persistedVolume = parseFloat(localStorage.getItem(VOLUME_KEY)) || 0.5;
let persistedTime = parseFloat(localStorage.getItem(PLAYBACK_TIME_KEY)) || 0;
let lastUnmutedVolume = persistedVolume > 0 ? persistedVolume : 0.5;

// Note: Initializing the audio element after the songs array is defined
let audio = new Audio(songs[currentSongIndex].path);
audio.volume = persistedVolume;

// DOM Elements
const playBtn = document.getElementById('play');
const previousBtn = document.getElementById('previous');
const nextBtn = document.getElementById('next');
const songInfo = document.querySelector('.songinfo');
const songTime = document.querySelector('.songtime');
const seekbar = document.querySelector('.seekbar');
const circle = document.querySelector('.circle');
const volumeRange = document.getElementById('volume');
const volumeIcon = document.getElementById('volumeIconContainer');
const leftPanel = document.querySelector('.left');
const hamburger = document.querySelector('.hamburger');
const closeIcon = document.querySelector('.close');
const searchInput = document.getElementById('searchInput');

// Now Playing Card DOM Elements
const nowPlayingCover = document.getElementById('nowPlayingCover');
const nowPlayingTitle = document.getElementById('nowPlayingTitle');
const nowPlayingArtist = document.getElementById('nowPlayingArtist');
const cardPlayBtn = document.getElementById('cardPlay');

const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');
    return `${formattedMinutes}:${formattedSeconds}`;
}

// Function to save current state to Local Storage
const savePlaybackState = () => {
    localStorage.setItem(LAST_SONG_INDEX_KEY, currentSongIndex);
    localStorage.setItem(PLAYBACK_TIME_KEY, audio.currentTime);
    localStorage.setItem(VOLUME_KEY, audio.volume);
}

const attachSongButtonListeners = () => {
    document.querySelectorAll('.songItem button').forEach(button => {
        button.removeEventListener('click', handleSongButtonClick); 
        button.addEventListener('click', handleSongButtonClick);
    });
};

const handleSongButtonClick = (e) => {
    const index = parseInt(e.currentTarget.dataset.index); 

    if (currentSongIndex === index) {
        if (!audio.paused) {
            audio.pause();
        } else {
            audio.play();
        }
    } else {
        playSong(index);
    }
    updatePlaybarUI(currentSongIndex);
    savePlaybackState();
};

// Function to dynamically render the song list
const renderSongList = (list) => {
    const songListUl = document.querySelector('.songList ul');
    songListUl.innerHTML = ''; 

    list.forEach((song) => {
        // Find the index of this song in the *original* array to correctly link the audio file
        const originalIndex = songs.findIndex(s => s.name === song.name);
        if (originalIndex === -1) return; // Skip if song isn't in original list

        const listItem = document.createElement('li');
        listItem.classList.add('songItem');
        
        listItem.innerHTML = `
            <div class="songNameContainer">
                <div class="songName">${song.name}</div>
                <div class="songArtistAndDuration">
                    <span class="songArtist">${song.artist}</span>
                    <span class="songDuration">${song.duration}</span>
                </div>
            </div>
            <div class="list-controls">
                <div class="mini-progress-bar"></div> 
                <button data-index="${originalIndex}">Play</button> 
            </div>
        `;
        songListUl.appendChild(listItem);
    });

    attachSongButtonListeners();
};

// Combined Filter Logic
const getFilteredSongs = () => {
    let filtered = songs;
    const searchTerm = filterState.search.toLowerCase();

    // 1. Apply Mood Filter
    if (filterState.mood !== 'All') {
        filtered = filtered.filter(song => song.mood === filterState.mood);
    }

    // 2. Apply Duration Filter
    if (filterState.duration !== 'All') {
        filtered = filtered.filter(song => {
            const durationSec = song.duration_sec; 
            switch (filterState.duration) {
                case 'Short':
                    return durationSec < 180; 
                case 'Medium':
                    return durationSec >= 180 && durationSec <= 240; 
                case 'Long':
                    return durationSec > 240; 
                default:
                    return true;
            }
        });
    }
    
    // 3. Apply Search Filter
    if (searchTerm) {
        filtered = filtered.filter(song => 
            song.name.toLowerCase().includes(searchTerm) || 
            song.artist.toLowerCase().includes(searchTerm) ||
            song.mood.toLowerCase().includes(searchTerm)
        );
    }

    return filtered;
};

// Main Filter function (Global to be called from HTML buttons/select)
window.applyFilter = (type, value) => {
    // Update the state
    filterState[type] = value;
    
    // Update active class for mood buttons
    if (type === 'mood') {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            if (btn.dataset.filterType === 'mood') {
                btn.classList.remove('active-filter');
                if (btn.textContent.trim() === value) {
                    btn.classList.add('active-filter');
                } else if (value === 'All' && btn.textContent.trim() === 'All') {
                     btn.classList.add('active-filter');
                }
            }
        });
    }

    // Render the new filtered list
    const listToRender = getFilteredSongs();
    renderSongList(listToRender);
    
    updatePlaybarUI(currentSongIndex); 
};


const updateVolumeIcon = () => {
    if (audio.volume === 0) {
        volumeIcon.src = "public/mute.svg"; 
    } else {
        volumeIcon.src = "public/volume.svg";
    }
}

// Combined UI Update Function
const updatePlaybarUI = (index) => {
    const currentSong = songs[index];
    
    // 1. Playbar Update
    songInfo.innerHTML = currentSong.name;
    playBtn.src = audio.paused ? "public/play.svg" : "public/pause.svg";
    
    // 2. Volume Update
    volumeRange.value = audio.volume * 100;
    updateVolumeIcon();

    // 3. Song List Update
    document.querySelectorAll('.songItem').forEach(item => {
        const itemButton = item.querySelector('button');
        const originalIndex = parseInt(itemButton.dataset.index);

        item.classList.remove('playing');
        itemButton.innerHTML = 'Play';
        item.querySelector('.mini-progress-bar').style.setProperty('--progress-width', '0%');
        
        if (originalIndex === index) {
            item.classList.add('playing');
            itemButton.innerHTML = audio.paused ? 'Play' : 'Pause';
        }
    });

    // 4. Now Playing Card Update
    nowPlayingTitle.textContent = currentSong.name;
    nowPlayingArtist.textContent = currentSong.artist;
    nowPlayingCover.src = currentSong.cover || 'public/default_cover.jpg';
    cardPlayBtn.src = audio.paused ? "public/play.svg" : "public/pause.svg";
}

const playSong = (index, startTime = 0) => {
    currentSongIndex = index;
    audio.src = songs[currentSongIndex].path;
    audio.currentTime = startTime; 

    audio.addEventListener('loadedmetadata', function playAfterLoad() {
        if (startTime > 0) {
             audio.currentTime = startTime; 
        }
        audio.play();
        updatePlaybarUI(currentSongIndex);
        audio.removeEventListener('loadedmetadata', playAfterLoad); 
    });
    audio.load();
    updatePlaybarUI(currentSongIndex);
}

document.addEventListener('DOMContentLoaded', () => {
    // RENDER THE INITIAL SONG LIST (All songs)
    renderSongList(songs); 
    
    volumeRange.value = persistedVolume * 100;
    audio.volume = persistedVolume;

    if (persistedTime > 0) {
        playSong(currentSongIndex, persistedTime); 
        audio.pause();
        localStorage.removeItem(PLAYBACK_TIME_KEY);
    } else {
        audio.src = songs[currentSongIndex].path;
        audio.load();
    }

    updatePlaybarUI(currentSongIndex);

    // Mobile Navigation Logic
    hamburger.addEventListener('click', () => {
        leftPanel.style.left = "0";
    });

    closeIcon.addEventListener('click', () => {
        leftPanel.style.left = "-130%";
    });

    // Profile Icon Click Logic
    document.getElementById('profileIcon').addEventListener('click', () => {
        alert("Apni profile dekne ke liye Dhanyewad ! Lekin yeh feature abhi uplabdh nahi hai.");
    });
    
    // Live Search Input Listener
    searchInput.addEventListener('input', (e) => {
        window.applyFilter('search', e.target.value);
    });

    // 💥 REMOVED: Create Playlist Button Listener 💥

    // Card Play Button Listener (Mirrors main play button)
    cardPlayBtn.addEventListener('click', () => {
        playBtn.click(); // Trigger the main play button logic
    });
});

// Play/Pause button logic (main playbar)
playBtn.addEventListener('click', () => {
    if (audio.paused || audio.ended) {
        audio.play();
    } else {
        audio.pause();
    }
    updatePlaybarUI(currentSongIndex);
    savePlaybackState();
});

// Next button logic
nextBtn.addEventListener('click', () => {
    currentSongIndex = (currentSongIndex + 1) % songs.length;
    playSong(currentSongIndex);
    savePlaybackState();
});

// Previous button logic
previousBtn.addEventListener('click', () => {
    currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
    playSong(currentSongIndex);
    savePlaybackState();
});

// Volume Icon Mute Toggle
volumeIcon.addEventListener('click', () => {
    if (audio.volume > 0) {
        lastUnmutedVolume = audio.volume;
        audio.volume = 0;
    } else {
        audio.volume = lastUnmutedVolume;
    }
    volumeRange.value = audio.volume * 100;
    updatePlaybarUI(currentSongIndex);
    savePlaybackState();
});

// Timeupdate listener
audio.addEventListener('timeupdate', () => {
    if (audio.duration) {
        const percent = (audio.currentTime / audio.duration) * 100;

        songTime.innerHTML = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
        
        circle.style.left = percent + "%";

        const playingItem = document.querySelector('.songItem.playing');
        if (playingItem) {
            playingItem.querySelector('.mini-progress-bar').style.setProperty('--progress-width', `${percent}%`);
        }
        
        if (!audio.paused) {
             localStorage.setItem(PLAYBACK_TIME_KEY, audio.currentTime);
        }
    }
});

// Seekbar logic
seekbar.addEventListener('click', (e) => {
    if (audio.duration) {
        const rect = seekbar.getBoundingClientRect();
        const percent = (e.offsetX / rect.width);
        audio.currentTime = percent * audio.duration;
        savePlaybackState();
    }
});

// Volume logic 
volumeRange.addEventListener('input', (e) => {
    audio.volume = e.target.value / 100;
    if (audio.volume > 0) {
        lastUnmutedVolume = audio.volume;
    }
    updateVolumeIcon();
    savePlaybackState();
});

// Ended logic
audio.addEventListener('ended', () => {
    currentSongIndex = (currentSongIndex + 1) % songs.length;
    playSong(currentSongIndex);
    savePlaybackState();
});