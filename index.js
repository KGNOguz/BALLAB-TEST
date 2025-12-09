
// --- STATE & INITIALIZATION ---

let state = {
    articles: [],
    categories: [],
    announcement: { text: '', active: false },
    files: [], 
    isAuthenticated: false,
    darkMode: false, 
    menuOpen: false,
    editingId: null,
    visibleCount: 5 // New: pagination state
};

// --- DATA FETCHING (SHARED) ---
const initApp = async () => {
    // 1. Theme Logic (System Sync if no preference)
    const storedTheme = localStorage.getItem('mimos_theme');
    if (storedTheme) {
        state.darkMode = storedTheme === 'dark';
    } else {
        // Check system preference
        state.darkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    // Apply theme immediately
    if (state.darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');

    try {
        const response = await fetch('/api/data');
        if (!response.ok) throw new Error(`HTTP Hata: ${response.status}`);
        
        const data = await response.json();
        
        state.articles = data.articles || [];
        state.categories = data.categories || [];
        state.announcement = data.announcement || { text: '', active: false };
        state.files = data.files || [];
        
        // --- ROUTING / VIEW LOGIC ---
        const adminApp = document.getElementById('admin-app');
        const publicApp = document.getElementById('app'); 
        const searchApp = document.getElementById('search-results'); 

        renderSidebarCategories();
        renderAnnouncement();

        if (adminApp) {
            if(sessionStorage.getItem('admin_auth') === 'true') {
                state.isAuthenticated = true;
            }
            renderAdmin(adminApp);
        } else if (searchApp) {
            renderSearch(searchApp);
        } else if (publicApp) {
            renderHome(publicApp);
        }
        
    } catch (error) {
        console.error("Veri yükleme hatası:", error);
        const errorHTML = `
            <div class="flex items-center justify-center min-h-[50vh]">
                <div class="p-6 text-center bg-red-50 border border-red-200 rounded-lg max-w-md">
                    <h2 class="text-lg font-bold text-red-700 mb-2">Bağlantı Hatası</h2>
                    <p class="text-sm text-red-600">Veriler yüklenemedi. Lütfen sayfayı yenileyin.</p>
                </div>
            </div>`;
        
        const adminApp = document.getElementById('admin-app');
        if(adminApp) adminApp.innerHTML = errorHTML;
        
        const publicApp = document.getElementById('app');
        if(publicApp) publicApp.innerHTML = errorHTML;
    }
};

// --- SHARED UTILS ---
const toggleTheme = () => {
    state.darkMode = !state.darkMode;
    if (state.darkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('mimos_theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('mimos_theme', 'light');
    }
};

const toggleMenu = (force) => {
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    if(!sidebar || !sidebarOverlay) return;

    state.menuOpen = force !== undefined ? force : !state.menuOpen;
    if (state.menuOpen) {
        sidebar.classList.remove('-translate-x-full');
        sidebarOverlay.classList.remove('opacity-0', 'pointer-events-none');
    } else {
        sidebar.classList.add('-translate-x-full');
        sidebarOverlay.classList.add('opacity-0', 'pointer-events-none');
    }
};

window.handleSearch = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const query = formData.get('q');
    
    if(!query || query.length < 3) {
        alert("Arama yapmak için en az 3 karakter girmelisiniz.");
        return;
    }
    window.location.href = `/search.html?q=${encodeURIComponent(query)}`;
};

const renderAnnouncement = () => {
    const container = document.getElementById('announcement-container');
    if (!container) return;
    
    if (!state.announcement.active || !state.announcement.text) {
        container.innerHTML = '';
        return;
    }
    container.innerHTML = `
        <div class="bg-paper dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 relative transition-colors duration-300">
            <div class="max-w-7xl mx-auto flex items-center justify-center gap-3">
                <span class="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                <span class="text-sm font-serif italic text-gray-800 dark:text-gray-200">
                    ${state.announcement.text}
                </span>
            </div>
            <button onclick="closeAnnouncement()" class="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">×</button>
        </div>
    `;
};

window.closeAnnouncement = () => {
    const container = document.getElementById('announcement-container');
    if(container) container.innerHTML = '';
};

const renderSidebarCategories = () => {
    const container = document.getElementById('sidebar-categories');
    if (!container) return;

    const mainCats = state.categories.filter(c => c.type === 'main');
    const yearCats = state.categories.filter(c => c.type === 'year');

    container.innerHTML = `
        <div class="space-y-6">
            <div>
                <h4 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Ana Kategoriler</h4>
                <div class="flex flex-col gap-2">
                    ${mainCats.map(c => `
                        <a href="/?category=${encodeURIComponent(c.name)}" class="text-lg font-serif font-bold text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            ${c.name}
                        </a>
                    `).join('')}
                </div>
            </div>
            <div>
                <h4 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Arşiv</h4>
                <div class="flex flex-wrap gap-2">
                    ${yearCats.map(c => `
                        <a href="/?year=${encodeURIComponent(c.name)}" class="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            ${c.name}
                        </a>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
};

// ==========================================
// PUBLIC: HOME & SEARCH
// ==========================================

const parseTurkishDate = (dateStr) => {
    if (!dateStr) return new Date(0);
    // Format: "12 Ekim 2023"
    const months = {
        'ocak': 0, 'şubat': 1, 'mart': 2, 'nisan': 3, 'mayıs': 4, 'haziran': 5,
        'temmuz': 6, 'ağustos': 7, 'eylül': 8, 'ekim': 9, 'kasım': 10, 'aralık': 11
    };
    try {
        const parts = dateStr.toLowerCase().split(' ');
        if(parts.length === 3) {
            const day = parseInt(parts[0]);
            const month = months[parts[1]] || 0;
            const year = parseInt(parts[2]);
            return new Date(year, month, day);
        }
    } catch(e) { console.error("Date parse error", e); }
    return new Date(0); // fallback
}

const renderHome = (container) => {
    const urlParams = new URLSearchParams(window.location.search);
    const categoryFilter = urlParams.get('category');
    const yearFilter = urlParams.get('year');

    let displayArticles = state.articles;
    let pageTitle = "Popüler İçerikler";

    if (categoryFilter) {
        displayArticles = state.articles.filter(a => a.categories.includes(categoryFilter));
        pageTitle = `Kategori: ${categoryFilter}`;
    } else if (yearFilter) {
        displayArticles = state.articles.filter(a => a.date.includes(yearFilter));
        pageTitle = `Arşiv: ${yearFilter}`;
    }

    // --- SMART SORTING ALGORITHM ---
    // Score = Views / (DaysSincePublished + 1)
    // This boosts new articles with good views, and decays old articles
    const now = new Date();
    displayArticles.sort((a, b) => {
        const dateA = parseTurkishDate(a.date);
        const dateB = parseTurkishDate(b.date);
        
        const daysA = Math.max(0, (now - dateA) / (1000 * 60 * 60 * 24));
        const daysB = Math.max(0, (now - dateB) / (1000 * 60 * 60 * 24));
        
        const scoreA = (a.views || 0) / (daysA + 1);
        const scoreB = (b.views || 0) / (daysB + 1);
        
        return scoreB - scoreA;
    });
    
    // Discover section (Random 5 from remaining)
    // For Discovery, we exclude the top 3 sorted to ensure variety, or just random
    const discovery = [...state.articles].sort(() => 0.5 - Math.random()).slice(0, 5);

    // Pagination
    const visibleArticles = displayArticles.slice(0, state.visibleCount);
    const hasMore = state.visibleCount < displayArticles.length;

    container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <!-- Main Column -->
            <div class="lg:col-span-8 space-y-16">
                 <!-- Fixed alignment: mb-8, border-b, pb-4 to match sidebar -->
                 <div class="flex items-baseline justify-between border-b border-gray-200 dark:border-gray-800 pb-4 mb-8">
                    <h2 class="text-2xl font-serif font-bold">${pageTitle}</h2>
                    ${(categoryFilter || yearFilter) ? `<a href="/" class="text-sm text-blue-500 hover:underline">Tümünü Göster</a>` : ''}
                 </div>
                
                ${visibleArticles.length === 0 ? '<p class="text-gray-500 italic">Bu kriterlere uygun içerik bulunamadı.</p>' : visibleArticles.map((article) => `
                    <article class="group cursor-pointer grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                        <div class="md:col-span-5 order-2 md:order-1 overflow-hidden rounded-md">
                            <a href="/articles/${article.id}.html">
                                <img src="${article.imageUrl}" alt="${article.title}" class="w-full h-64 md:h-56 object-cover transform group-hover:scale-105 transition-transform duration-700 grayscale-[20%] group-hover:grayscale-0 bg-gray-100 dark:bg-gray-800">
                            </a>
                        </div>
                        <div class="md:col-span-7 order-1 md:order-2 flex flex-col h-full justify-center">
                            <div class="flex flex-wrap items-center gap-2 mb-3">
                                ${article.categories.map(cat => `
                                    <span class="text-[10px] font-bold tracking-widest text-blue-600 dark:text-blue-400 uppercase bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">${cat}</span>
                                `).join('')}
                            </div>
                            <a href="/articles/${article.id}.html" class="block">
                                <h3 class="text-2xl md:text-3xl font-serif font-bold mb-3 leading-tight group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                                    ${article.title}
                                </h3>
                            </a>
                            <p class="text-gray-600 dark:text-gray-400 leading-relaxed mb-4 line-clamp-2 text-sm md:text-base">
                                ${article.excerpt}
                            </p>
                            <div class="text-xs text-gray-400 font-medium flex gap-2">
                                <span>${article.author} &bull; ${article.date}</span>
                                <span class="text-gray-300 dark:text-gray-600">|</span>
                                <span>${article.views || 0} görüntülenme</span>
                            </div>
                        </div>
                    </article>
                `).join('')}

                ${hasMore ? `
                    <div class="text-center pt-8">
                        <button onclick="handleLoadMore()" class="px-8 py-3 border border-gray-300 dark:border-gray-600 rounded-full font-bold text-sm hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors uppercase tracking-widest">
                            Daha Fazla Göster
                        </button>
                    </div>
                ` : ''}
            </div>

            <!-- Side Column: Discover -->
            <div class="lg:col-span-4 pl-0 lg:pl-12 lg:border-l border-gray-100 dark:border-gray-800">
                <div class="sticky top-24 space-y-12">
                    <div>
                        <!-- Fixed alignment: mb-6, border-b, pb-4 (Increased pb-2 to pb-4 to match main col) -->
                        <h2 class="text-lg font-serif font-bold mb-8 border-b border-gray-200 dark:border-gray-800 pb-4">
                            Yeni Şeyler Keşfet
                        </h2>
                        <div class="space-y-8">
                            ${discovery.map(article => `
                                <a href="/articles/${article.id}.html" class="group flex gap-4 items-start">
                                    <div class="w-20 h-20 shrink-0 overflow-hidden rounded bg-gray-100 dark:bg-gray-800">
                                        <img src="${article.imageUrl}" class="w-full h-full object-cover group-hover:scale-110 transition-transform">
                                    </div>
                                    <div>
                                        <div class="flex flex-wrap gap-1 mb-1">
                                            ${article.categories.slice(0, 1).map(cat => `
                                                <span class="text-[9px] font-bold uppercase tracking-wider text-gray-400 block">${cat}</span>
                                            `).join('')}
                                        </div>
                                        <h4 class="font-serif font-bold text-sm leading-snug group-hover:underline decoration-1 underline-offset-4">
                                            ${article.title}
                                        </h4>
                                    </div>
                                </a>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
};

window.handleLoadMore = () => {
    state.visibleCount += 3;
    const publicApp = document.getElementById('app');
    renderHome(publicApp);
};

const renderSearch = (container) => {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q') || '';
    
    if(!query) {
        container.innerHTML = '<p class="text-center py-12">Arama terimi bulunamadı.</p>';
        return;
    }

    const lowerQuery = query.toLowerCase();
    const results = state.articles.filter(a => 
        (a.title && a.title.toLowerCase().includes(lowerQuery)) || 
        (a.excerpt && a.excerpt.toLowerCase().includes(lowerQuery)) ||
        (a.author && a.author.toLowerCase().includes(lowerQuery)) ||
        (a.categories && a.categories.some(c => c.toLowerCase().includes(lowerQuery)))
    );

    container.innerHTML = `
        <div class="max-w-4xl mx-auto py-8">
            <h1 class="text-3xl font-serif font-bold mb-2">Arama Sonuçları</h1>
            <p class="text-gray-500 mb-12 border-b border-gray-200 dark:border-gray-700 pb-4">
                "${query}" araması için ${results.length} sonuç bulundu.
            </p>

            <div class="space-y-12">
                ${results.length === 0 ? '<p class="text-gray-500 italic">Sonuç bulunamadı.</p>' : results.map((article) => `
                    <article class="group cursor-pointer grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                        <div class="md:col-span-4 order-2 md:order-1 overflow-hidden rounded-md">
                            <a href="/articles/${article.id}.html">
                                <img src="${article.imageUrl}" alt="${article.title}" class="w-full h-48 object-cover transform group-hover:scale-105 transition-transform duration-700 grayscale-[20%] group-hover:grayscale-0">
                            </a>
                        </div>
                        <div class="md:col-span-8 order-1 md:order-2 flex flex-col h-full justify-center">
                            <div class="flex flex-wrap items-center gap-2 mb-2">
                                ${article.categories.map(cat => `
                                    <span class="text-[9px] font-bold tracking-widest text-blue-600 dark:text-blue-400 uppercase bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">${cat}</span>
                                `).join('')}
                            </div>
                            <a href="/articles/${article.id}.html" class="block">
                                <h3 class="text-xl md:text-2xl font-serif font-bold mb-2 leading-tight group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                                    ${article.title}
                                </h3>
                            </a>
                            <p class="text-gray-600 dark:text-gray-400 leading-relaxed mb-2 line-clamp-2 text-sm">
                                ${article.excerpt}
                            </p>
                        </div>
                    </article>
                `).join('')}
            </div>
        </div>
    `;
};


// ==========================================
// ADMIN PANEL LOGIC (MERGED & REDESIGNED)
// ==========================================

const renderAdmin = (container) => {
    if(state.isAuthenticated) {
        container.innerHTML = renderDashboard();
    } else {
        container.innerHTML = renderLogin();
    }
};

const renderLogin = () => `
    <div class="flex items-center justify-center min-h-[80vh] bg-paper dark:bg-gray-900">
        <form onsubmit="handleLogin(event)" class="w-full max-w-md p-10 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700">
            <div class="text-center mb-8">
                <h2 class="text-3xl font-serif font-bold mb-2">Yönetici Paneli</h2>
            </div>
            <div class="mb-6">
                <input type="password" id="admin-pass" class="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none" placeholder="Şifre">
            </div>
            <button type="submit" class="w-full bg-ink text-paper dark:bg-white dark:text-black py-4 rounded-lg font-bold hover:opacity-90">GİRİŞ YAP</button>
        </form>
    </div>
`;

const renderDashboard = () => {
    // Prep data for edit mode
    let editArticle = null;
    let publishDate = new Date().toISOString().split('T')[0]; // Default today

    if (state.editingId) {
        editArticle = state.articles.find(a => a.id === state.editingId);
        if (editArticle) {
            // Date handling logic here if needed
        }
    }

    return `
    <div class="max-w-7xl mx-auto py-8">
        <header class="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-gray-200 dark:border-gray-700 pb-6 gap-4">
            <div>
                <h1 class="text-4xl font-serif font-bold mb-2">Admin Paneli</h1>
                <p class="text-gray-500">Düzenlemeleri yaptıktan sonra <span class="font-bold">KAYDET</span> butonuna basın.</p>
            </div>
            <div class="flex gap-4">
                 <button onclick="saveChanges()" class="px-6 py-3 bg-black text-white dark:bg-white dark:text-black rounded font-bold hover:opacity-80">DEĞİŞİKLİKLERİ KAYDET</button>
                 <button onclick="handleLogout()" class="px-4 py-3 border border-red-200 text-red-500 rounded hover:bg-red-50">Çıkış</button>
            </div>
        </header>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <!-- Left: Article Form -->
            <div class="lg:col-span-2 space-y-12">
                <div class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative">
                    ${state.editingId ? `<div class="absolute top-4 right-4 bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">DÜZENLEME MODU</div>` : ''}
                    
                    <h2 class="text-2xl font-serif font-bold mb-6">${state.editingId ? 'Makaleyi Düzenle' : 'Makale Oluştur'}</h2>
                    
                    <form onsubmit="handleAddArticle(event)" class="space-y-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <input name="title" required placeholder="Başlık" value="${editArticle ? editArticle.title : ''}" class="w-full p-3 bg-gray-50 dark:bg-gray-900 border rounded">
                            <input name="author" required placeholder="Yazar" value="${editArticle ? editArticle.author : ''}" class="w-full p-3 bg-gray-50 dark:bg-gray-900 border rounded">
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <input type="date" name="dateInput" class="w-full p-3 bg-gray-50 dark:bg-gray-900 border rounded text-gray-500">
                             <input name="imageUrl" placeholder="Kapak Görseli URL" value="${editArticle ? editArticle.imageUrl : ''}" class="w-full p-3 bg-gray-50 dark:bg-gray-900 border rounded">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-bold mb-2 text-gray-500">Kategoriler</label>
                            <div class="flex flex-wrap gap-4 p-4 border rounded bg-gray-50 dark:bg-gray-900">
                                ${state.categories.map(c => `
                                    <label class="flex items-center space-x-2 cursor-pointer">
                                        <input type="checkbox" name="categories" value="${c.name}" class="rounded w-4 h-4" 
                                            ${(editArticle && editArticle.categories.includes(c.name)) ? 'checked' : ''}>
                                        <span class="text-sm">${c.name}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>

                        <div class="text-xs text-gray-500">İçerik için HTML kullanabilirsiniz (örn: &lt;p&gt;, &lt;img&gt;, &lt;b&gt;)</div>
                        <textarea name="content" required rows="10" placeholder="İçerik (HTML)" class="w-full p-4 bg-gray-50 dark:bg-gray-900 border rounded font-mono text-sm">${editArticle ? editArticle.content : ''}</textarea>
                        
                        <div class="flex gap-4">
                            <button class="flex-1 bg-black text-white dark:bg-white dark:text-black py-4 rounded font-bold uppercase hover:opacity-90">
                                ${state.editingId ? 'GÜNCELLE' : 'LİSTEYE EKLE'}
                            </button>
                            ${state.editingId ? `<button type="button" onclick="cancelEdit()" class="px-6 border border-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700">Vazgeç</button>` : ''}
                        </div>
                    </form>
                </div>

                 <div class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h2 class="text-xl font-serif font-bold mb-6">Mevcut Makaleler</h2>
                    <div class="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                        ${state.articles.map(article => `
                            <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                                <div>
                                    <h3 class="font-bold text-lg">${article.title}</h3>
                                    <div class="text-xs text-gray-500 mt-1">${article.date} • ${article.author}</div>
                                </div>
                                <div class="flex gap-2">
                                    <button onclick="handleEditArticle(${article.id})" class="text-xs bg-blue-100 text-blue-600 px-3 py-2 rounded font-bold hover:bg-blue-200">Düzenle</button>
                                    <button onclick="handleDeleteArticle(${article.id})" class="text-xs bg-red-100 text-red-600 px-3 py-2 rounded font-bold hover:bg-red-200">Sil</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- Right: Config -->
            <div class="lg:col-span-1 space-y-8">
                <!-- Announcement -->
                <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h2 class="text-lg font-serif font-bold mb-4">Duyuru</h2>
                    <form onsubmit="handleUpdateAnnouncement(event)" class="flex flex-col gap-3">
                        <input id="announcement-text" value="${state.announcement.text || ''}" class="w-full p-3 bg-gray-50 dark:bg-gray-900 border rounded">
                        <div class="flex gap-2">
                            <button type="button" onclick="toggleAnnouncementActive()" class="flex-1 py-2 border rounded text-xs font-bold ${state.announcement.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}">
                                ${state.announcement.active ? 'AKTİF' : 'PASİF'}
                            </button>
                            <button class="flex-1 py-2 bg-black text-white dark:bg-white dark:text-black rounded text-xs font-bold">GÜNCELLE</button>
                        </div>
                    </form>
                </div>

                <!-- Categories -->
                 <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h2 class="text-lg font-serif font-bold mb-4">Kategoriler</h2>
                    <form onsubmit="handleAddCategory(event)" class="mb-4 space-y-2">
                        <input name="catName" required placeholder="Adı" class="w-full p-2 bg-gray-50 dark:bg-gray-900 border rounded text-sm">
                        <select name="catType" class="w-full p-2 bg-gray-50 dark:bg-gray-900 border rounded text-sm">
                            <option value="main">Ana Kategori</option>
                            <option value="sub">Alt Kategori</option>
                            <option value="year">Yıl</option>
                        </select>
                        <button class="w-full py-2 bg-blue-600 text-white rounded text-sm font-bold">EKLE</button>
                    </form>
                    <div class="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                        ${state.categories.map(c => `
                            <div class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded text-sm">
                                <span>${c.name}</span>
                                <button onclick="handleDeleteCategory(${c.id})" class="text-red-400">×</button>
                            </div>
                        `).join('')}
                    </div>
                 </div>
            </div>
            
            <!-- Bottom: Files (Moved here for more space) -->
            <div class="lg:col-span-3">
                 <div class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h2 class="text-2xl font-serif font-bold mb-6">Dosyalar (Resources)</h2>
                    
                    <form onsubmit="handleFileUpload(event)" class="flex gap-4 mb-8 items-end bg-gray-50 dark:bg-gray-900 p-4 rounded">
                        <div class="flex-grow">
                            <label class="block text-xs font-bold text-gray-500 mb-1">Dosya Adı (Opsiyonel)</label>
                            <input type="text" id="file-name" class="w-full p-2 text-sm border rounded bg-white dark:bg-gray-800">
                        </div>
                        <div class="flex-grow">
                            <label class="block text-xs font-bold text-gray-500 mb-1">Dosya Seç</label>
                            <input type="file" id="file-input" accept="image/*" class="w-full text-xs">
                        </div>
                        <button class="px-6 py-2 bg-blue-600 text-white rounded text-sm font-bold h-10">YÜKLE</button>
                    </form>

                    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                        ${state.files.map(f => `
                            <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded border group relative">
                                <img src="${f.data}" class="w-full h-32 object-cover rounded mb-2 bg-gray-200">
                                <div class="text-xs font-bold truncate mb-2">${f.name}</div>
                                <div class="flex flex-col gap-1">
                                    <button onclick="copyToClipboard('${f.data}')" class="w-full py-1 bg-gray-200 dark:bg-gray-700 text-[10px] font-bold rounded hover:bg-gray-300">KOPYALA</button>
                                    <button onclick="handleDeleteFile(${f.id})" class="w-full py-1 bg-red-100 text-red-600 text-[10px] font-bold rounded hover:bg-red-200">SİL</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

        </div>
    </div>
    `;
};

// --- GLOBAL HANDLERS ---

window.handleLogin = (e) => {
    e.preventDefault();
    const pass = document.getElementById('admin-pass').value;
    if (pass === 'admin123') {
        state.isAuthenticated = true;
        sessionStorage.setItem('admin_auth', 'true');
        const adminApp = document.getElementById('admin-app');
        renderAdmin(adminApp);
    } else {
        alert('Hatalı şifre!');
    }
};

window.handleLogout = () => {
    state.isAuthenticated = false;
    sessionStorage.removeItem('admin_auth');
    const adminApp = document.getElementById('admin-app');
    renderAdmin(adminApp);
};

window.saveChanges = async () => {
    const exportData = {
        articles: state.articles,
        categories: state.categories,
        announcement: state.announcement,
        files: state.files
    };

    try {
        const response = await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(exportData)
        });

        if (response.ok) {
            alert("Değişiklikler kaydedildi ve HTML sayfaları oluşturuldu!");
        } else {
            alert("Hata: Kaydedilemedi.");
        }
    } catch (error) {
        alert("Sunucu iletişim hatası.");
        console.error(error);
    }
};

// New: Handle Edit Click
window.handleEditArticle = (id) => {
    state.editingId = id;
    const adminApp = document.getElementById('admin-app');
    renderAdmin(adminApp);
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// New: Cancel Edit
window.cancelEdit = () => {
    state.editingId = null;
    const adminApp = document.getElementById('admin-app');
    renderAdmin(adminApp);
};

window.handleAddArticle = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const selectedCategories = [];
    document.querySelectorAll('input[name="categories"]:checked').forEach((checkbox) => {
        selectedCategories.push(checkbox.value);
    });

    if (selectedCategories.length === 0) {
        alert("Lütfen en az bir kategori seçiniz.");
        return;
    }

    // Handle Date: if input is empty, use today or existing
    let articleDateStr = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    const dateInput = formData.get('dateInput');
    if (dateInput) {
        // Convert YYYY-MM-DD to Turkish format approx
        const d = new Date(dateInput);
        articleDateStr = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    } else if (state.editingId) {
        // If not editing date, keep old date? For simplicity we might just reset to Today if not provided
        const old = state.articles.find(a => a.id === state.editingId);
        if(old) articleDateStr = old.date;
    }

    const articleData = {
        title: formData.get('title'),
        author: formData.get('author'),
        categories: selectedCategories,
        imageUrl: formData.get('imageUrl'),
        content: formData.get('content'),
        excerpt: formData.get('content').replace(/<[^>]*>?/gm, '').substring(0, 100) + '...',
        date: articleDateStr,
        views: state.editingId ? (state.articles.find(a => a.id === state.editingId)?.views || 0) : 0
    };

    if (state.editingId) {
        // UPDATE Existing
        const index = state.articles.findIndex(a => a.id === state.editingId);
        if (index !== -1) {
            state.articles[index] = { ...state.articles[index], ...articleData };
            alert('Makale güncellendi. "KAYDET" butonuna basmayı unutmayın.');
        }
        state.editingId = null;
    } else {
        // CREATE New
        const newArticle = {
            id: Date.now(),
            ...articleData
        };
        state.articles.unshift(newArticle);
        alert('Makale eklendi. "KAYDET" butonuna basın.');
    }
    
    e.target.reset();
    const adminApp = document.getElementById('admin-app');
    renderAdmin(adminApp);
};

window.handleDeleteArticle = (id) => {
    if (confirm('Silmek istediğinize emin misiniz?')) {
        state.articles = state.articles.filter(a => a.id !== id);
        // Also if we were editing it, cancel edit
        if(state.editingId === id) state.editingId = null;
        
        const adminApp = document.getElementById('admin-app');
        renderAdmin(adminApp);
    }
};

window.handleAddCategory = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('catName');
    const type = formData.get('catType');
    
    if (name) {
        state.categories.push({ id: Date.now(), name: name, type: type });
        const adminApp = document.getElementById('admin-app');
        renderAdmin(adminApp);
    }
};

window.handleDeleteCategory = (id) => {
    if (confirm('Kategori silinsin mi?')) {
        state.categories = state.categories.filter(c => c.id !== id);
        const adminApp = document.getElementById('admin-app');
        renderAdmin(adminApp);
    }
};

window.handleUpdateAnnouncement = (e) => {
    e.preventDefault();
    const text = document.getElementById('announcement-text').value;
    state.announcement.text = text;
    const adminApp = document.getElementById('admin-app');
    renderAdmin(adminApp);
    alert('Duyuru güncellendi. "KAYDET" butonuna basmayı unutmayın.');
};

window.toggleAnnouncementActive = () => {
    state.announcement.active = !state.announcement.active;
    const adminApp = document.getElementById('admin-app');
    renderAdmin(adminApp);
};

window.handleFileUpload = async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('file-input');
    const fileNameInput = document.getElementById('file-name');
    
    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        const fileName = fileNameInput.value || file.name;
        
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if(res.ok) {
                const result = await res.json();
                state.files.push({
                    id: Date.now(),
                    name: fileName,
                    data: result.url 
                });
                alert('Dosya yüklendi! "KAYDET" butonuna basınız.');
                const adminApp = document.getElementById('admin-app');
                renderAdmin(adminApp);
            } else {
                alert("Yükleme başarısız.");
            }
        } catch (err) {
            console.error(err);
            alert("Yükleme hatası.");
        }
    }
};

window.handleDeleteFile = (id) => {
    if(confirm("Dosya listeden kaldırılsın mı?")) {
        state.files = state.files.filter(f => f.id !== id);
        const adminApp = document.getElementById('admin-app');
        renderAdmin(adminApp);
    }
};

window.copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
        alert("URL Kopyalandı!");
    });
};

// --- EVENTS ---
document.addEventListener('DOMContentLoaded', initApp);

const menuBtn = document.getElementById('menu-btn');
if(menuBtn) menuBtn.addEventListener('click', () => toggleMenu(true));

const closeBtn = document.getElementById('sidebar-close');
if(closeBtn) closeBtn.addEventListener('click', () => toggleMenu(false));

const overlay = document.getElementById('sidebar-overlay');
if(overlay) overlay.addEventListener('click', () => toggleMenu(false));

const themeBtn = document.getElementById('theme-btn');
if(themeBtn) themeBtn.addEventListener('click', toggleTheme);