
// --- STATE & INITIALIZATION ---

let state = {
    articles: [],
    categories: [],
    announcement: { text: '', active: false },
    files: [], 
    messages: [], 
    adminConfig: { password: 'admin123' }, // Default safe fallback logic handled in API init
    ads: { ad1: '', ad2: '' }, // New: Ads state
    isAuthenticated: false,
    darkMode: false, 
    menuOpen: false,
    editingId: null,
    visibleCount: 5,
    activeAdminTab: 'dashboard'
};

// --- DATA FETCHING (SHARED) ---
const initApp = async () => {
    const storedTheme = localStorage.getItem('mimos_theme');
    if (storedTheme) {
        state.darkMode = storedTheme === 'dark';
    } else {
        state.darkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
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
        state.messages = data.messages || [];
        state.adminConfig = data.adminConfig || { password: 'admin123' };
        state.ads = data.ads || { ad1: '', ad2: '' };
        
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

// --- PASTEL COLOR GENERATOR ---
window.getCategoryStyle = (name) => {
    const colors = [
        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
        'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
        'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
        'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
        'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
        'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) { sum += name.charCodeAt(i); }
    return colors[sum % colors.length];
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
                <span class="text-sm font-serif italic text-gray-800 dark:text-gray-200">${state.announcement.text}</span>
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
    } catch(e) { }
    return new Date(0);
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
    
    // Discovery: Random 4
    const discovery = [...state.articles].sort(() => 0.5 - Math.random()).slice(0, 4);
    
    const visibleArticles = displayArticles.slice(0, state.visibleCount);
    const hasMore = state.visibleCount < displayArticles.length;

    container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div class="lg:col-span-8 space-y-16">
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
                                    <span class="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded ${window.getCategoryStyle(cat)}">${cat}</span>
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

            <div class="lg:col-span-4 pl-0 lg:pl-12 lg:border-l border-gray-100 dark:border-gray-800">
                <div class="sticky top-24 space-y-12">
                    <div>
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
                        <!-- Advertisement Slot 1 -->
                        ${state.ads.ad1 ? `
                        <div class="mt-8 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                            <img src="${state.ads.ad1}" class="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity">
                        </div>` : ''}
                        
                        <!-- Advertisement Slot 2 -->
                        ${state.ads.ad2 ? `
                        <div class="mt-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                            <img src="${state.ads.ad2}" class="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity">
                        </div>` : ''}
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
            <p class="text-gray-500 mb-12 border-b border-gray-200 dark:border-gray-700 pb-4">"${query}" araması için ${results.length} sonuç bulundu.</p>
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
                                    <span class="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded ${window.getCategoryStyle(cat)}">${cat}</span>
                                `).join('')}
                            </div>
                            <a href="/articles/${article.id}.html" class="block">
                                <h3 class="text-xl md:text-2xl font-serif font-bold mb-2 leading-tight group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">${article.title}</h3>
                            </a>
                            <p class="text-gray-600 dark:text-gray-400 leading-relaxed mb-2 line-clamp-2 text-sm">${article.excerpt}</p>
                        </div>
                    </article>
                `).join('')}
            </div>
        </div>
    `;
};


// ==========================================
// ADMIN PANEL
// ==========================================

const renderAdmin = (container) => {
    if(!state.isAuthenticated) {
        container.innerHTML = renderLogin();
        return;
    }

    container.innerHTML = `
        <div class="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-900">
            <!-- Sidebar -->
            <aside class="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col z-20">
                <div class="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <span class="text-2xl font-serif font-black">Admin</span>
                </div>
                <nav class="flex-grow p-4 space-y-2 overflow-y-auto">
                    ${renderAdminSidebarButton('dashboard', 'Dashboard')}
                    ${renderAdminSidebarButton('articles', 'Makaleler')}
                    ${renderAdminSidebarButton('categories', 'Kategoriler')}
                    ${renderAdminSidebarButton('files', 'Dosyalar')}
                    ${renderAdminSidebarButton('messages', 'Mesaj Kutusu')}
                    ${renderAdminSidebarButton('settings', 'Ayarlar')}
                </nav>
                <div class="p-4 border-t border-gray-200 dark:border-gray-700">
                    <button onclick="saveChanges()" class="w-full mb-2 px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded font-bold text-sm">KAYDET</button>
                    <button onclick="handleLogout()" class="w-full px-4 py-2 border border-red-200 text-red-500 rounded text-sm hover:bg-red-50">Çıkış</button>
                </div>
            </aside>

            <!-- Main Content -->
            <main class="flex-1 overflow-auto p-8 relative">
                <div class="max-w-5xl mx-auto">
                    ${renderAdminContent()}
                </div>
            </main>
        </div>
    `;
};

const renderAdminSidebarButton = (tab, label) => {
    const isActive = state.activeAdminTab === tab;
    return `
        <button onclick="switchAdminTab('${tab}')" 
            class="w-full text-left px-4 py-3 rounded transition-colors ${isActive ? 'bg-gray-100 dark:bg-gray-700 font-bold border-l-4 border-blue-500' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}">
            ${label}
        </button>
    `;
};

window.switchAdminTab = (tab) => {
    state.activeAdminTab = tab;
    if (tab !== 'articles') state.editingId = null; 
    const adminApp = document.getElementById('admin-app');
    renderAdmin(adminApp);
};

const renderAdminContent = () => {
    switch(state.activeAdminTab) {
        case 'dashboard': return renderDashboardView();
        case 'articles': return renderArticlesView();
        case 'categories': return renderCategoriesView();
        case 'files': return renderFilesView();
        case 'messages': return renderMessagesView();
        case 'settings': return renderSettingsView();
        default: return renderDashboardView();
    }
};

const renderDashboardView = () => `
    <h1 class="text-3xl font-serif font-bold mb-8">Genel Bakış</h1>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 class="text-gray-500 text-sm font-bold uppercase mb-2">Toplam Makale</h3>
            <p class="text-4xl font-black">${state.articles.length}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 class="text-gray-500 text-sm font-bold uppercase mb-2">Toplam Okunma</h3>
            <p class="text-4xl font-black">${state.articles.reduce((acc, curr) => acc + (curr.views || 0), 0)}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 class="text-gray-500 text-sm font-bold uppercase mb-2">Dosyalar</h3>
            <p class="text-4xl font-black">${state.files.length}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 class="text-gray-500 text-sm font-bold uppercase mb-2">Mesajlar</h3>
            <p class="text-4xl font-black">${state.messages.length}</p>
        </div>
    </div>
    <div class="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-900 text-blue-800 dark:text-blue-200">
        <p class="font-bold">Unutmayın!</p>
        <p class="text-sm mt-1">Yapılan tüm değişikliklerin canlıya alınması için sol menüden <span class="font-bold">KAYDET</span> butonuna basmanız gerekmektedir.</p>
    </div>
`;

const renderArticlesView = () => {
    let editArticle = null;
    if (state.editingId) editArticle = state.articles.find(a => a.id === state.editingId);

    return `
    <h1 class="text-3xl font-serif font-bold mb-8">Makale Yönetimi</h1>
    <div class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-12 relative">
        ${state.editingId ? `<div class="absolute top-4 right-4 bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">DÜZENLEME MODU</div>` : ''}
        <h2 class="text-xl font-bold mb-6">${state.editingId ? 'Makaleyi Düzenle' : 'Yeni Makale Oluştur'}</h2>
        
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
            <textarea name="content" required rows="10" placeholder="İçerik (HTML)" class="w-full p-4 bg-gray-50 dark:bg-gray-900 border rounded font-mono text-sm">${editArticle ? editArticle.content : ''}</textarea>
            
            <div class="flex gap-4">
                <button class="flex-1 bg-black text-white dark:bg-white dark:text-black py-4 rounded font-bold uppercase hover:opacity-90">
                    ${state.editingId ? 'GÜNCELLE' : 'LİSTEYE EKLE'}
                </button>
                ${state.editingId ? `<button type="button" onclick="cancelEdit()" class="px-6 border border-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700">Vazgeç</button>` : ''}
            </div>
        </form>
    </div>

    <div class="space-y-4">
        ${state.articles.map(article => `
            <div class="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 hover:shadow-md transition">
                <div>
                    <h3 class="font-bold text-lg">${article.title}</h3>
                    <div class="text-xs text-gray-500 mt-1">${article.date} • ${article.author} • ${article.views || 0} Görüntülenme</div>
                </div>
                <div class="flex gap-2">
                    <button onclick="handleEditArticle(${article.id})" class="text-xs bg-blue-100 text-blue-600 px-3 py-2 rounded font-bold hover:bg-blue-200">Düzenle</button>
                    <button onclick="handleDeleteArticle(${article.id})" class="text-xs bg-red-100 text-red-600 px-3 py-2 rounded font-bold hover:bg-red-200">Sil</button>
                </div>
            </div>
        `).join('')}
    </div>
    `;
};

const renderCategoriesView = () => `
    <h1 class="text-3xl font-serif font-bold mb-8">Kategori Yönetimi</h1>
    <div class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
        <form onsubmit="handleAddCategory(event)" class="flex gap-4 items-end">
            <div class="flex-grow">
                 <label class="block text-xs font-bold text-gray-500 mb-1">Kategori Adı</label>
                 <input name="catName" required class="w-full p-2 bg-gray-50 dark:bg-gray-900 border rounded">
            </div>
            <div class="w-1/3">
                 <label class="block text-xs font-bold text-gray-500 mb-1">Tip</label>
                 <select name="catType" class="w-full p-2 bg-gray-50 dark:bg-gray-900 border rounded">
                    <option value="main">Ana Kategori</option>
                    <option value="sub">Alt Kategori</option>
                    <option value="year">Yıl</option>
                </select>
            </div>
            <button class="px-6 py-2 bg-blue-600 text-white rounded font-bold h-10">EKLE</button>
        </form>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${state.categories.map(c => `
            <div class="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded border border-gray-100 dark:border-gray-700">
                <div>
                    <span class="font-bold block">${c.name}</span>
                    <span class="text-xs text-gray-400 uppercase">${c.type === 'main' ? 'Ana Kategori' : c.type}</span>
                </div>
                <button onclick="handleDeleteCategory(${c.id})" class="text-red-400 font-bold px-2 py-1 hover:bg-red-50 rounded">SİL</button>
            </div>
        `).join('')}
    </div>
`;

const renderFilesView = () => `
    <h1 class="text-3xl font-serif font-bold mb-8">Dosya Yönetimi</h1>
    <div class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
         <form onsubmit="handleFileUpload(event)" class="flex gap-4 items-end">
            <div class="flex-grow">
                <label class="block text-xs font-bold text-gray-500 mb-1">Dosya Adı (Opsiyonel)</label>
                <input type="text" id="file-name" class="w-full p-2 text-sm border rounded bg-white dark:bg-gray-900">
            </div>
            <div class="flex-grow">
                <label class="block text-xs font-bold text-gray-500 mb-1">Dosya Seç</label>
                <input type="file" id="file-input" accept="image/*" class="w-full text-xs">
            </div>
            <button class="px-6 py-2 bg-blue-600 text-white rounded text-sm font-bold h-10">YÜKLE</button>
        </form>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
        ${state.files.map(f => `
            <div class="p-3 bg-white dark:bg-gray-800 rounded border border-gray-100 dark:border-gray-700 group relative">
                <div class="aspect-square bg-gray-100 mb-2 rounded overflow-hidden">
                    <img src="${f.data}" class="w-full h-full object-cover">
                </div>
                <div class="text-xs font-bold truncate mb-2">${f.name}</div>
                <div class="flex flex-col gap-1">
                    <button onclick="copyToClipboard('${f.data}')" class="w-full py-1 bg-gray-100 dark:bg-gray-700 text-[10px] font-bold rounded hover:bg-gray-200">URL KOPYALA</button>
                    <button onclick="handleDeleteFile(${f.id})" class="w-full py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded hover:bg-red-100">SİL</button>
                </div>
            </div>
        `).join('')}
    </div>
`;

const renderMessagesView = () => `
    <h1 class="text-3xl font-serif font-bold mb-8">Mesaj Kutusu</h1>
    <div class="space-y-4">
        ${state.messages.length === 0 ? '<p class="text-gray-500">Henüz mesaj yok.</p>' : state.messages.map(m => `
            <details class="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 group">
                <summary class="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition list-none">
                    <div class="flex items-center gap-4">
                        <div class="w-2 h-2 rounded-full bg-blue-500"></div>
                        <div>
                            <div class="font-bold text-lg">${m.subject || 'Konusuz'}</div>
                            <div class="text-xs text-gray-500">${m.name} &bull; ${m.date}</div>
                        </div>
                    </div>
                    <svg class="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                </summary>
                <div class="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <div class="mb-4 text-sm">
                        <span class="font-bold text-gray-500 block text-xs uppercase mb-1">Gönderen</span>
                        ${m.name} <a href="mailto:${m.email}" class="text-blue-500 hover:underline">&lt;${m.email}&gt;</a>
                    </div>
                    <div class="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">${m.message}</div>
                    <div class="mt-6 flex justify-end">
                        <button onclick="handleDeleteMessage(${m.id})" class="text-xs text-red-500 hover:bg-red-50 px-3 py-2 rounded">Mesajı Sil</button>
                    </div>
                </div>
            </details>
        `).join('')}
    </div>
`;

const renderSettingsView = () => `
    <h1 class="text-3xl font-serif font-bold mb-8">Ayarlar & Duyurular</h1>
    <div class="space-y-8 max-w-2xl">
        <!-- Announcement Config -->
        <div class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 class="text-lg font-serif font-bold mb-4">Site Üstü Duyuru Bandı</h2>
            <form onsubmit="handleUpdateAnnouncement(event)" class="flex flex-col gap-4">
                <input id="announcement-text" value="${state.announcement.text || ''}" class="w-full p-4 bg-gray-50 dark:bg-gray-900 border rounded" placeholder="Duyuru metnini buraya yazın...">
                <div class="flex gap-4">
                    <button type="button" onclick="toggleAnnouncementActive()" class="flex-1 py-3 border rounded font-bold ${state.announcement.active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-500'}">
                        ${state.announcement.active ? 'DURUM: AKTİF' : 'DURUM: PASİF'}
                    </button>
                    <button class="flex-1 py-3 bg-black text-white dark:bg-white dark:text-black rounded font-bold">METNİ GÜNCELLE</button>
                </div>
            </form>
        </div>

        <!-- Password Change -->
        <div class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 class="text-lg font-serif font-bold mb-4">Admin Şifre Değişikliği</h2>
            <form onsubmit="handleUpdatePassword(event)" class="flex flex-col gap-4">
                <input name="newPassword" type="text" placeholder="Yeni Şifre" class="w-full p-4 bg-gray-50 dark:bg-gray-900 border rounded outline-none" required minlength="4">
                <button class="w-full py-3 bg-red-600 text-white rounded font-bold hover:bg-red-700 transition">ŞİFREYİ GÜNCELLE</button>
            </form>
        </div>

        <!-- Ad Management -->
        <div class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 class="text-lg font-serif font-bold mb-4">Reklam Yönetimi</h2>
            <div class="space-y-6">
                <!-- AD 1 -->
                <div class="p-4 bg-gray-50 dark:bg-gray-900 rounded border">
                    <label class="block text-xs font-bold mb-2 uppercase text-gray-500">Reklam 1 (Üst)</label>
                    <div class="flex gap-4 items-start mb-2">
                        ${state.ads.ad1 ? `<img src="${state.ads.ad1}" class="w-20 h-20 object-cover rounded bg-white">` : '<div class="w-20 h-20 bg-gray-200 rounded"></div>'}
                        <div class="flex-grow space-y-2">
                            <input id="ad1-url" value="${state.ads.ad1}" placeholder="Görsel URL'si yapıştırın veya dosya seçin" class="w-full p-2 text-sm border rounded">
                            <div class="flex gap-2">
                                <input type="file" id="ad1-file" onchange="handleAdFileUpload(event, 'ad1')" class="text-xs">
                                <button onclick="updateAdUrl('ad1')" class="px-3 py-1 bg-blue-600 text-white text-xs rounded font-bold">GÜNCELLE</button>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- AD 2 -->
                <div class="p-4 bg-gray-50 dark:bg-gray-900 rounded border">
                    <label class="block text-xs font-bold mb-2 uppercase text-gray-500">Reklam 2 (Alt)</label>
                    <div class="flex gap-4 items-start mb-2">
                        ${state.ads.ad2 ? `<img src="${state.ads.ad2}" class="w-20 h-20 object-cover rounded bg-white">` : '<div class="w-20 h-20 bg-gray-200 rounded"></div>'}
                        <div class="flex-grow space-y-2">
                            <input id="ad2-url" value="${state.ads.ad2}" placeholder="Görsel URL'si yapıştırın veya dosya seçin" class="w-full p-2 text-sm border rounded">
                            <div class="flex gap-2">
                                <input type="file" id="ad2-file" onchange="handleAdFileUpload(event, 'ad2')" class="text-xs">
                                <button onclick="updateAdUrl('ad2')" class="px-3 py-1 bg-blue-600 text-white text-xs rounded font-bold">GÜNCELLE</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
`;

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

// --- HANDLERS (ADMIN) ---

window.handleLogin = (e) => {
    e.preventDefault();
    const pass = document.getElementById('admin-pass').value;
    // Check against config loaded from server
    if (pass === state.adminConfig.password) {
        state.isAuthenticated = true;
        sessionStorage.setItem('admin_auth', 'true');
        renderAdmin(document.getElementById('admin-app'));
    } else { alert('Hatalı şifre!'); }
};

window.handleLogout = () => {
    state.isAuthenticated = false;
    sessionStorage.removeItem('admin_auth');
    renderAdmin(document.getElementById('admin-app'));
};

window.saveChanges = async () => {
    const exportData = { 
        articles: state.articles, 
        categories: state.categories, 
        announcement: state.announcement, 
        files: state.files, 
        messages: state.messages,
        adminConfig: state.adminConfig, // Save password
        ads: state.ads // Save ads
    };
    try {
        const response = await fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(exportData) });
        if (response.ok) alert("Değişiklikler kaydedildi!");
        else alert("Hata: Kaydedilemedi.");
    } catch (error) { alert("Sunucu iletişim hatası."); }
};

// ... (Article Handlers same as before) ...
window.handleEditArticle = (id) => { state.editingId = id; state.activeAdminTab = 'articles'; renderAdmin(document.getElementById('admin-app')); };
window.cancelEdit = () => { state.editingId = null; renderAdmin(document.getElementById('admin-app')); };
window.handleAddArticle = (e) => { /* Same as previous logic */ 
    e.preventDefault();
    const formData = new FormData(e.target);
    const selectedCategories = [];
    document.querySelectorAll('input[name="categories"]:checked').forEach((checkbox) => selectedCategories.push(checkbox.value));
    if (selectedCategories.length === 0) { alert("Kategori seçiniz."); return; }
    let articleDateStr = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    const dateInput = formData.get('dateInput');
    if (dateInput) { const d = new Date(dateInput); articleDateStr = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }); } 
    else if (state.editingId) { const old = state.articles.find(a => a.id === state.editingId); if(old) articleDateStr = old.date; }
    const articleData = { title: formData.get('title'), author: formData.get('author'), categories: selectedCategories, imageUrl: formData.get('imageUrl'), content: formData.get('content'), excerpt: formData.get('content').replace(/<[^>]*>?/gm, '').substring(0, 100) + '...', date: articleDateStr, views: state.editingId ? (state.articles.find(a => a.id === state.editingId)?.views || 0) : 0 };
    if (state.editingId) { const index = state.articles.findIndex(a => a.id === state.editingId); if (index !== -1) { state.articles[index] = { ...state.articles[index], ...articleData }; alert('Güncellendi. "KAYDET" butonuna basınız.'); } state.editingId = null; } else { state.articles.unshift({ id: Date.now(), ...articleData }); alert('Eklendi. "KAYDET" butonuna basınız.'); }
    renderAdmin(document.getElementById('admin-app'));
};
window.handleDeleteArticle = (id) => { if (confirm('Silinecek?')) { state.articles = state.articles.filter(a => a.id !== id); if(state.editingId === id) state.editingId = null; renderAdmin(document.getElementById('admin-app')); } };
window.handleAddCategory = (e) => { e.preventDefault(); const formData = new FormData(e.target); const name = formData.get('catName'); if (name) { state.categories.push({ id: Date.now(), name: name, type: formData.get('catType') }); renderAdmin(document.getElementById('admin-app')); } };
window.handleDeleteCategory = (id) => { if (confirm('Silinecek?')) { state.categories = state.categories.filter(c => c.id !== id); renderAdmin(document.getElementById('admin-app')); } };
window.handleUpdateAnnouncement = (e) => { e.preventDefault(); state.announcement.text = document.getElementById('announcement-text').value; renderAdmin(document.getElementById('admin-app')); alert('Güncellendi. Kaydetmeyi unutmayın.'); };
window.toggleAnnouncementActive = () => { state.announcement.active = !state.announcement.active; renderAdmin(document.getElementById('admin-app')); };
window.handleFileUpload = async (e) => { e.preventDefault(); const fileInput = document.getElementById('file-input'); const fileNameInput = document.getElementById('file-name'); if (fileInput.files && fileInput.files[0]) { const formData = new FormData(); formData.append('file', fileInput.files[0]); try { const res = await fetch('/api/upload', { method: 'POST', body: formData }); if(res.ok) { const result = await res.json(); state.files.push({ id: Date.now(), name: fileNameInput.value || fileInput.files[0].name, data: result.url }); alert('Yüklendi! Kaydedin.'); renderAdmin(document.getElementById('admin-app')); } else alert("Hata."); } catch (err) { alert("Hata."); } } };
window.handleDeleteFile = (id) => { if(confirm("Silinecek?")) { state.files = state.files.filter(f => f.id !== id); renderAdmin(document.getElementById('admin-app')); } };
window.copyToClipboard = (text) => navigator.clipboard.writeText(text).then(() => alert("URL Kopyalandı!"));
window.handleDeleteMessage = (id) => { if(confirm("Mesaj silinsin mi?")) { state.messages = state.messages.filter(m => m.id !== id); renderAdmin(document.getElementById('admin-app')); alert("Mesaj kaldırıldı. Değişikliği kalıcı yapmak için 'KAYDET' butonuna basın."); } };
window.handleSendMessage = async (e) => { e.preventDefault(); const formData = new FormData(e.target); const messageData = { name: formData.get('name'), email: formData.get('email'), subject: formData.get('subject'), message: formData.get('message') }; try { const res = await fetch('/api/contact', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(messageData) }); if(res.ok) { alert("Mesajınız iletildi! Teşekkürler."); e.target.reset(); } else { alert("Bir hata oluştu."); } } catch(err) { alert("Bağlantı hatası."); } };

// --- NEW HANDLERS FOR SETTINGS ---

window.handleUpdatePassword = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newPass = formData.get('newPassword');
    if(newPass && newPass.length >= 4) {
        state.adminConfig.password = newPass;
        alert("Şifre güncellendi. Lütfen 'KAYDET' butonuna basarak değişiklikleri sunucuya yazın.");
        renderAdmin(document.getElementById('admin-app'));
    } else {
        alert("Şifre en az 4 karakter olmalıdır.");
    }
};

window.handleAdFileUpload = async (e, adKey) => {
    const file = e.target.files[0];
    if(!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if(res.ok) {
            const result = await res.json();
            // Automatically update input and state
            state.ads[adKey] = result.url;
            renderAdmin(document.getElementById('admin-app'));
        } else alert("Yükleme hatası");
    } catch(err) { alert("Hata"); }
};

window.updateAdUrl = (adKey) => {
    const url = document.getElementById(adKey + '-url').value;
    state.ads[adKey] = url;
    renderAdmin(document.getElementById('admin-app'));
    alert("Reklam URL güncellendi. 'KAYDET' yapmayı unutmayın.");
};

// --- EVENTS ---
document.addEventListener('DOMContentLoaded', initApp);
const menuBtn = document.getElementById('menu-btn'); if(menuBtn) menuBtn.addEventListener('click', () => toggleMenu(true));
const closeBtn = document.getElementById('sidebar-close'); if(closeBtn) closeBtn.addEventListener('click', () => toggleMenu(false));
const overlay = document.getElementById('sidebar-overlay'); if(overlay) overlay.addEventListener('click', () => toggleMenu(false));
const themeBtn = document.getElementById('theme-btn'); if(themeBtn) themeBtn.addEventListener('click', toggleTheme);