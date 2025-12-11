

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

// Initialize Data File if not exists or empty
if (!fs.existsSync(DATA_FILE)) {
    const initialData = { 
        articles: [], 
        categories: [], 
        announcement: { text: "Yayındayız!", active: true }, 
        files: [], 
        messages: [],
        adminConfig: { password: "admin123" }, // Default password
        ads: {
            ad1: "https://placehold.co/400x300?text=REKLAM+ALANI+1",
            ad2: "https://placehold.co/400x300?text=REKLAM+ALANI+2"
        }
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
}

// --- MIDDLEWARE ---
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// --- API ENDPOINTS ---

// 1. Get Data
app.get('/api/data', (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) {
            return res.json({ articles: [], categories: [], announcement: {}, files: [], messages: [], adminConfig: {password: "admin123"}, ads: {} });
        }
        try { 
            const json = JSON.parse(data);
            // Ensure structure exists for older data files
            if(!json.messages) json.messages = []; 
            if(!json.adminConfig) json.adminConfig = { password: "admin123" };
            if(!json.ads) json.ads = { ad1: "", ad2: "" };
            res.json(json); 
        } catch (e) { 
            res.json({ articles: [], categories: [], announcement: {}, files: [], messages: [], adminConfig: {password: "admin123"}, ads: {} }); 
        }
    });
});

// 2. Save Data (General)
app.post('/api/data', (req, res) => {
    const newData = req.body;
    
    fs.writeFile(DATA_FILE, JSON.stringify(newData, null, 2), (err) => {
        if (err) return res.status(500).json({ error: 'Veri kaydedilemedi' });
        
        try {
            if (newData.articles && Array.isArray(newData.articles)) {
                newData.articles.forEach(article => {
                    const filePath = path.join(ARTICLES_DIR, `${article.id}.html`);
                    const htmlContent = generateArticleHTML(article);
                    fs.writeFileSync(filePath, htmlContent);
                });
            }
            res.json({ success: true, message: 'Kaydedildi.' });
        } catch (genErr) {
            res.status(500).json({ error: 'HTML hatası.' });
        }
    });
});

// 3. Save New Message (Contact Form)
app.post('/api/contact', (req, res) => {
    const message = req.body;
    message.id = Date.now();
    message.date = new Date().toLocaleDateString('tr-TR');

    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).json({error: 'Read error'});
        try {
            const jsonData = JSON.parse(data);
            if (!jsonData.messages) jsonData.messages = [];
            jsonData.messages.unshift(message); // Add to top
            
            fs.writeFile(DATA_FILE, JSON.stringify(jsonData, null, 2), (wErr) => {
                if(wErr) return res.status(500).json({error: 'Write error'});
                res.json({success: true});
            });
        } catch(e) {
            res.status(500).json({error: 'Parse error'});
        }
    });
});

// 4. View Count
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

// 5. Upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, RESOURCES_DIR) },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
        cb(null, name + '-' + Date.now() + ext)
    }
})
const upload = multer({ storage: storage });
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Dosya yüklenemedi' });
    const fileUrl = `/resources/${req.file.filename}`;
    res.json({ success: true, url: fileUrl, filename: req.file.filename });
});

// --- SERVE STATIC ---
app.use('/resources', express.static(RESOURCES_DIR)); 
app.use('/articles', express.static(ARTICLES_DIR)); 
app.use(express.static(__dirname)); 

// --- TEMPLATE ---
const generateArticleHTML = (article) => {
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
                    fontFamily: { sans: ['Inter', 'sans-serif'], serif: ['Merriweather', 'serif'] },
                    colors: { paper: '#ffffff', ink: '#111111' }
                }
            }
        }
    </script>
    <style>
        body { -webkit-font-smoothing: antialiased; }
        .prose p { margin-bottom: 1.5em; line-height: 1.8; }
        .prose img { border-radius: 8px; margin: 2em auto; }
        .prose h2 { font-size: 1.5em; font-weight: bold; margin-top: 2em; margin-bottom: 1em; }
    </style>
</head>
<body class="bg-paper text-ink dark:bg-gray-900 dark:text-gray-100 transition-colors duration-300 flex flex-col min-h-screen">
    
    <nav class="sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-20">
                <div class="flex items-center">
                     <button id="menu-btn" class="flex items-center gap-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group">
                        <svg class="group-hover:text-blue-600 transition-colors" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                        <span class="hidden md:inline text-sm font-medium text-gray-500 group-hover:text-blue-600">Menü</span>
                    </button>
                </div>
                
                <!-- Center: Logo Layout (Image + Text) -->
                <a href="/" class="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-4 h-full group">
                    <img src="/resources/bal-logo.png" class="h-10 w-auto opacity-90 group-hover:opacity-100" alt="BAL Logo">
                    <div class="h-8 w-px bg-gray-300 dark:bg-gray-700"></div>
                    <span class="text-3xl font-serif font-black tracking-tighter pb-1">BALLAB</span>
                </a>

                <div class="flex items-center gap-4">
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

    <div id="sidebar-overlay" class="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 opacity-0 pointer-events-none transition-opacity duration-300"></div>
    <aside id="sidebar" class="fixed inset-y-0 left-0 w-80 bg-white dark:bg-gray-900 z-50 transform -translate-x-full transition-transform duration-300 shadow-2xl flex flex-col border-r border-gray-100 dark:border-gray-800">
        <div class="p-6 flex justify-between items-center border-b border-gray-100 dark:border-gray-800 h-20">
            <span class="font-serif text-xl font-bold tracking-tight">Menü</span>
            <button id="sidebar-close" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
        </div>
        <div class="p-8 flex-grow overflow-y-auto custom-scrollbar">
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
                <a href="/school.html" class="text-lg font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Okulumuz</a>
                <a href="/contact.html" class="text-lg font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors">İletişim</a>
            </nav>
            <div id="sidebar-categories" class="pt-6 border-t border-gray-100 dark:border-gray-800"></div>
        </div>
    </aside>

    <main class="flex-grow w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div class="flex justify-between items-center mb-8">
            <a href="/" class="flex items-center gap-2 text-sm text-gray-500 hover:text-ink dark:hover:text-white transition-colors">← Geri Dön</a>
            <div class="flex gap-2" id="cat-container"></div>
        </div>
        
        <header class="text-center mb-10">
            <h1 class="text-3xl md:text-5xl font-serif font-black mb-6 leading-tight text-ink dark:text-white">${article.title}</h1>
            <div class="flex justify-center items-center gap-4 text-sm text-gray-500">
                <span>${article.author}</span><span>•</span><span>${article.date}</span>
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
    <footer class="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 transition-colors duration-300 mt-auto">
        <div class="max-w-7xl mx-auto px-4 py-16 grid grid-cols-1 md:grid-cols-3 gap-12">
            <!-- Col 1: Brand & Social (Left) -->
            <div class="space-y-6 text-center md:text-left">
                <div class="font-serif text-5xl font-black tracking-tighter">BALLAB</div>
                <p class="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-xs mx-auto md:mx-0">
                    © Ballab 2025 ve Bursa Anadolu Lisesi.<br>Tüm hakları saklıdır.
                </p>
                <div class="flex gap-4 justify-center md:justify-start pt-2">
                   <a href="#" class="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg></a>
                   <a href="#" class="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg></a>
                   <a href="#" class="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg></a>
                </div>
            </div>

            <!-- Col 2: Quick Links (Center) -->
            <div class="flex flex-col gap-3 text-base font-medium text-gray-600 dark:text-gray-300 text-center md:text-left justify-center">
                 <a href="/" class="hover:text-black dark:hover:text-white transition">Anasayfa</a>
                 <a href="/about.html" class="hover:text-black dark:hover:text-white transition">Hakkımızda</a>
                 <a href="/school.html" class="hover:text-black dark:hover:text-white transition">Okulumuz</a>
                 <a href="/contact.html" class="hover:text-black dark:hover:text-white transition">İletişim</a>
                 <a href="https://bursaanadolulisesi.meb.k12.tr/" target="_blank" class="hover:text-black dark:hover:text-white transition mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 inline-block md:block">Bursa Anadolu Lisesi</a>
            </div>

            <!-- Col 3: Logos (Right - No Text) -->
            <div class="flex flex-col items-center md:items-end justify-center gap-8">
                <!-- Top Row: BAL & BALLAB Logos -->
                <div class="flex items-center gap-6">
                    <img src="/resources/bal-logo.png" class="h-20 w-auto opacity-90 hover:opacity-100 transition-opacity" alt="Bursa Anadolu Lisesi">
                    <img src="/resources/ballab-logo.png" class="h-10 w-auto opacity-90 hover:opacity-100 transition-opacity" alt="BALLAB">
                </div>
                
                <!-- Bottom Row: Corensan Logo -->
                <div class="flex items-center gap-3 opacity-80 hover:opacity-100 transition-opacity">
                     <img src="/resources/corensan-logo.png" class="h-12 w-auto" alt="Corensan">
                </div>
            </div>
        </div>
    </footer>

    <script src="/index.js"></script>
    <script>
        // VIEW COUNT WITH COOLDOWN (10 mins)
        const viewKey = 'view_cooldown_${article.id}';
        const lastView = localStorage.getItem(viewKey);
        const now = Date.now();
        const cooldown = 600000; // 10 minutes

        if (!lastView || now - parseInt(lastView) > cooldown) {
            fetch('/api/view/${article.id}', { method: 'POST' }).catch(e => console.error(e));
            localStorage.setItem(viewKey, now.toString());
        }

        // Client side color logic for article page
        const cats = ${JSON.stringify(article.categories)};
        const container = document.getElementById('cat-container');
        if(container && cats) {
            cats.forEach(c => {
                 const span = document.createElement('span');
                 span.className = "text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded " + getCategoryStyle(c);
                 span.innerText = c;
                 container.appendChild(span);
            });
        }
    </script>
</body>
</html>
    `;
};

app.listen(PORT, () => {
    console.log(`Server çalışıyor: Port ${PORT}`);
});