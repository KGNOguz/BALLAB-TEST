
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Directories
const DATA_FILE = path.join(__dirname, 'data.json');
const RESOURCES_DIR = path.join(__dirname, 'resources');
const ARTICLES_DIR = path.join(__dirname, 'articles');

// --- SETUP DIRS ---
if (!fs.existsSync(RESOURCES_DIR)) fs.mkdirSync(RESOURCES_DIR, { recursive: true });
if (!fs.existsSync(ARTICLES_DIR)) fs.mkdirSync(ARTICLES_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ articles: [], categories: [], announcement: {}, files: [] }));
}

// --- MIDDLEWARE ---
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// --- API ENDPOINTS (MUST BE BEFORE STATIC SERVING) ---

// 1. Get Data
app.get('/api/data', (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) {
            console.error("Data Read Error:", err);
            // Dosya yoksa veya okunamadıysa boş yapı dön
            return res.json({ articles: [], categories: [], announcement: {}, files: [] });
        }
        try { 
            res.json(JSON.parse(data)); 
        } catch (e) { 
            res.json({ articles: [], categories: [], announcement: {}, files: [] }); 
        }
    });
});

// 2. Save Data & Generate HTML
app.post('/api/data', (req, res) => {
    const newData = req.body;
    
    // Save JSON
    fs.writeFile(DATA_FILE, JSON.stringify(newData, null, 2), (err) => {
        if (err) {
            console.error("Data Save Error:", err);
            return res.status(500).json({ error: 'Veri kaydedilemedi' });
        }
        
        // Generate HTML files
        try {
            if (newData.articles && Array.isArray(newData.articles)) {
                // Temizlik: Eski makaleleri silmek isterseniz buraya logic eklenebilir.
                // Şimdilik sadece üzerine yazıyoruz.
                newData.articles.forEach(article => {
                    const filePath = path.join(ARTICLES_DIR, `${article.id}.html`);
                    const htmlContent = generateArticleHTML(article);
                    fs.writeFileSync(filePath, htmlContent);
                });
            }
            res.json({ success: true, message: 'Veriler kaydedildi ve sayfalar oluşturuldu.' });
        } catch (genErr) {
            console.error("HTML oluşturma hatası:", genErr);
            res.status(500).json({ error: 'HTML sayfaları oluşturulurken hata.' });
        }
    });
});

// 3. Increment View Count
app.post('/api/view/:id', (req, res) => {
    const articleId = parseInt(req.params.id);
    
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).json({error: 'Read error'});
        try {
            const jsonData = JSON.parse(data);
            const article = jsonData.articles.find(a => a.id === articleId);
            
            if(article) {
                article.views = (article.views || 0) + 1;
                
                fs.writeFile(DATA_FILE, JSON.stringify(jsonData, null, 2), (wErr) => {
                    if(wErr) return res.status(500).json({error: 'Write error'});
                    res.json({success: true, views: article.views});
                });
            } else {
                res.status(404).json({error: 'Not found'});
            }
        } catch(e) {
            res.status(500).json({error: 'Parse error'});
        }
    });
});


// 4. Upload File
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, RESOURCES_DIR)
    },
    filename: function (req, file, cb) {
        // Türkçe karakter ve boşluk temizliği
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext)
            .replace(/[^a-zA-Z0-9]/g, '')
            .substring(0, 20); // Dosya adını kısalt
        const uniqueSuffix = Date.now();
        cb(null, name + '-' + uniqueSuffix + ext)
    }
})
const upload = multer({ storage: storage });

app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Dosya yüklenemedi' });
    // URL'yi /resources/dosyaadi.jpg olarak döndür
    const fileUrl = `/resources/${req.file.filename}`;
    res.json({ success: true, url: fileUrl, filename: req.file.filename });
});

// --- SERVE STATIC FILES ---
// Bu sıralama önemli. Önce özel klasörler, sonra root.
app.use('/resources', express.static(RESOURCES_DIR)); 
app.use('/articles', express.static(ARTICLES_DIR)); 
app.use(express.static(__dirname)); 

// --- HTML TEMPLATE GENERATOR ---
const generateArticleHTML = (article) => {
    // Kategorileri string array olarak güvenli hale getir
    const catBadges = Array.isArray(article.categories) 
        ? article.categories.map(c => `<span class="text-xs font-bold uppercase tracking-widest bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded text-gray-600 dark:text-gray-300">${c}</span>`).join('') 
        : '';

    return `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${article.title} - BALLAB</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                        serif: ['Merriweather', 'serif'],
                    },
                    colors: { paper: '#ffffff', ink: '#111111' }
                }
            }
        }
    </script>
    <style>
        body { -webkit-font-smoothing: antialiased; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; }
        /* Article specific styles */
        .prose p { margin-bottom: 1.5em; line-height: 1.8; }
        .prose img { border-radius: 8px; margin: 2em auto; }
        .prose h2 { font-size: 1.5em; font-weight: bold; margin-top: 2em; margin-bottom: 1em; }
    </style>
</head>
<body class="bg-paper text-ink dark:bg-gray-900 dark:text-gray-100 transition-colors duration-300 flex flex-col min-h-screen">
    
    <!-- Navbar (Static Copy for Article) -->
    <nav class="sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-20">
                <div class="flex items-center">
                     <button id="menu-btn" class="flex items-center gap-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group">
                        <svg class="group-hover:text-blue-600 transition-colors" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                        <span class="hidden md:inline text-sm font-medium text-gray-500 group-hover:text-blue-600">Menü</span>
                    </button>
                </div>
                <a href="/" class="text-3xl font-serif font-black tracking-tighter cursor-pointer select-none absolute left-1/2 transform -translate-x-1/2 flex items-center h-full pb-1">
                    BALLAB
                </a>
                <div class="flex items-center gap-4">
                     <!-- Search Box -->
                     <form onsubmit="handleSearch(event)" class="hidden md:flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-1 pl-4 border border-transparent focus-within:border-gray-300 dark:focus-within:border-gray-600 transition-all">
                        <input type="text" name="q" placeholder="Ara..." class="bg-transparent text-sm focus:outline-none w-32 focus:w-48 transition-all placeholder-gray-500 dark:placeholder-gray-400">
                        <button type="submit" class="bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 p-2 rounded-full hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </button>
                    </form>

                     <button id="theme-btn" class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 flex items-center">
                        <svg id="icon-sun" class="hidden dark:block" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                        <svg id="icon-moon" class="block dark:hidden" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                    </button>
                </div>
            </div>
        </div>
    </nav>

    <!-- Sidebar (Will be hydrated by index.js) -->
    <div id="sidebar-overlay" class="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 opacity-0 pointer-events-none transition-opacity duration-300"></div>
    <aside id="sidebar" class="fixed inset-y-0 left-0 w-80 bg-white dark:bg-gray-900 z-50 transform -translate-x-full transition-transform duration-300 shadow-2xl flex flex-col border-r border-gray-100 dark:border-gray-800">
        <div class="p-6 flex justify-between items-center border-b border-gray-100 dark:border-gray-800 h-20">
            <span class="font-serif text-xl font-bold tracking-tight">Menü</span>
            <button id="sidebar-close" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
        </div>
        <div class="p-8 flex-grow overflow-y-auto custom-scrollbar">
            <!-- Mobile Search -->
             <form onsubmit="handleSearch(event)" class="mb-8 block md:hidden">
                <div class="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-1 border border-transparent focus-within:border-gray-300 dark:focus-within:border-gray-600 transition-all">
                    <input type="text" name="q" placeholder="İçerik ara..." class="w-full bg-transparent text-sm px-4 py-2 rounded-full focus:outline-none placeholder-gray-500">
                    <button type="submit" class="bg-gray-300 dark:bg-gray-600 px-3 py-2 rounded-full hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </button>
                </div>
            </form>
            <nav class="flex flex-col gap-4 mb-10">
                <a href="/" class="text-lg font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Anasayfa</a>
                <a href="/about.html" class="text-lg font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Hakkımızda</a>
                <a href="/contact.html" class="text-lg font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors">İletişim</a>
            </nav>
            <div id="sidebar-categories" class="pt-6 border-t border-gray-100 dark:border-gray-800"></div>
        </div>
    </aside>

    <!-- Article Content -->
    <main class="flex-grow w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div class="flex justify-between items-center mb-8">
            <a href="/" class="flex items-center gap-2 text-sm text-gray-500 hover:text-ink dark:hover:text-white transition-colors">
                ← Geri Dön
            </a>
            <div class="flex gap-2">
                ${catBadges}
            </div>
        </div>
        
        <header class="text-center mb-10">
            <h1 class="text-3xl md:text-5xl font-serif font-black mb-6 leading-tight text-ink dark:text-white">
                ${article.title}
            </h1>
            <div class="flex justify-center items-center gap-4 text-sm text-gray-500">
                <span>${article.author}</span>
                <span>•</span>
                <span>${article.date}</span>
            </div>
        </header>

        <div class="mb-12">
            <img src="${article.imageUrl}" alt="${article.title}" class="w-full h-auto max-h-[500px] object-cover rounded-lg shadow-sm">
        </div>

        <div class="prose prose-lg dark:prose-invert mx-auto font-serif text-gray-800 dark:text-gray-300">
            ${article.content}
        </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-gray-100 dark:border-gray-800 py-16 mt-auto bg-white dark:bg-gray-900">
        <div class="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
            <div class="text-center md:text-left">
                <div class="font-serif text-3xl font-black mb-2 tracking-tight">BALLAB</div>
                <p class="text-gray-400 text-sm">© 2025 BALLAB. Tüm hakları saklıdır.</p>
            </div>
            <div class="text-center md:text-right">
                <div class="font-serif text-3xl font-black mb-2 tracking-tight">by CORENSAN</div>
            </div>
        </div>
    </footer>

    <!-- Script: Point to root index.js and View Counter -->
    <script src="/index.js"></script>
    <script>
        // Increment view count on load
        fetch('/api/view/${article.id}', { method: 'POST' }).catch(e => console.error(e));
    </script>
</body>
</html>
    `;
};

app.listen(PORT, () => {
    console.log(`Server çalışıyor: Port ${PORT}`);
});