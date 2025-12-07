// --- STATE ---
let state = {
    articles: [],
    categories: [],
    announcement: {},
    files: [],
    isAuthenticated: false
};

// --- INIT APP (Load from API) ---
const initApp = async () => {
    try {
        const response = await fetch('/api/data');
        if (!response.ok) throw new Error(`Sunucu Hatası: ${response.status}`);
        const data = await response.json();
        
        state.articles = data.articles || [];
        state.categories = data.categories || [];
        state.announcement = data.announcement || {};
        state.files = data.files || [];
        
        if(sessionStorage.getItem('admin_auth') === 'true') {
            state.isAuthenticated = true;
        }

        render();
    } catch (e) {
        console.error(e);
        document.getElementById('admin-app').innerHTML = `
            <div class="flex items-center justify-center min-h-screen">
                <div class="p-8 text-center bg-red-50 border border-red-200 rounded-lg max-w-md">
                    <h2 class="text-xl font-bold text-red-700 mb-2">Sunucuya Bağlanılamadı</h2>
                    <p class="text-sm text-red-600 mb-4">Veriler yüklenirken bir sorun oluştu.</p>
                    <div class="text-xs text-gray-500 font-mono bg-white p-2 rounded border border-gray-200 mb-4 text-left overflow-auto max-h-32">
                        ${e.message}
                    </div>
                </div>
            </div>`;
    }
};

// --- DOM ELEMENT ---
const app = document.getElementById('admin-app');

// --- ACTIONS ---

window.handleLogin = (e) => {
    e.preventDefault();
    const pass = document.getElementById('admin-pass').value;
    if (pass === 'admin123') {
        state.isAuthenticated = true;
        sessionStorage.setItem('admin_auth', 'true');
        render();
    } else {
        alert('Hatalı şifre!');
    }
};

window.handleLogout = () => {
    state.isAuthenticated = false;
    sessionStorage.removeItem('admin_auth');
    render();
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
    render();
};

window.handleDeleteArticle = (id) => {
    if (confirm('Silmek istediğinize emin misiniz?')) {
        state.articles = state.articles.filter(a => a.id !== id);
        render();
    }
};

window.handleAddCategory = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('catName');
    const type = formData.get('catType');
    
    if (name) {
        state.categories.push({ id: Date.now(), name: name, type: type });
        render();
    }
};

window.handleDeleteCategory = (id) => {
    if (confirm('Kategori silinsin mi?')) {
        state.categories = state.categories.filter(c => c.id !== id);
        render();
    }
};

window.handleUpdateAnnouncement = (e) => {
    e.preventDefault();
    const text = document.getElementById('announcement-text').value;
    state.announcement.text = text;
    render();
};

window.toggleAnnouncementActive = () => {
    state.announcement.active = !state.announcement.active;
    render();
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
                render();
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
        render();
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
document.addEventListener('DOMContentLoaded', initApp);