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
if (!fs.existsSync(RESOURCES_DIR)) fs.mkdirSync(RESOURCES_DIR);
if (!fs.existsSync(ARTICLES_DIR)) fs.mkdirSync(ARTICLES_DIR);
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ articles: [], categories: [], announcement: {}, files: [] }));
}

// --- MIDDLEWARE ---
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// --- API ENDPOINTS (MUST BE BEFORE STATIC SERVING) ---

app.get('/api/data', (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) {
            console.error("Data Read Error:", err);
            return res.status(500).json({ error: 'Veri okunamadı' });
        }
        try { res.json(JSON.parse(data)); } catch (e) { res.json({}); }
    });
});

// SAVE DATA & GENERATE HTML FILES
app.post('/api/data', (req, res) => {
    const newData = req.body;
    
    // 1. Save JSON
    fs.writeFile(DATA_FILE, JSON.stringify(newData, null, 2), (err) => {
        if (err) {
            console.error("Data Save Error:", err);
            return res.status(500).json({ error: 'Veri kaydedilemedi' });
        }
        
        // 2. Generate HTML files for each article
        try {
            if (newData.articles && Array.isArray(newData.articles)) {
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

// --- STORAGE CONFIG (MULTER) ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, RESOURCES_DIR)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '');
        cb(null, name + '-' + uniqueSuffix + ext)
    }
})
const upload = multer({ storage: storage });

app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Dosya yüklenemedi' });
    const fileUrl = `/resources/${req.file.filename}`;
    res.json({ success: true, url: fileUrl, filename: req.file.filename });
});

// --- SERVE STATIC FILES ---
app.use('/resources', express.static(RESOURCES_DIR)); 
app.use('/articles', express.static(ARTICLES_DIR)); 
app.use(express.static(__dirname)); 

// --- HTML TEMPLATE GENERATOR ---
const generateArticleHTML = (article) => {
    return `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${article.title} - MIMOS Dergi</title>
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
    </style>
</head>
<body class="bg-paper text-ink dark:bg-gray-900 dark:text-gray-100 transition-colors duration-300 flex flex-col min-h-screen">
    
    <!-- Navbar (Static Copy) -->
    <nav class="sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-20">
                <div class="flex items-center">
                     <button id="menu-btn" class="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group">
                        <svg class="group-hover:text-blue-600 transition-colors" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                        <span class="hidden md:inline text-sm font-medium text-gray-500 group-hover:text-blue-600">Menü</span>
                    </button>
                </div>
                <a href="/" class="text-3xl font-serif font-black tracking-tighter cursor-pointer select-none absolute left-1/2 transform -translate-x-1/2">
                    DERGİ.
                </a>
                <div class="flex items-center">
                     <button id="theme-btn" class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500">
                        <svg id="icon-sun" class="hidden dark:block" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                        <svg id="icon-moon" class="block dark:hidden" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                    </button>
                </div>
            </div>
        </div>
    </nav>

    <!-- Sidebar Overlay & Drawer -->
    <div id="sidebar-overlay" class="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 opacity-0 pointer-events-none transition-opacity duration-300"></div>
    <aside id="sidebar" class="fixed inset-y-0 left-0 w-80 bg-white dark:bg-gray-900 z-50 transform -translate-x-full transition-transform duration-300 shadow-2xl flex flex-col border-r border-gray-100 dark:border-gray-800">
        <div class="p-6 flex justify-between items-center border-b border-gray-100 dark:border-gray-800 h-20">
            <span class="font-serif text-xl font-bold tracking-tight">Menü</span>
            <button id="sidebar-close" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
        <div class="p-8 flex-grow overflow-y-auto custom-scrollbar">
            <nav class="flex flex-col gap-4 mb-10">
                <a href="/" class="text-lg font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Anasayfa</a>
                <a href="/about.html" class="text-lg font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Hakkımızda</a>
                <a href="/contact.html" class="text-lg font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors">İletişim</a>
            </nav>
            <div id="sidebar-categories" class="pt-6 border-t border-gray-100 dark:border-gray-800"></div>
        </div>
    </aside>

    <!-- Article Content -->
    <main class="flex-grow w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div class="flex justify-between items-center mb-12">
            <a href="/" class="flex items-center gap-2 text-sm text-gray-500 hover:text-ink dark:hover:text-white transition-colors">
                ← Geri Dön
            </a>
            <div class="flex gap-2">
                ${article.categories.map(c => `<span class="text-xs font-bold uppercase tracking-widest bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded">${c}</span>`).join('')}
            </div>
        </div>
        
        <header class="text-center mb-12 max-w-2xl mx-auto">
            <h1 class="text-4xl md:text-6xl font-serif font-black mb-8 leading-tight text-ink dark:text-white">
                ${article.title}
            </h1>
            <div class="flex justify-center items-center gap-4 text-sm font-medium border-t border-b border-gray-100 dark:border-gray-800 py-4">
                <div class="flex flex-col items-center">
                     <span class="text-gray-400 text-xs uppercase tracking-widest mb-1">Yazar</span>
                     <span class="text-ink dark:text-white font-serif italic">${article.author}</span>
                </div>
                <div class="w-px h-8 bg-gray-200 dark:bg-gray-800 mx-4"></div>
                <div class="flex flex-col items-center">
                     <span class="text-gray-400 text-xs uppercase tracking-widest mb-1">Tarih</span>
                     <span class="text-ink dark:text-white font-serif italic">${article.date}</span>
                </div>
            </div>
        </header>

        <div class="mb-16">
            <img src="${article.imageUrl}" alt="${article.title}" class="w-full max-h-[600px] object-cover rounded-sm shadow-sm">
        </div>

        <div class="prose prose-lg md:prose-xl dark:prose-invert mx-auto font-serif leading-loose text-gray-800 dark:text-gray-300">
            ${article.content}
        </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-gray-100 dark:border-gray-800 py-16 mt-auto bg-white dark:bg-gray-900">
        <div class="max-w-7xl mx-auto px-4 text-center">
            <div class="font-serif text-3xl font-black mb-2 tracking-tight">DERGİ.</div>
            <p class="text-gray-400 text-sm">© 2025 Minimalist Dergi.</p>
        </div>
    </footer>

    <!-- Shared Scripts -->
    <script src="/index.js"></script>
</body>
</html>
    `;
};

app.listen(PORT, () => {
    console.log(`Server çalışıyor: Port ${PORT}`);
});