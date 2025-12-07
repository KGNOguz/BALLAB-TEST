// --- STATE & INITIALIZATION ---

let state = {
    articles: [],
    categories: [],
    announcement: { text: '', active: false },
    files: [], // Admin specific
    isAuthenticated: false, // Admin specific
    darkMode: localStorage.getItem('mimos_theme') === 'dark',
    menuOpen: false
};

// --- DATA FETCHING (SHARED) ---
const initApp = async () => {
    try {
        const response = await fetch('/api/data');
        if (!response.ok) throw new Error(`HTTP Hata: ${response.status}`);
        
        const data = await response.json();
        
        state.articles = data.articles || [];
        state.categories = data.categories || [];
        state.announcement = data.announcement || { text: '', active: false };
        state.files = data.files || [];
        
        // --- ROUTING LOGIC ---
        const adminApp = document.getElementById('admin-app');
        const publicApp = document.getElementById('app'); // Home
        const searchApp = document.getElementById('search-results'); // Search Page

        if (adminApp) {
            // Admin Page
            if(sessionStorage.getItem('admin_auth') === 'true') {
                state.isAuthenticated = true;
            }
            renderAdmin();
        } else {
            // Public Pages
            renderGlobalUI();
            
            if (searchApp) {
                renderSearch(searchApp);
            } else if (publicApp) {
                renderHome(publicApp);
            }
        }
        
    } catch (error) {
        console.error("Veri yükleme hatası:", error);
        const adminApp = document.getElementById('admin-app');
        if(adminApp) {
             adminApp.innerHTML = `
            <div class="flex items-center justify-center min-h-screen">
                <div class="p-8 text-center bg-red-50 border border-red-200 rounded-lg max-w-md">
                    <h2 class="text-xl font-bold text-red-700 mb-2">Sunucuya Bağlanılamadı</h2>
                    <p class="text-sm text-red-600">Lütfen internet bağlantınızı kontrol edin.</p>
                </div>
            </div>`;
        }
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
// Initialize Theme
if (state.darkMode) document.documentElement.classList.add('dark');


// ==========================================
// PUBLIC SITE LOGIC
// ==========================================

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
    
    if (!state.announcement.active) {
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

const renderHome = (container) => {
    // Check URL params for filtering
    const urlParams = new URLSearchParams(window.location.search);
    const categoryFilter = urlParams.get('category');
    const yearFilter = urlParams.get('year');

    let displayArticles = state.articles;
    let pageTitle = "Popüler İçerikler";

    if (categoryFilter) {
        displayArticles = state.articles.filter(a => a.categories.includes(categoryFilter));
        pageTitle = `Kategori: ${categoryFilter}`;
    } else if (yearFilter) {
        displayArticles = state.articles.filter(a => a.date.includes(yearFilter)); // Simple string check for year in date
        pageTitle = `Arşiv: ${yearFilter}`;
    }

    const popular = [...displayArticles].sort((a, b) => b.views - a.views);
    
    // Discovery section (always random from all articles)
    const topIds = popular.slice(0, 3).map(a => a.id);
    const others = state.articles.filter(a => !topIds.includes(a.id));
    const discovery = others.sort(() => 0.5 - Math.random()).slice(0, 5);

    container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <!-- Main Column -->
            <div class="lg:col-span-8 space-y-16">
                 <div class="flex items-baseline justify-between border-b border-gray-200 dark:border-gray-800 pb-4 mb-8">
                    <h2 class="text-2xl font-serif font-bold">${pageTitle}</h2>
                    ${(categoryFilter || yearFilter) ? `<a href="/" class="text-sm text-blue-500 hover:underline">Tümünü Göster</a>` : ''}
                 </div>
                
                ${popular.length === 0 ? '<p class="text-gray-500 italic">Bu kriterlere uygun içerik bulunamadı.</p>' : popular.map((article) => `
                    <article class="group cursor-pointer grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                        <div class="md:col-span-5 order-2 md:order-1 overflow-hidden rounded-md">
                            <a href="/articles/${article.id}.html">
                                <img src="${article.imageUrl}" alt="${article.title}" class="w-full h-64 md:h-56 object-cover transform group-hover:scale-105 transition-transform duration-700 grayscale-[20%] group-hover:grayscale-0">
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
                            <div class="text-xs text-gray-400 font-medium">
                                ${article.author} &bull; ${article.date}
                            </div>
                        </div>
                    </article>
                `).join('')}
            </div>

            <!-- Side Column: Discover -->
            <div class="lg:col-span-4 pl-0 lg:pl-12 lg:border-l border-gray-100 dark:border-gray-800">
                <div class="sticky top-24 space-y-12">
                    <div>
                        <h2 class="text-lg font-serif font-bold mb-6 border-b border-gray-200 dark:border-gray-800 pb-2">
                            Yeni Şeyler Keşfet
                        </h2>
                        <div class="space-y-8">
                            ${discovery.map(article => `
                                <a href="/articles/${article.id}.html" class="group flex gap-4 items-start">
                                    <div class="w-20 h-20 shrink-0 overflow-hidden rounded bg-gray-100">
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

const renderSearch = (container) => {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q') || '';
    
    if(!query) {
        container.innerHTML = '<p class="text-center py-12">Arama terimi bulunamadı.</p>';
        return;
    }

    // Filter Logic: Check title, content, author, categories
    const lowerQuery = query.toLowerCase();
    const results = state.articles.filter(a => 
        a.title.toLowerCase().includes(lowerQuery) || 
        a.excerpt.toLowerCase().includes(lowerQuery) ||
        a.author.toLowerCase().includes(lowerQuery) ||
        a.categories.some(c => c.toLowerCase().includes(lowerQuery))
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

window.closeAnnouncement = () => {
    state.announcement.active = false;
    renderAnnouncement();
};


// ==========================================
// ADMIN PANEL LOGIC (Merged)
// ==========================================

const renderAdmin = () => {
    const app = document.getElementById('admin-app');
    if(state.isAuthenticated) {
        app.innerHTML = renderDashboard();
    } else {
        app.innerHTML = renderLogin();
    }
};

window.handleLogin = (e) => {
    e.preventDefault();
    const pass = document.getElementById('admin-pass').value;
    if (pass === 'admin123') {
        state.isAuthenticated = true;
        sessionStorage.setItem('admin_auth', 'true');
        renderAdmin();
    } else {
        alert('Hatalı şifre!');
    }
};

window.handleLogout = () => {
    state.isAuthenticated = false;
    sessionStorage.removeItem('admin_auth');
    renderAdmin();
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

    const newArticle = {
        id: Date.now(),
        title: formData.get('title'),
        author: formData.get('author'),
        categories: selectedCategories,
        imageUrl: formData.get('imageUrl'),
        content: formData.get('content'),
        excerpt: formData.get('content').replace(/<[^>]*>?/gm, '').substring(0, 100) + '...',
        date: new Date().toLocaleDateString('tr-TR'),
        views: 0
    };
    
    state.articles.unshift(newArticle);
    alert('Makale eklendi. "KAYDET" butonuna basın.');
    e.target.reset();
    renderAdmin();
};

window.handleDeleteArticle = (id) => {
    if (confirm('Silmek istediğinize emin misiniz?')) {
        state.articles = state.articles.filter(a => a.id !== id);
        renderAdmin();
    }
};

window.handleAddCategory = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('catName');
    const type = formData.get('catType');
    
    if (name) {
        state.categories.push({ id: Date.now(), name: name, type: type });
        renderAdmin();
    }
};

window.handleDeleteCategory = (id) => {
    if (confirm('Kategori silinsin mi?')) {
        state.categories = state.categories.filter(c => c.id !== id);
        renderAdmin();
    }
};

window.handleUpdateAnnouncement = (e) => {
    e.preventDefault();
    const text = document.getElementById('announcement-text').value;
    state.announcement.text = text;
    renderAdmin();
};

window.toggleAnnouncementActive = () => {
    state.announcement.active = !state.announcement.active;
    renderAdmin();
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
                renderAdmin();
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
        renderAdmin();
    }
};

window.copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
        alert("URL Kopyalandı!");
    });
};

const renderLogin = () => `
    <div class="flex items-center justify-center min-h-screen bg-paper dark:bg-gray-900">
        <form onsubmit="handleLogin(event)" class="w-full max-w-md p-10 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700">
            <div class="text-center mb-8">
                <h2 class="text-3xl font-serif font-bold mb-2">Yönetici Paneli</h2>
            </div>
            <div class="mb-6">
                <input type="password" id="admin-pass" class="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none" placeholder="Şifre">
            </div>
            <button type="submit" class="w-full bg-ink text-paper dark:bg-white dark:text-black py-4 rounded-lg font-bold">GİRİŞ YAP</button>
        </form>
    </div>
`;

const renderDashboard = () => `
    <div class="max-w-7xl mx-auto py-8">
        <header class="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-gray-200 dark:border-gray-700 pb-6 gap-4">
            <div>
                <h1 class="text-4xl font-serif font-bold mb-2">Admin Paneli</h1>
                <p class="text-gray-500">Düzenlemeleri yaptıktan sonra <span class="font-bold">KAYDET</span> butonuna basın.</p>
            </div>
            <div class="flex gap-4">
                 <button onclick="saveChanges()" class="px-6 py-3 bg-black text-white dark:bg-white dark:text-black rounded font-bold">DEĞİŞİKLİKLERİ KAYDET</button>
                 <button onclick="handleLogout()" class="px-4 py-3 border border-red-200 text-red-500 rounded">Çıkış</button>
            </div>
        </header>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div class="lg:col-span-2 space-y-12">
                <div class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h2 class="text-2xl font-serif font-bold mb-6">Makale Oluştur</h2>
                    <form onsubmit="handleAddArticle(event)" class="space-y-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <input name="title" required placeholder="Başlık" class="w-full p-3 bg-gray-50 dark:bg-gray-900 border rounded">
                            <input name="author" required placeholder="Yazar" class="w-full p-3 bg-gray-50 dark:bg-gray-900 border rounded">
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="h-32 overflow-y-auto custom-scrollbar p-3 border rounded bg-gray-50 dark:bg-gray-900">
                                ${state.categories.map(c => `
                                    <label class="flex items-center space-x-2 mb-2 cursor-pointer">
                                        <input type="checkbox" name="categories" value="${c.name}" class="rounded">
                                        <span class="text-sm">${c.name}</span>
                                    </label>
                                `).join('')}
                            </div>
                            <input name="imageUrl" placeholder="Kapak Görseli URL" class="w-full p-3 bg-gray-50 dark:bg-gray-900 border rounded">
                        </div>
                        <textarea name="content" required rows="6" placeholder="İçerik (HTML)" class="w-full p-4 bg-gray-50 dark:bg-gray-900 border rounded font-mono text-sm"></textarea>
                        <button class="w-full bg-black text-white dark:bg-white dark:text-black py-4 rounded font-bold">LİSTEYE EKLE</button>
                    </form>
                </div>

                 <div class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h2 class="text-xl font-serif font-bold mb-6">Mevcut Makaleler</h2>
                    <div class="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                        ${state.articles.map(article => `
                            <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                <div>
                                    <h3 class="font-bold text-lg">${article.title}</h3>
                                    <div class="text-xs text-gray-500 mt-1">${article.date} • ${article.author}</div>
                                </div>
                                <button onclick="handleDeleteArticle(${article.id})" class="text-xs bg-red-100 text-red-600 px-3 py-2 rounded">Sil</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="lg:col-span-1 space-y-8">
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

                <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h2 class="text-lg font-serif font-bold mb-4">Dosyalar (Resources)</h2>
                    <form onsubmit="handleFileUpload(event)" class="space-y-3 mb-4">
                        <input type="text" id="file-name" placeholder="İsim (Opsiyonel)" class="w-full p-2 text-sm bg-gray-50 dark:bg-gray-900 border rounded">
                        <input type="file" id="file-input" accept="image/*" class="w-full text-xs">
                        <button class="w-full py-2 bg-blue-600 text-white rounded text-sm font-bold">YÜKLE</button>
                    </form>
                    <div class="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                        ${state.files.map(f => `
                            <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded border">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-xs font-bold truncate w-24">${f.name}</span>
                                    <button onclick="handleDeleteFile(${f.id})" class="text-xs text-red-500">Sil</button>
                                </div>
                                <img src="${f.data}" class="w-full h-24 object-cover rounded mb-2 bg-gray-200">
                                <button onclick="copyToClipboard('${f.data}')" class="w-full py-1 bg-gray-200 dark:bg-gray-700 text-[10px] font-bold rounded">URL Kopyala</button>
                            </div>
                        `).join('')}
                    </div>
                </div>

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
        </div>
    </div>
`;


// --- EVENTS ---
document.addEventListener('DOMContentLoaded', initApp);

// Public Events
const menuBtn = document.getElementById('menu-btn');
if(menuBtn) menuBtn.addEventListener('click', () => toggleMenu(true));

const closeBtn = document.getElementById('sidebar-close');
if(closeBtn) closeBtn.addEventListener('click', () => toggleMenu(false));

const overlay = document.getElementById('sidebar-overlay');
if(overlay) overlay.addEventListener('click', () => toggleMenu(false));

const themeBtn = document.getElementById('theme-btn');
if(themeBtn) themeBtn.addEventListener('click', toggleTheme);