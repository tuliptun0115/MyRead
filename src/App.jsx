import { useState, useEffect } from 'react';
import './index.css';
import apiService from './services/apiService';
import { BookIcon, CameraIcon } from './components/Icons';
import BookListItem from './components/BookListItem';
import PieChart from './components/PieChart';
import YearlyChart from './components/YearlyChart';

const DEFAULT_COVER = import.meta.env.VITE_DEFAULT_COVER_URL || 'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=600&auto=format&fit=crop';

const getAuth = () => {
    const stored = localStorage.getItem('myread_auth');
    return stored ? JSON.parse(stored) : null;
};

const getMainCategory = (rawCategory) => {
    if (!rawCategory) return '未分類';
    const c = rawCategory.toLowerCase();
    if (c.includes('心理') || c.includes('成長') || c.includes('勵志') || c.includes('熟齡')) return '心理與成長';
    if (c.includes('小說') || c.includes('文學') || c.includes('詩')) return '文學/小說/詩集';
    if (c.includes('童書') || c.includes('兒童') || c.includes('橋樑')) return '童書與兒童文學';
    if (c.includes('繪本') || c.includes('圖文') || c.includes('漫畫')) return '圖文書與繪本';
    if (c.includes('商業') || c.includes('投資') || c.includes('理財') || c.includes('管理')) return '商業與理財';
    if (c.includes('人文') || c.includes('歷史') || c.includes('哲學') || c.includes('社會')) return '人文社科';
    if (c.includes('生活') || c.includes('風格') || c.includes('飲食') || c.includes('藝術')) return '生活與藝術';
    return '其他';
};

function App() {
    const [auth, setAuth] = useState(getAuth());
    const [loginData, setLoginData] = useState({ username: '', password: '' });
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [records, setRecords] = useState([]);
    const [fetching, setFetching] = useState(false);
    const [loading, setLoading] = useState(false);
    const [ocrLoading, setOcrLoading] = useState(false);
    const [toast, setToast] = useState('');
    const [currentPage, setCurrentPage] = useState('home'); 
    const [listPage, setListPage] = useState(1);
    const PAGE_SIZE = 20;
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [inputMode, setInputMode] = useState('search'); // 'search' or 'url'
    const [bookUrl, setBookUrl] = useState('');
    const [searchTitle, setSearchTitle] = useState('');
    const [searchingBook, setSearchingBook] = useState(false);
    const [foundBook, setFoundBook] = useState(null);
    const [showManualUrl, setShowManualUrl] = useState(false);

    const [formData, setFormData] = useState({
        title: '', subtitle: '', author: '', publisher: '', 
        category: '', completionDate: '', summary: '', coverUrl: ''
    });

    // 統一失效強制登出導回機制
    const forceLogout = (reasonMsg = '登入憑證已失效，請重新登入') => {
        setAuth(null);
        localStorage.removeItem('myread_auth');
        setLoginError(reasonMsg);
        setToast(reasonMsg);
    };

    // 啟動檢核：若本地有登入紀錄，背景向後端校驗；不吻合立即踢回登入頁
    useEffect(() => {
        const verifySavedAuth = async () => {
            const saved = getAuth();
            if (!saved) return;
            try {
                const res = await apiService.verifyAuth(saved);
                if (res && res.success === false) {
                    forceLogout(res.message || '登入憑證已失效，請重新登入');
                }
            } catch (e) {
                console.warn('Initial auth check failed:', e);
            }
        };
        verifySavedAuth();
    }, []);

    // 登入當下向後端即時驗證帳密
    const handleLogin = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        const username = (loginData.username || '').trim();
        const password = (loginData.password || '').trim();

        if (!username || !password) {
            setLoginError('請輸入帳號與密碼');
            return;
        }

        setLoginLoading(true);
        setLoginError('');

        try {
            const payload = { username, password };
            const res = await apiService.verifyAuth(payload);
            if (res && res.success) {
                setAuth(payload);
                localStorage.setItem('myread_auth', JSON.stringify(payload));
                setLoginData({ username: '', password: '' });
                setToast('登入成功');
            } else {
                setLoginError(res?.message || '帳號或密碼錯誤');
            }
        } catch (err) {
            setLoginError('連線異常，請稍後再試');
        } finally {
            setLoginLoading(false);
        }
    };

    const fetchRecords = async () => {
        setFetching(true);
        try {
            const data = await apiService.fetchRecords();
            if (data && data.length > 0) {
                const sorted = data.sort((a, b) => {
                    const diff = new Date(b.completionDate) - new Date(a.completionDate);
                    if (diff !== 0) return diff;
                    return String(b.id || '').localeCompare(String(a.id || ''), undefined, { numeric: true });
                });
                setRecords(sorted);
            }
        } catch (e) {
            setToast('資料讀取異常');
        } finally {
            setFetching(false);
        }
    };

    const triggerUrlInquiry = async (targetUrl) => {
        const urlToFetch = (targetUrl || bookUrl || '').trim();
        if (!urlToFetch) return setToast('請先輸入網址');
        setOcrLoading(true);
        setToast('正在解析網頁內容...');
        
        try {
            const res = await apiService.scrapeUrl(urlToFetch, auth);
            if (res.success) {
                const isCache = res.actionType === 'CACHE_HIT';
                setFormData(prev => ({
                    ...prev,
                    title: res.title || prev.title || '',
                    author: res.author || prev.author || '',
                    publisher: res.publisher || prev.publisher || '',
                    category: res.category || prev.category || '',
                    coverUrl: res.coverUrl || prev.coverUrl || '',
                    summary: res.summary || prev.summary || '',
                    completionDate: prev.completionDate || new Date().toISOString().split('T')[0]
                }));

                setToast(isCache ? '快取命中！已填寫書籍資料' : '網頁資料解析完成，已自動填入！');
                setBookUrl('');
                setFoundBook(null);
            } else {
                if (res.message && (res.message.includes('帳號或密碼錯誤') || res.message.includes('請先登入'))) {
                    forceLogout('帳號或密碼已變更，請重新登入');
                    return;
                }
                setToast(`解析失敗: ${res.message}`);
            }
        } catch (e) {
            setToast('網頁解析異常');
        } finally {
            setOcrLoading(false);
        }
    };

    const handleSearchBook = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        const query = searchTitle.trim();
        if (!query) return setToast('請先輸入書名');
        setSearchingBook(true);
        setFoundBook(null);
        setToast('正在博客來檢索相關書籍連結...');

        try {
            const res = await apiService.searchBook(query);
            if (res && res.success && res.url) {
                setFoundBook({
                    title: res.title || query,
                    url: res.url,
                    author: res.author || ''
                });
                setToast('已找到相關書籍，請確認連結！');
            } else {
                setToast(`${res?.message || '找不到博客來相關書籍，請手動貼上網址'}`);
            }
        } catch (err) {
            setToast('搜尋失敗，請手動貼上網址');
        } finally {
            setSearchingBook(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title) return setToast('請至少輸入書名');
        
        setLoading(true);
        try {
            const res = await apiService.submitRecord(formData, auth);
            if (res.success) {
                setToast('紀錄已成功存檔！');

                // 樂觀更新：立即將新書加入本地 records state，確保當日連續記錄多本時秒級顯現
                const optimisticRecord = {
                    id: res.debugId || `BK${records.length + 1}`,
                    title: formData.title,
                    author: formData.author || '',
                    publisher: formData.publisher || '',
                    category: formData.category || '',
                    completionDate: formData.completionDate || new Date().toISOString().split('T')[0],
                    summary: formData.summary || '',
                    coverUrl: formData.coverUrl || '',
                    creationDate: new Date().toISOString().split('T')[0]
                };
                setRecords(prev => {
                    const filtered = prev.filter(r => r.id !== optimisticRecord.id);
                    const updated = [optimisticRecord, ...filtered];
                    return updated.sort((a, b) => {
                        const diff = new Date(b.completionDate) - new Date(a.completionDate);
                        if (diff !== 0) return diff;
                        return String(b.id || '').localeCompare(String(a.id || ''), undefined, { numeric: true });
                    });
                });

                setFormData({ title: '', subtitle: '', author: '', publisher: '', category: '', completionDate: '', summary: '', coverUrl: '' });
                setFoundBook(null);
                setSearchTitle('');
                setBookUrl('');
                
                // 非同步遠端重新同步真實試算表資料
                await fetchRecords();
            } else {
                if (res.message && (res.message.includes('帳號或密碼錯誤') || res.message.includes('請先登入'))) {
                    forceLogout('帳號或密碼已變更，請重新登入');
                    return;
                }
                setToast(`儲存失敗: ${res.message}`);
            }
        } catch (e) {
            setToast('連線至伺服器失敗');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // ── 🔗 網址 Hash 路由同步邏輯 ──
    const syncRouteFromHash = () => {
        const hash = window.location.hash.replace(/^#\/?/, '') || 'home';
        const [path, queryStr] = hash.split('?');
        const params = new URLSearchParams(queryStr || '');

        if (path === 'stats') {
            setCurrentPage('stats');
            setSelectedRecord(null);
            setIsEditing(false);
        } else if (path === 'list') {
            setCurrentPage('list');
            const p = parseInt(params.get('page'), 10);
            if (!isNaN(p) && p > 0) setListPage(p);
            setSelectedRecord(null);
            setIsEditing(false);
        } else if (path === 'detail') {
            const id = params.get('id');
            if (id && records.length > 0) {
                const found = records.find(r => String(r.id) === String(id));
                if (found) {
                    setSelectedRecord(found);
                    setCurrentPage('detail');
                    return;
                }
            }
            if (id) {
                // 若 records 尚未載入，稍後會在 records 更新時匹配
                setCurrentPage('detail');
            }
        } else {
            setCurrentPage('home');
            setSelectedRecord(null);
            setIsEditing(false);
        }
    };

    // 監聽 hash 變化
    useEffect(() => {
        syncRouteFromHash();
        const handleHashChange = () => syncRouteFromHash();
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, [records]);

    // 路由跳轉輔助函式
    const navigateTo = (page, params = {}) => {
        let hash = `#/${page}`;
        const queryParts = [];
        if (params.page && params.page > 1) queryParts.push(`page=${params.page}`);
        if (params.id) queryParts.push(`id=${params.id}`);
        if (queryParts.length > 0) hash += `?${queryParts.join('&')}`;
        window.location.hash = hash;
    };

    useEffect(() => { if (auth) fetchRecords(); }, [auth]);
    useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 3000); return () => clearTimeout(t); } }, [toast]);

    // ── 計算統計數據 ──
    const categories = {};
    records.forEach(r => {
        const mainCat = getMainCategory(r.category);
        categories[mainCat] = (categories[mainCat] || 0) + 1;
    });
    const sortedCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]);

    if (!auth) {
        return (
            <div className="login-overlay">
                <div className="login-card">
                    <h2 className="login-title"><BookIcon /> 書香閱讀 登入</h2>
                    <form onSubmit={handleLogin} className="login-form">
                        <input 
                            type="text" 
                            placeholder="帳號" 
                            value={loginData.username} 
                            onChange={(e) => { setLoginData({...loginData, username: e.target.value}); setLoginError(''); }} 
                            disabled={loginLoading}
                            autoFocus
                        />
                        <input 
                            type="password" 
                            placeholder="密碼" 
                            value={loginData.password} 
                            onChange={(e) => { setLoginData({...loginData, password: e.target.value}); setLoginError(''); }} 
                            disabled={loginLoading}
                        />
                        {loginError && <div className="login-error-msg">{loginError}</div>}
                        <button 
                            type="submit" 
                            className="submit-btn" 
                            disabled={loginLoading}
                            style={{ marginTop: '20px' }}
                        >
                            {loginLoading ? '驗證中...' : '進入書庫'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <div className="site-header">
                <h1 onClick={() => navigateTo('home')} style={{ cursor: 'pointer' }}><BookIcon /> 書香閱讀</h1>
                <nav className="page-nav">
                    <button className={`nav-btn ${currentPage === 'home' ? 'active' : ''}`} onClick={() => navigateTo('home')}>首頁</button>
                    <button className={`nav-btn ${currentPage === 'list' ? 'active' : ''}`} onClick={() => navigateTo('list', { page: listPage })}>閱讀紀錄</button>
                    <button className={`nav-btn ${currentPage === 'stats' ? 'active' : ''}`} onClick={() => navigateTo('stats')}>數據中心</button>
                    <button className="nav-btn logout" onClick={() => { setAuth(null); localStorage.removeItem('myread_auth'); setLoginError(''); }}>登出</button>
                </nav>
            </div>

            {toast && <div className="toast-notification">{toast}</div>}

            {currentPage === 'home' && (
                <>
                    <div className="home-stats-line">
                        <div className="home-stats-text">累計閱讀<span>{records.length}</span>本</div>
                    </div>

                    <div className="form-container">
                        {/* ── 書籍查詢區塊 (搜尋博客來 / 輸入網址) ── */}
                        <div className="book-inquiry-container">
                            <div className="search-section">
                                <label className="search-main-label">輸入書名快速檢索博客來書籍</label>
                                <div className="search-input-wrapper">
                                    <input 
                                        type="text" 
                                        value={searchTitle} 
                                        onChange={(e) => setSearchTitle(e.target.value)} 
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchBook(); } }}
                                        placeholder="輸入書名（例如：原子習慣、重要的小事）" 
                                        className="search-main-input"
                                    />
                                    <button 
                                        type="button" 
                                        onClick={handleSearchBook} 
                                        className="nav-btn action-btn search-btn" 
                                        disabled={searchingBook}
                                    >
                                        {searchingBook ? '檢索中...' : '尋找博客來'}
                                    </button>
                                </div>

                                {/* 找到書籍後的確認卡片 */}
                                {foundBook && (
                                    <div className="found-confirm-card">
                                        <div className="found-badge">找到博客來書籍資料，請確認是否為這本書：</div>
                                        <div className="found-title">{foundBook.title}</div>
                                        {foundBook.author && <div className="found-author">作者：{foundBook.author}</div>}
                                        <div className="found-link-row">
                                            <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>博客來連結：</span>
                                            <a href={foundBook.url} target="_blank" rel="noopener noreferrer" className="found-link">
                                                {foundBook.url} ↗（在新分頁預覽）
                                            </a>
                                        </div>
                                        <div className="found-actions">
                                            <button 
                                                type="button" 
                                                onClick={() => triggerUrlInquiry(foundBook.url)} 
                                                className="nav-btn action-btn" 
                                                disabled={ocrLoading}
                                                style={{ flex: 1 }}
                                            >
                                                {ocrLoading ? '正在解析資料...' : '確認是這本，解析資料'}
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => setFoundBook(null)} 
                                                className="nav-btn secondary"
                                                disabled={ocrLoading}
                                            >
                                                ✕ 重新搜尋
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* 選填：直接輸入網址 */}
                                <div className="manual-url-toggle-bar">
                                    <button 
                                        type="button" 
                                        onClick={() => setShowManualUrl(!showManualUrl)} 
                                        className="toggle-link-btn"
                                    >
                                        {showManualUrl ? '▲ 收起網址輸入' : '或者直接貼上書籍介紹網址 (點擊展開)'}
                                    </button>
                                </div>

                                {showManualUrl && (
                                    <div className="manual-url-row">
                                        <input 
                                            name="bookUrl" 
                                            type="text" 
                                            value={bookUrl} 
                                            onChange={(e) => setBookUrl(e.target.value)} 
                                            placeholder="https://www.books.com.tw/..." 
                                            style={{ flex: 1 }}
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => triggerUrlInquiry()} 
                                            className="nav-btn action-btn" 
                                            disabled={ocrLoading}
                                        >
                                            {ocrLoading ? '解析中...' : '解析網頁'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {formData.title && (
                                <div className="preview-shared-section">
                                    <div className="mini-preview-card">
                                        <div className="preview-label">當前解析結果預覽</div>
                                        <img src={formData.coverUrl || DEFAULT_COVER} alt="Cover Preview" onError={(e) => e.target.src = DEFAULT_COVER} />
                                        <div className="mini-info">
                                            <div className="mini-title">{formData.title}</div>
                                            <div className="mini-author">{formData.author || '作者未知'}</div>
                                            <div className="mini-meta">{formData.publisher} / {formData.category}</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} style={{ marginTop: '1.2rem' }}>

                            <div className="grid-2">
                                <div className="input-box">
                                    <label>書名</label>
                                    <input name="title" type="text" value={formData.title} onChange={handleInputChange} required />
                                </div>
                                <div className="input-box">
                                    <label>完成日</label>
                                    <input name="completionDate" type="date" value={formData.completionDate} onChange={handleInputChange} />
                                </div>
                                <div className="input-box">
                                    <label>作者</label>
                                    <input name="author" type="text" value={formData.author} onChange={handleInputChange} />
                                </div>
                                <div className="input-box">
                                    <label>出版社</label>
                                    <input name="publisher" type="text" value={formData.publisher} onChange={handleInputChange} />
                                </div>
                                <div className="input-box" style={{ gridColumn: 'span 2' }}>
                                    <label>讀後心得</label>
                                    <textarea name="summary" value={formData.summary} onChange={handleInputChange} rows="5" />
                                </div>
                                <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'center' }}>
                                    <button type="submit" className="submit-btn" disabled={loading} style={{ width: '200px' }}>
                                        {loading ? '儲存中...' : '儲存'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>

                    <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 className="section-title" style={{ marginBottom: 0 }}>最新閱讀紀錄</h2>
                        <button className="nav-btn secondary" onClick={() => navigateTo('list', { page: 1 })}>看全部</button>
                    </div>
                    {fetching ? <div className="loader-text">載入中...</div> : (
                        <div className="books-list">
                            {records.length > 0 ? (
                                records.slice(0, 5).map((r, i) => (
                                    <BookListItem 
                                        key={r.id || i} 
                                        record={r} 
                                        defaultCover={DEFAULT_COVER} 
                                        onClick={() => navigateTo('detail', { id: r.id })} 
                                        showIdBadge={false}
                                    />
                                ))
                            ) : (
                                <div className="no-data">目前沒有紀錄，趕快分享一本好書吧！</div>
                            )}
                        </div>
                    )}
                </>
            )}

            {currentPage === 'stats' && (
                <div className="stats-container" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <div className="home-stats-line" style={{ justifyContent: 'center', marginBottom: '2rem' }}>
                        <div className="home-stats-text">累計閱讀<span>{records.length}</span>本</div>
                    </div>
                    {/* 📈 1. 年度閱讀趨勢 (移到上方) */}
                    <div className="stats-item" style={{ width: '100%', marginBottom: '2rem' }}>
                        <YearlyChart records={records} />
                    </div>
                    {/* 📚 2. 分類佔比 (移到下方) */}
                    <div className="stats-item" style={{ width: '100%' }}>
                        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.4rem' }}>分類佔比</h3>
                        <PieChart data={Object.entries(records.reduce((acc, r) => {
                            const cat = getMainCategory(r.category);
                            acc[cat] = (acc[cat] || 0) + 1;
                            return acc;
                        }, {})).sort((a,b) => b[1]-a[1])} />
                    </div>
                </div>
            )}

            {currentPage === 'list' && (() => {
                const totalPages = Math.ceil(records.length / PAGE_SIZE) || 1;
                const safePage = Math.min(Math.max(listPage, 1), totalPages);
                const startIndex = (safePage - 1) * PAGE_SIZE;
                const pageRecords = records.slice(startIndex, startIndex + PAGE_SIZE);

                return (
                    <div style={{ marginTop: '20px' }}>
                        <div className="books-list">
                            {pageRecords.map((r, i) => (
                                <BookListItem 
                                    key={r.id || `${safePage}-${i}`} 
                                    record={r} 
                                    defaultCover={DEFAULT_COVER} 
                                    onClick={() => navigateTo('detail', { id: r.id })} 
                                />
                            ))}
                        </div>

                        {/* 📄 分頁導覽列 (每 20 筆 1 頁，網址同步顯示 #/list?page=X) */}
                        {totalPages > 1 && (
                            <div className="pagination-container">
                                <button 
                                    className="page-btn" 
                                    onClick={() => { navigateTo('list', { page: Math.max(1, safePage - 1) }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                    disabled={safePage === 1}
                                >
                                    ◀ 上一頁
                                </button>

                                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(pageNum => (
                                    <button 
                                        key={pageNum}
                                        className={`page-btn ${pageNum === safePage ? 'active' : ''}`}
                                        onClick={() => { navigateTo('list', { page: pageNum }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                    >
                                        {pageNum}
                                    </button>
                                ))}

                                <button 
                                    className="page-btn" 
                                    onClick={() => { navigateTo('list', { page: Math.min(totalPages, safePage + 1) }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                    disabled={safePage === totalPages}
                                >
                                    下一頁 ▶
                                </button>
                                <span className="page-info-text">
                                    第 {safePage} / {totalPages} 頁 (共 {records.length} 筆)
                                </span>
                            </div>
                        )}
                    </div>
                );
            })()}

            {currentPage === 'detail' && selectedRecord && (() => {
                const currentIndex = records.findIndex(r => r.id === selectedRecord.id);
                const hasPrev = currentIndex > 0;
                const hasNext = currentIndex !== -1 && currentIndex < records.length - 1;

                return (
                    <div className="book-detail">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '0.8rem' }}>
                            <button className="back-btn" style={{ marginBottom: 0 }} onClick={() => navigateTo('list', { page: listPage })}>
                                ← 返回書庫
                            </button>

                            {/* 📖 上一筆 / 下一筆 導覽按鈕群組 (網址同步顯示 #/detail?id=BKxx) */}
                            <div className="detail-nav-actions">
                                <button 
                                    className="detail-nav-btn"
                                    disabled={!hasPrev}
                                    onClick={() => {
                                        if (hasPrev) {
                                            const prevRecord = records[currentIndex - 1];
                                            navigateTo('detail', { id: prevRecord.id });
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }
                                    }}
                                >
                                    ◀ 上一筆
                                </button>

                                <button 
                                    className="detail-nav-btn"
                                    disabled={!hasNext}
                                    onClick={() => {
                                        if (hasNext) {
                                            const nextRecord = records[currentIndex + 1];
                                            navigateTo('detail', { id: nextRecord.id });
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }
                                    }}
                                >
                                    下一筆 ▶
                                </button>

                                <button className="nav-btn" onClick={async () => {
                                    if (isEditing) {
                                        setLoading(true);
                                        const res = await apiService.updateRecord(selectedRecord, auth);
                                        if (res.success) {
                                            setToast('資料更新成功！');
                                            fetchRecords();
                                            setIsEditing(false);
                                        } else {
                                            if (res && res.message && (res.message.includes('帳號或密碼錯誤') || res.message.includes('請先登入'))) {
                                                forceLogout('帳號或密碼已變更，請重新登入');
                                                setLoading(false);
                                                return;
                                            }
                                            setToast(res?.message ? `更新失敗: ${res.message}` : '更新失敗');
                                        }
                                        setLoading(false);
                                    } else {
                                        setIsEditing(true);
                                    }
                                }}>
                                    {isEditing ? (loading ? '儲存中...' : '確認儲存') : '編輯資料'}
                                </button>
                            </div>
                        </div>

                    <div className="detail-hero">
                        <img src={selectedRecord.coverUrl || DEFAULT_COVER} className="detail-cover-img" alt="封面" />
                        <div className="detail-main">
                            {isEditing ? (
                                <div className="edit-form grid-2">
                                    <div className="input-box" style={{ gridColumn: 'span 2' }}>
                                        <label>高清封面連結</label>
                                        <input type="text" value={selectedRecord.coverUrl} onChange={(e) => setSelectedRecord({...selectedRecord, coverUrl: e.target.value})} placeholder="輸入圖片網址" />
                                    </div>
                                    <div className="input-box" style={{ gridColumn: 'span 2' }}>
                                        <label>書名</label>
                                        <input type="text" value={selectedRecord.title} onChange={(e) => setSelectedRecord({...selectedRecord, title: e.target.value})} />
                                    </div>
                                    <div className="input-box">
                                        <label>作者</label>
                                        <input type="text" value={selectedRecord.author} onChange={(e) => setSelectedRecord({...selectedRecord, author: e.target.value})} />
                                    </div>
                                    <div className="input-box">
                                        <label>出版社</label>
                                        <input type="text" value={selectedRecord.publisher} onChange={(e) => setSelectedRecord({...selectedRecord, publisher: e.target.value})} />
                                    </div>
                                    <div className="input-box">
                                        <label>分類</label>
                                        <input type="text" value={selectedRecord.category} onChange={(e) => setSelectedRecord({...selectedRecord, category: e.target.value})} />
                                    </div>
                                    <div className="input-box">
                                        <label>閱讀完成日</label>
                                        <input type="date" value={selectedRecord.completionDate} onChange={(e) => setSelectedRecord({...selectedRecord, completionDate: e.target.value})} />
                                    </div>
                                    <div className="input-box" style={{ gridColumn: 'span 2' }}>
                                        <label>讀後心得</label>
                                        <textarea rows="6" value={selectedRecord.summary} onChange={(e) => setSelectedRecord({...selectedRecord, summary: e.target.value})} />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h2 className="detail-title">{selectedRecord.title}</h2>
                                    <p className="detail-meta-text">
                                        {selectedRecord.author} | {selectedRecord.publisher} | {selectedRecord.category}
                                    </p>
                                    <p className="detail-meta-text" style={{ fontSize: '1rem', marginTop: '-1.5rem' }}>
                                        閱讀完成日：{selectedRecord.completionDate || '未記錄'}
                                    </p>
                                    <div className="detail-summary-section">
                                        <h3>讀後心得</h3>
                                        <p className="detail-summary-text">{selectedRecord.summary}</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            );
        })()}
    </div>
    );
}

export default App;
