// StreamHub - Simple, Vanilla JavaScript Frontend Client
const API_BASE = "/api/v1";

let currentUser = JSON.parse(localStorage.getItem("streamhub_user")) || null;
let accessToken = localStorage.getItem("streamhub_token") || "";
let currentPlayingVideo = null;

// ==========================================
// 1. INITIALIZATION & AUTHENTICATION
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    updateAuthUI();
    loadVideos();
});

function getAuthHeaders(isJson = true) {
    const headers = {};
    if (isJson) {
        headers["Content-Type"] = "application/json";
    }
    if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
    }
    return headers;
}

function updateAuthUI() {
    const navAuth = document.getElementById("navAuthSection");

    if (currentUser && accessToken) {
        navAuth.innerHTML = `
            <div class="user-badge">
                <img src="${currentUser.avatar || 'https://via.placeholder.com/34'}" alt="${currentUser.username}">
                <span style="font-weight: 600; font-size: 14px;">${currentUser.username}</span>
            </div>
            <button class="btn-secondary" onclick="handleLogout()">Sign Out</button>
        `;
    } else {
        navAuth.innerHTML = `
            <button class="btn-secondary" onclick="openModal('loginModal')">Sign In</button>
            <button class="btn-primary" onclick="openModal('registerModal')">Sign Up</button>
        `;
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const identifier = document.getElementById("loginIdentifier").value.trim();
    const password = document.getElementById("loginPassword").value;

    const isEmail = identifier.includes("@");
    const payload = {
        password: password
    };
    if (isEmail) payload.email = identifier;
    else payload.username = identifier;

    try {
        const res = await fetch(`${API_BASE}/users/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Login failed");

        accessToken = data.data.accessToken;
        currentUser = data.data.user;

        localStorage.setItem("streamhub_token", accessToken);
        localStorage.setItem("streamhub_user", JSON.stringify(currentUser));

        closeModal("loginModal");
        updateAuthUI();
        showToast("Logged in successfully!");
        loadVideos();
    } catch (err) {
        alert(err.message);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const fullname = document.getElementById("regFullname").value;
    const username = document.getElementById("regUsername").value;
    const email = document.getElementById("regEmail").value;
    const password = document.getElementById("regPassword").value;
    const avatarFile = document.getElementById("regAvatar").files[0];
    const coverFile = document.getElementById("regCover").files[0];

    const formData = new FormData();
    formData.append("fullname", fullname);
    formData.append("username", username);
    formData.append("email", email);
    formData.append("password", password);
    formData.append("avatar", avatarFile);
    if (coverFile) formData.append("coverImage", coverFile);

    try {
        showToast("Uploading avatar to Cloudinary & creating channel...");
        const res = await fetch(`${API_BASE}/users/register`, {
            method: "POST",
            body: formData
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Registration failed");

        closeModal("registerModal");
        showToast("Account created successfully! Please sign in.");
        openModal("loginModal");
    } catch (err) {
        alert(err.message);
    }
}

async function handleLogout() {
    try {
        if (accessToken) {
            await fetch(`${API_BASE}/users/logout`, {
                method: "POST",
                headers: getAuthHeaders()
            });
        }
    } catch (_) {}

    localStorage.removeItem("streamhub_token");
    localStorage.removeItem("streamhub_user");
    currentUser = null;
    accessToken = "";
    updateAuthUI();
    showToast("Logged out successfully");
    switchTab("videos");
    loadVideos();
}

// ==========================================
// 2. VIDEO FEED & SEARCH
// ==========================================

async function loadVideos(query = "") {
    const grid = document.getElementById("videoGrid");
    grid.innerHTML = `<p style="color: var(--text-muted);">Loading videos...</p>`;

    try {
        const url = query 
            ? `${API_BASE}/videos?query=${encodeURIComponent(query)}` 
            : `${API_BASE}/videos`;

        const res = await fetch(url, {
            headers: getAuthHeaders()
        });

        const data = await res.json();
        if (!res.ok) {
            if (res.status === 401) {
                grid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                        <h3>Welcome to StreamHub</h3>
                        <p style="color: var(--text-muted); margin: 10px 0 20px 0;">Please sign in to explore and publish videos</p>
                        <button class="btn-primary" onclick="openModal('loginModal')">Sign In</button>
                    </div>`;
                return;
            }
            throw new Error(data.message);
        }

        const videos = data.data.docs || [];
        document.getElementById("videoCount").innerText = `${videos.length} videos`;

        if (videos.length === 0) {
            grid.innerHTML = `<p style="color: var(--text-muted); grid-column: 1 / -1; text-align: center;">No videos published yet. Be the first to upload one!</p>`;
            return;
        }

        grid.innerHTML = videos.map(video => `
            <div class="video-card" onclick="openVideoWatch('${video._id}')">
                <div class="thumb-container">
                    <img src="${video.thumbnail}" alt="${video.title}">
                    <span class="duration-tag">${formatDuration(video.duration)}</span>
                </div>
                <div class="video-info">
                    <img class="channel-avatar" src="${video.owner?.avatar || 'https://via.placeholder.com/38'}" alt="${video.owner?.username || 'Channel'}">
                    <div class="video-details">
                        <h4>${escapeHtml(video.title)}</h4>
                        <div class="channel-name">${escapeHtml(video.owner?.fullname || video.owner?.username || 'Creator')}</div>
                        <div class="video-stats">${video.views || 0} views • ${formatDate(video.createdAt)}</div>
                    </div>
                </div>
            </div>
        `).join("");

    } catch (err) {
        grid.innerHTML = `<p style="color: var(--danger);">${err.message}</p>`;
    }
}

function handleSearch(event) {
    if (event.key === "Enter") {
        performSearch();
    }
}

function performSearch() {
    const q = document.getElementById("searchInput").value.trim();
    switchTab("videos");
    loadVideos(q);
}

// ==========================================
// 3. WATCH PLAYER & INTERACTIONS
// ==========================================

async function openVideoWatch(videoId) {
    if (!requireAuth()) return;

    try {
        const res = await fetch(`${API_BASE}/videos/${videoId}`, {
            headers: getAuthHeaders()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        currentPlayingVideo = data.data;

        // Populate player
        const player = document.getElementById("mainVideoPlayer");
        player.src = currentPlayingVideo.videofile;
        player.poster = currentPlayingVideo.thumbnail;

        document.getElementById("watchVideoTitle").innerText = currentPlayingVideo.title;
        document.getElementById("watchVideoViews").innerText = `${currentPlayingVideo.views} views`;
        document.getElementById("watchVideoDate").innerText = formatDate(currentPlayingVideo.createdAt);
        document.getElementById("watchVideoDesc").innerText = currentPlayingVideo.description;

        // Channel info
        const channel = currentPlayingVideo.owner || {};
        document.getElementById("watchChannelInfo").innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <img class="channel-avatar" src="${channel.avatar || 'https://via.placeholder.com/38'}" alt="${channel.username}">
                <div>
                    <h4 style="font-size: 15px;">${escapeHtml(channel.fullname || channel.username || 'Creator')}</h4>
                    <span style="font-size: 12px; color: var(--text-muted);">@${channel.username || ''}</span>
                </div>
            </div>
        `;

        // Switch to watch view
        hideAllSections();
        document.getElementById("section-watch").style.display = "block";
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Load comments
        loadComments(videoId);

    } catch (err) {
        alert(err.message);
    }
}

async function toggleLikeCurrentVideo() {
    if (!requireAuth()) return;
    if (!currentPlayingVideo) return;

    try {
        const res = await fetch(`${API_BASE}/likes/toggle/v/${currentPlayingVideo._id}`, {
            method: "POST",
            headers: getAuthHeaders()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        const isLiked = data.data.isLiked;
        const btn = document.getElementById("btnLikeVideo");
        btn.innerHTML = isLiked ? `❤️ Liked` : `👍 Like`;
        btn.style.color = isLiked ? "var(--primary)" : "var(--text-main)";
        showToast(isLiked ? "Video added to Liked Videos" : "Video unliked");
    } catch (err) {
        alert(err.message);
    }
}

async function toggleSubscribeCurrentChannel() {
    if (!requireAuth()) return;
    if (!currentPlayingVideo || !currentPlayingVideo.owner?._id) return;

    try {
        const res = await fetch(`${API_BASE}/subscriptions/c/${currentPlayingVideo.owner._id}`, {
            method: "POST",
            headers: getAuthHeaders()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        const isSubscribed = data.data.isSubscribed;
        const btn = document.getElementById("btnSubscribe");
        btn.innerText = isSubscribed ? "Subscribed ✓" : "Subscribe";
        btn.className = isSubscribed ? "btn-subscribe subscribed" : "btn-subscribe";
        showToast(isSubscribed ? "Subscribed to channel!" : "Unsubscribed");
    } catch (err) {
        alert(err.message);
    }
}

// ==========================================
// 4. COMMENTS LOGIC
// ==========================================

async function loadComments(videoId) {
    const list = document.getElementById("commentsList");
    list.innerHTML = `<p style="color: var(--text-muted); font-size: 13px;">Loading comments...</p>`;

    try {
        const res = await fetch(`${API_BASE}/comments/${videoId}`, {
            headers: getAuthHeaders()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        const comments = data.data.docs || [];
        if (comments.length === 0) {
            list.innerHTML = `<p style="color: var(--text-muted); font-size: 13px;">No comments yet. Say something nice!</p>`;
            return;
        }

        list.innerHTML = comments.map(comment => {
            const isOwner = currentUser && comment.owner && (comment.owner._id === currentUser._id);
            return `
                <div class="comment-card">
                    <img class="channel-avatar" style="width: 32px; height: 32px;" src="${comment.owner?.avatar || 'https://via.placeholder.com/32'}" alt="Avatar">
                    <div class="comment-content">
                        <div class="comment-header">
                            <span class="comment-author">@${escapeHtml(comment.owner?.username || 'user')}</span>
                            <span class="comment-date">${formatDate(comment.createdAt)}</span>
                        </div>
                        <p>${escapeHtml(comment.content)}</p>
                        <div class="comment-actions">
                            <span class="comment-action-link" onclick="toggleLikeComment('${comment._id}')">👍 Like</span>
                            ${isOwner ? `<span class="comment-action-link" style="color: var(--danger);" onclick="deleteComment('${comment._id}')">Delete</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join("");

    } catch (err) {
        list.innerHTML = `<p style="color: var(--danger); font-size: 13px;">${err.message}</p>`;
    }
}

async function postComment() {
    if (!requireAuth()) return;
    const input = document.getElementById("newCommentInput");
    const content = input.value.trim();
    if (!content) return;

    try {
        const res = await fetch(`${API_BASE}/comments/${currentPlayingVideo._id}`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ content })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        input.value = "";
        showToast("Comment posted!");
        loadComments(currentPlayingVideo._id);
    } catch (err) {
        alert(err.message);
    }
}

async function deleteComment(commentId) {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
        const res = await fetch(`${API_BASE}/comments/c/${commentId}`, {
            method: "DELETE",
            headers: getAuthHeaders()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        showToast("Comment deleted");
        loadComments(currentPlayingVideo._id);
    } catch (err) {
        alert(err.message);
    }
}

async function toggleLikeComment(commentId) {
    if (!requireAuth()) return;

    try {
        const res = await fetch(`${API_BASE}/likes/toggle/c/${commentId}`, {
            method: "POST",
            headers: getAuthHeaders()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        showToast(data.data.isLiked ? "Comment liked!" : "Comment unliked");
    } catch (err) {
        alert(err.message);
    }
}

// ==========================================
// 5. VIDEO UPLOAD (TO CLOUDINARY)
// ==========================================

async function handleUploadVideo(e) {
    e.preventDefault();
    if (!requireAuth()) return;

    const title = document.getElementById("uploadTitle").value.trim();
    const description = document.getElementById("uploadDescription").value.trim();
    const videoFile = document.getElementById("uploadVideoFile").files[0];
    const thumbnailFile = document.getElementById("uploadThumbnail").files[0];

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("videoFile", videoFile);
    formData.append("thumbnail", thumbnailFile);

    const progressDiv = document.getElementById("uploadProgress");
    const submitBtn = document.getElementById("btnSubmitVideo");

    progressDiv.style.display = "block";
    submitBtn.disabled = true;
    submitBtn.innerText = "Uploading to Cloudinary...";

    try {
        const res = await fetch(`${API_BASE}/videos`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`
            },
            body: formData
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to publish video");

        showToast("Video published successfully to your channel!");
        closeModal("uploadVideoModal");
        document.getElementById("uploadVideoForm").reset();
        switchTab("videos");
        loadVideos();
    } catch (err) {
        alert(err.message);
    } finally {
        progressDiv.style.display = "none";
        submitBtn.disabled = false;
        submitBtn.innerText = "Publish Video";
    }
}

// ==========================================
// 6. COMMUNITY / TWEETS
// ==========================================

async function loadTweets() {
    if (!requireAuth()) return;

    const feed = document.getElementById("tweetsFeed");
    feed.innerHTML = `<p style="color: var(--text-muted);">Loading community posts...</p>`;

    try {
        // Fetch tweets of the user
        const res = await fetch(`${API_BASE}/tweets/user/${currentUser._id}`, {
            headers: getAuthHeaders()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        const tweets = data.data || [];
        if (tweets.length === 0) {
            feed.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 20px;">No community tweets yet. Post your first update above!</p>`;
            return;
        }

        feed.innerHTML = tweets.map(tweet => `
            <div class="tweet-card">
                <img class="channel-avatar" src="${tweet.owner?.avatar || currentUser.avatar || 'https://via.placeholder.com/38'}" alt="Avatar">
                <div class="tweet-body">
                    <div class="tweet-header">
                        <div>
                            <span class="tweet-author-name">${escapeHtml(tweet.owner?.fullname || currentUser.fullname || 'Author')}</span>
                            <span class="tweet-author-handle">@${escapeHtml(tweet.owner?.username || currentUser.username || '')} • ${formatDate(tweet.createdAt)}</span>
                        </div>
                        <button class="btn-danger" onclick="deleteTweet('${tweet._id}')">Delete</button>
                    </div>
                    <div class="tweet-text">${escapeHtml(tweet.content)}</div>
                    <div class="tweet-actions">
                        <span class="comment-action-link" onclick="toggleLikeTweet('${tweet._id}')">❤️ Like Tweet</span>
                    </div>
                </div>
            </div>
        `).join("");

    } catch (err) {
        feed.innerHTML = `<p style="color: var(--danger);">${err.message}</p>`;
    }
}

async function postTweet() {
    if (!requireAuth()) return;
    const input = document.getElementById("tweetContentInput");
    const content = input.value.trim();
    if (!content) return;

    try {
        const res = await fetch(`${API_BASE}/tweets`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ content })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        input.value = "";
        showToast("Tweet published!");
        loadTweets();
    } catch (err) {
        alert(err.message);
    }
}

async function deleteTweet(tweetId) {
    if (!confirm("Are you sure you want to delete this tweet?")) return;

    try {
        const res = await fetch(`${API_BASE}/tweets/${tweetId}`, {
            method: "DELETE",
            headers: getAuthHeaders()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        showToast("Tweet deleted");
        loadTweets();
    } catch (err) {
        alert(err.message);
    }
}

async function toggleLikeTweet(tweetId) {
    if (!requireAuth()) return;

    try {
        const res = await fetch(`${API_BASE}/likes/toggle/t/${tweetId}`, {
            method: "POST",
            headers: getAuthHeaders()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        showToast(data.data.isLiked ? "Tweet liked!" : "Tweet unliked");
    } catch (err) {
        alert(err.message);
    }
}

// ==========================================
// 7. LIKED VIDEOS
// ==========================================

async function loadLikedVideos() {
    if (!requireAuth()) return;
    const grid = document.getElementById("likedVideosGrid");
    grid.innerHTML = `<p style="color: var(--text-muted);">Loading liked videos...</p>`;

    try {
        const res = await fetch(`${API_BASE}/likes/videos`, {
            headers: getAuthHeaders()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        const videos = data.data || [];
        if (videos.length === 0) {
            grid.innerHTML = `<p style="color: var(--text-muted); grid-column: 1 / -1; text-align: center;">You haven't liked any videos yet.</p>`;
            return;
        }

        grid.innerHTML = videos.map(video => `
            <div class="video-card" onclick="openVideoWatch('${video._id}')">
                <div class="thumb-container">
                    <img src="${video.thumbnail}" alt="${video.title}">
                </div>
                <div class="video-info">
                    <img class="channel-avatar" src="${video.owner?.avatar || 'https://via.placeholder.com/38'}">
                    <div class="video-details">
                        <h4>${escapeHtml(video.title)}</h4>
                        <div class="channel-name">${escapeHtml(video.owner?.fullname || video.owner?.username || '')}</div>
                        <div class="video-stats">${video.views || 0} views</div>
                    </div>
                </div>
            </div>
        `).join("");

    } catch (err) {
        grid.innerHTML = `<p style="color: var(--danger);">${err.message}</p>`;
    }
}

// ==========================================
// 8. CREATOR STUDIO / DASHBOARD
// ==========================================

async function loadDashboard() {
    if (!requireAuth()) return;

    try {
        // 1. Fetch channel stats
        const statsRes = await fetch(`${API_BASE}/dashboard/stats`, {
            headers: getAuthHeaders()
        });
        const statsData = await statsRes.json();
        if (statsRes.ok) {
            const s = statsData.data;
            document.getElementById("statSubscribers").innerText = s.totalSubscribers || 0;
            document.getElementById("statVideos").innerText = s.totalVideos || 0;
            document.getElementById("statViews").innerText = s.totalViews || 0;
            document.getElementById("statLikes").innerText = s.totalLikes || 0;
        }

        // 2. Fetch channel uploaded videos
        const list = document.getElementById("dashboardVideosList");
        list.innerHTML = `<p style="color: var(--text-muted);">Loading your studio uploads...</p>`;

        const videosRes = await fetch(`${API_BASE}/dashboard/videos`, {
            headers: getAuthHeaders()
        });
        const videosData = await videosRes.json();
        if (!videosRes.ok) throw new Error(videosData.message);

        const videos = videosData.data || [];
        if (videos.length === 0) {
            list.innerHTML = `<p style="color: var(--text-muted);">No videos uploaded to this channel yet.</p>`;
            return;
        }

        list.innerHTML = videos.map(v => `
            <div class="studio-video-row">
                <div class="studio-video-meta">
                    <img class="studio-thumb" src="${v.thumbnail}">
                    <div>
                        <h4 style="font-size: 15px; margin-bottom: 4px;">${escapeHtml(v.title)}</h4>
                        <span style="font-size: 12px; color: var(--text-muted);">${v.views || 0} views • ${formatDate(v.createdAt)}</span>
                    </div>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <button class="btn-secondary" style="font-size: 12px;" onclick="togglePublish('${v._id}')">
                        ${v.isPublished ? 'Status: Public ✓' : 'Status: Draft (Private)'}
                    </button>
                    <button class="btn-danger" onclick="deleteVideo('${v._id}')">Delete</button>
                </div>
            </div>
        `).join("");

    } catch (err) {
        alert(err.message);
    }
}

async function togglePublish(videoId) {
    try {
        const res = await fetch(`${API_BASE}/videos/toggle/publish/${videoId}`, {
            method: "PATCH",
            headers: getAuthHeaders()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        showToast(data.message);
        loadDashboard();
    } catch (err) {
        alert(err.message);
    }
}

async function deleteVideo(videoId) {
    if (!confirm("Are you sure you want to permanently delete this video?")) return;

    try {
        const res = await fetch(`${API_BASE}/videos/${videoId}`, {
            method: "DELETE",
            headers: getAuthHeaders()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        showToast("Video deleted successfully");
        loadDashboard();
    } catch (err) {
        alert(err.message);
    }
}

// ==========================================
// 9. NAVIGATION & UTILITIES
// ==========================================

function switchTab(tab) {
    hideAllSections();

    // Reset active buttons (desktop sidebar and mobile bottom nav)
    document.querySelectorAll(".nav-tab, .mobile-nav-btn").forEach(b => b.classList.remove("active"));
    const activeBtn = document.getElementById(`tab-${tab}`);
    if (activeBtn) activeBtn.classList.add("active");
    const activeMobBtn = document.getElementById(`mob-tab-${tab}`);
    if (activeMobBtn) activeMobBtn.classList.add("active");

    if (tab === "videos") {
        document.getElementById("section-videos").style.display = "block";
        loadVideos();
    } else if (tab === "tweets") {
        document.getElementById("section-tweets").style.display = "block";
        loadTweets();
    } else if (tab === "liked") {
        document.getElementById("section-liked").style.display = "block";
        loadLikedVideos();
    } else if (tab === "dashboard") {
        document.getElementById("section-dashboard").style.display = "block";
        loadDashboard();
    }
}

function hideAllSections() {
    document.querySelectorAll(".content-section").forEach(s => s.style.display = "none");
    const player = document.getElementById("mainVideoPlayer");
    if (player) player.pause();
}

function requireAuth() {
    if (!currentUser || !accessToken) {
        openModal("loginModal");
        showToast("Please sign in first");
        return false;
    }
    return true;
}

function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add("active");
}

function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove("active");
}

function showToast(msg) {
    const t = document.getElementById("toast");
    t.innerText = msg;
    t.classList.add("show");
    setTimeout(() => {
        t.classList.remove("show");
    }, 3500);
}

function formatDuration(seconds) {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

