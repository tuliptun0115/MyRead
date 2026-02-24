import { useState, useEffect } from 'react';
import './index.css';

const DEFAULT_COVER = import.meta.env.VITE_DEFAULT_COVER_URL || 'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=600&auto=format&fit=crop&ixlib=rb-4.0.3';
const GAS_URL = import.meta.env.VITE_GAS_API_URL;
const PAGE_SIZE = 20;

// ── 六大分類 Mapping ──
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

// ── SVG 圖示元件 ──
const BookIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', color: 'var(--accent-pink)' }}>
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
);

const CameraIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="upload-icon-svg">
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
        <circle cx="12" cy="13" r="3" />
    </svg>
);

// ── 書籍列表單行元件 ──
function BookListItem({ record, defaultCover, onClick }) {
    return (
        <div className="book-list-item" onClick={onClick} style={{ cursor: 'pointer' }}>
            <img
                src={record.coverUrl || defaultCover}
                alt={record.title}
                className="list-cover"
                onError={(e) => { e.target.src = defaultCover; }}
            />
            <div className="list-info">
                <div className="list-title">{record.title}</div>
                <div className="list-meta">
                    <span className="list-author">{record.author}</span>
                    {record.category && <span className="list-category">{record.category}</span>}
                    {record.publisher && <span className="list-publisher">{record.publisher}</span>}
                </div>
                <div className="list-summary">{record.summary}</div>
            </div>
            <div className="list-date">完讀<br />{record.completionDate}</div>
        </div>
    );
}

// ── 書籍詳細頁元件 ──
function BookDetail({ record, defaultCover, onBack }) {
    return (
        <div className="book-detail">
            <button className="back-btn" onClick={onBack}>← 返回</button>
            <div className="detail-hero">
                <img
                    src={record.coverUrl || defaultCover}
                    alt={record.title}
                    className="detail-cover"
                    onError={(e) => { e.target.src = defaultCover; }}
                />
                <div className="detail-main">
                    <h2 className="detail-title">{record.title}</h2>
                    <div className="detail-meta-grid">
                        {record.author && <div className="detail-meta-item"><span className="detail-meta-label">作者</span><span>{record.author}</span></div>}
                        {record.category && <div className="detail-meta-item"><span className="detail-meta-label">分類</span><span className="list-category">{record.category}</span></div>}
                        {record.publisher && <div className="detail-meta-item"><span className="detail-meta-label">出版社</span><span>{record.publisher}</span></div>}
                        {record.completionDate && <div className="detail-meta-item"><span className="detail-meta-label">完讀日</span><span>{record.completionDate}</span></div>}
                    </div>
                </div>
            </div>
            {record.summary && (
                <div className="detail-summary-section">
                    <h3 className="detail-summary-label">📝 AI 摘要精華</h3>
                    <p className="detail-summary-text">{record.summary}</p>
                </div>
            )}
        </div>
    );
}

function App() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [toast, setToast] = useState('');
    const [ocrLoading, setOcrLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState('home'); // 'home' | 'list' | 'detail'
    const [listPage, setListPage] = useState(1);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [prevPage, setPrevPage] = useState('home'); // 從哪裡進入詳細頁

    const [formData, setFormData] = useState({ title: '', coverUrl: '', completionDate: '' });
    const [filterYear, setFilterYear] = useState('all');
    const [filterMonth, setFilterMonth] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all'); // 新增分類篩選狀態

    const fetchRecords = async () => {
        if (!GAS_URL || GAS_URL.includes('YOUR_SCRIPT_ID')) return;
        setFetching(true);
        try {
            const res = await fetch(GAS_URL);
            const data = await res.json();
            if (data.status === 'success') {
                const sorted = data.data.sort((a, b) => new Date(b.completionDate) - new Date(a.completionDate));
                setRecords(sorted);
            }
        } catch (err) { console.error('Failed to fetch records', err); }
        setFetching(false);
    };

    useEffect(() => { fetchRecords(); }, []);
    useEffect(() => {
        if (toast) { const t = setTimeout(() => setToast(''), 3000); return () => clearTimeout(t); }
    }, [toast]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const compressImage = (file) => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_W = 800, MAX_H = 1100;
                let w = img.width, h = img.height;
                if (w > h) { if (w > MAX_W) { h *= MAX_W / w; w = MAX_W; } }
                else { if (h > MAX_H) { w *= MAX_H / h; h = MAX_H; } }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                const TARGET = 200000;
                let q = 0.85, dataUrl = canvas.toDataURL('image/jpeg', q);
                while (dataUrl.length > TARGET && q > 0.3) { q -= 0.1; dataUrl = canvas.toDataURL('image/jpeg', Math.max(q, 0.3)); }
                resolve(dataUrl);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    const runOcrViaGas = async (dataUrl) => {
        if (!GAS_URL || GAS_URL.includes('YOUR_SCRIPT_ID')) return '';
        const b64 = dataUrl.split(',')[1];
        const mime = dataUrl.match(/^data:(image\/[a-zA-Z]+);base64,/)?.[1] || 'image/jpeg';
        try {
            const res = await fetch(GAS_URL, {
                method: 'POST', mode: 'cors',
                headers: { 'Content-Type': 'text/plain' },
                body: `ACTION:OCR+++${mime}|||${b64}`
            });
            if (res.ok) {
                const json = await res.json();
                if (json?.error) console.warn('[MyRead OCR] Gemini 錯誤:', json.error);
                return json?.title?.trim() || '';
            }
        } catch (err) { console.warn('[MyRead OCR] 例外:', err); }
        return '';
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const dataUrl = await compressImage(file);
        setFormData(prev => ({ ...prev, coverUrl: dataUrl }));
        if (!formData.title.trim()) {
            setOcrLoading(true);
            setToast('🔍 AI 正在辨識封面書名...');
            const detected = await runOcrViaGas(dataUrl);
            setOcrLoading(false);
            if (detected && detected !== '未知書籍' && detected !== '未知') {
                setFormData(prev => ({ ...prev, title: detected }));
                setToast(`📚 AI 辨識到書名：${detected}`);
                setTimeout(() => document.querySelector('input[name="title"]')?.focus(), 100);
            } else if (detected) {
                setToast('📷 封面無法辨識，請手動輸入書名');
            } else {
                setToast('⚠️ OCR 服務未設定，請手動輸入書名');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!GAS_URL || GAS_URL.includes('YOUR_SCRIPT_ID')) { alert('請先設定 VITE_GAS_API_URL'); return; }
        setLoading(true);
        try {
            const rawPayload = JSON.stringify({
                t: formData.title,
                c: formData.coverUrl.trim() || DEFAULT_COVER,
                d: formData.completionDate || new Date().toISOString().split('T')[0]
            });
            await fetch(GAS_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: rawPayload });
            setFormData({ title: '', coverUrl: '', completionDate: '' });
            setToast('✨ 閱讀紀錄已儲存！');
            setTimeout(fetchRecords, 1500);
        } catch (err) { console.error(err); setToast('❌ 新增失敗，請稍後再試。'); }
        setLoading(false);
    };

    const openDetail = (record, from) => {
        setSelectedRecord(record);
        setPrevPage(from);
        setCurrentPage('detail');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const goHome = () => { setCurrentPage('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    const goToList = (category = 'all') => {
        setFilterCategory(category);
        setCurrentPage('list');
        setListPage(1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const goBack = () => { setCurrentPage(prevPage); window.scrollTo({ top: 0, behavior: 'smooth' }); };

    // ── 計算資料與防呆 ──
    const safeDateOffset = (dStr) => {
        if (!dStr) return 0;
        try {
            const d = new Date(dStr);
            return isNaN(d) ? 0 : d.getTime();
        } catch { return 0; }
    };

    const sortedRecords = [...records].sort((a, b) => safeDateOffset(b.completionDate) - safeDateOffset(a.completionDate));
    const homeRecords = sortedRecords.slice(0, 10);

    const safeDateYear = (dStr) => {
        if (!dStr) return null;
        try {
            const d = new Date(dStr);
            return isNaN(d) ? null : d.getFullYear();
        } catch { return null; }
    };

    const years = [...new Set(records.map(r => safeDateYear(r.completionDate)))].filter(Boolean).sort((a, b) => b - a);

    const filteredRecords = sortedRecords.filter(r => {
        if (!r.completionDate) {
            return filterYear === 'all' && filterMonth === 'all';
        }
        try {
            const d = new Date(r.completionDate);
            if (isNaN(d)) return filterYear === 'all' && filterMonth === 'all' && filterCategory === 'all';
            const matchYear = filterYear === 'all' || d.getFullYear().toString() === filterYear;
            const matchMonth = filterMonth === 'all' || (d.getMonth() + 1).toString() === filterMonth;
            const mainCat = getMainCategory(r.category);
            const matchCategory = filterCategory === 'all' || mainCat === filterCategory;
            return matchYear && matchMonth && matchCategory;
        } catch {
            return filterYear === 'all' && filterMonth === 'all' && filterCategory === 'all';
        }
    });
    const totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE) || 1;
    const paginatedRecords = filteredRecords.slice((listPage - 1) * PAGE_SIZE, listPage * PAGE_SIZE);

    const categories = {};
    const rawCategories = {};
    records.forEach(r => {
        const cat = r.category || '未分類';
        rawCategories[cat] = (rawCategories[cat] || 0) + 1;
        const mainCat = getMainCategory(r.category);
        categories[mainCat] = (categories[mainCat] || 0) + 1;
    });
    const sortedRawCategories = Object.entries(rawCategories).sort((a, b) => b[1] - a[1]);
    let ang = 0;
    const colors = ['#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d'];
    const pieSlices = Object.entries(categories).map(([, count], i) => {
        const p = count / records.length;
        const start = ang; ang += p * 360;
        return `${colors[i % colors.length]} ${start}deg ${ang}deg`;
    });
    const pieBackground = pieSlices.length > 0 ? `conic-gradient(${pieSlices.join(', ')})` : '#fdf2f8';

    return (
        <div className="container">
            <div className="site-header">
                <h1 style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={goHome}><BookIcon /> 書香筆記</h1>
                <nav className="page-nav">
                    <button className={`nav-btn ${currentPage === 'home' ? 'active' : ''}`} onClick={goHome}>🏠 首頁</button>
                    <button className={`nav-btn ${currentPage === 'list' ? 'active' : ''}`} onClick={() => goToList('all')}>📚 書籍列表</button>
                </nav>
            </div>

            {toast && <div className="toast-notification">{toast}</div>}

            {/* ── 首頁 ── */}
            {currentPage === 'home' && (
                <>
                    <div className="hero-banner">
                        <div className="hero-content">
                            <h2>記錄每一次與文字的相遇</h2>
                            <p>上傳書封，AI 自動為您整理書籍資訊與閱讀心得摘要，打造專屬您的美學書庫。</p>
                        </div>
                    </div>

                    <div className="form-container">
                        <form onSubmit={handleSubmit}>
                            <div className="upload-section">
                                <label className="upload-label">
                                    {formData.coverUrl ? (
                                        <img src={formData.coverUrl} alt="Cover Preview" className="cover-preview" />
                                    ) : (
                                        <div className="upload-placeholder">
                                            <CameraIcon />
                                            <span>點擊上傳書籍封面</span>
                                            <span className="upload-hint">支援圖片檔案<br />AI 將自動辨識書名</span>
                                        </div>
                                    )}
                                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden-input" />
                                </label>
                                {ocrLoading && <div className="ocr-loading"><div className="pink-spinner small"></div><span>AI 辨識中...</span></div>}
                            </div>
                            <div className="form-group grid-2">
                                <div>
                                    <label>書名 (選填，AI 將自動辨識)</label>
                                    <input type="text" name="title" value={formData.title} onChange={handleInputChange} placeholder="上傳封面後系統將自動填入" />
                                </div>
                                <div>
                                    <label>閱讀完成日 (選填)</label>
                                    <input type="date" name="completionDate" value={formData.completionDate} onChange={handleInputChange} />
                                </div>
                            </div>
                            {loading ? (
                                <div className="loader-container"><div className="pink-spinner"></div><div className="loader-text">AI 正在為您優雅地分析書籍...</div></div>
                            ) : (
                                <button type="submit" className="submit-btn">儲存閱讀紀錄</button>
                            )}
                        </form>
                    </div>

                    <div className="dashboard">
                        <div className="dashboard-stats">
                            <div className="stat-item">
                                <div className="stat-value">{records.length}</div>
                                <div className="stat-label">總閱讀數 (本)</div>
                            </div>
                        </div>
                        <div className="dashboard-chart">
                            <div className="pie-chart" style={{ background: pieBackground }}></div>
                            <div className="pie-legend">
                                {Object.entries(categories).map(([cat, count], i) => (
                                    <div
                                        key={cat}
                                        className="legend-item"
                                    >
                                        <span className="legend-color" style={{ background: colors[i % colors.length] }}></span>
                                        <span className="legend-text">{cat} ({count})</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                            <button className="view-all-btn" onClick={() => setCurrentPage('analysis')}>
                                查看更多詳細分析 →
                            </button>
                        </div>
                    </div>

                    <div className="section-header">
                        <h2 className="section-title">最新閱讀紀錄</h2>
                        {records.length > 10 && (
                            <button className="view-all-btn" onClick={() => goToList('all')}>查看全部 {records.length} 本 →</button>
                        )}
                    </div>

                    {fetching ? (
                        <div className="loader-container"><div className="pink-spinner"></div><div className="loader-text">載入您的閱讀品味中...</div></div>
                    ) : (
                        <div className="books-list">
                            {homeRecords.map((r, i) => <BookListItem key={i} record={r} defaultCover={DEFAULT_COVER} onClick={() => openDetail(r, 'home')} />)}
                            {homeRecords.length === 0 && <div className="no-data">還沒有閱讀紀錄，上傳第一本書吧！</div>}
                        </div>
                    )}
                </>
            )}

            {/* ── 書籍列表頁 ── */}
            {currentPage === 'list' && (
                <>
                    <div className="section-header">
                        <h2 className="section-title">全部書籍列表</h2>
                        <span className="record-count">共 {filteredRecords.length} 筆</span>
                    </div>
                    <div className="filter-section">
                        <select onChange={e => { setFilterCategory(e.target.value); setListPage(1); }} value={filterCategory} className="filter-select">
                            <option value="all">所有分類</option>
                            {Object.keys(categories).sort().map(c => <option key={c} value={c}>{c} ({categories[c]})</option>)}
                        </select>
                        <select onChange={e => { setFilterYear(e.target.value); setListPage(1); }} value={filterYear} className="filter-select">
                            <option value="all">所有年份</option>
                            {years.map(y => <option key={y} value={y}>{y} 年</option>)}
                        </select>
                        <select onChange={e => { setFilterMonth(e.target.value); setListPage(1); }} value={filterMonth} className="filter-select">
                            <option value="all">所有月份</option>
                            {[...Array(12)].map((_, i) => <option key={i + 1} value={i + 1}>{i + 1} 月</option>)}
                        </select>
                    </div>
                    {fetching ? (
                        <div className="loader-container"><div className="pink-spinner"></div><div className="loader-text">載入中...</div></div>
                    ) : (
                        <>
                            <div className="books-list">
                                {paginatedRecords.map((r, i) => <BookListItem key={i} record={r} defaultCover={DEFAULT_COVER} onClick={() => openDetail(r, 'list')} />)}
                                {filteredRecords.length === 0 && <div className="no-data">目前沒有符合條件的閱讀紀錄。</div>}
                            </div>
                            {totalPages > 1 && (
                                <div className="pagination">
                                    <button className="page-btn" disabled={listPage === 1}
                                        onClick={() => { setListPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>← 上一頁</button>
                                    <span className="page-info">{listPage} / {totalPages}</span>
                                    <button className="page-btn" disabled={listPage === totalPages}
                                        onClick={() => { setListPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>下一頁 →</button>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {/* ── 詳細分析頁 ── */}
            {currentPage === 'analysis' && (
                <div className="analysis-page">
                    <button className="back-btn" onClick={() => setCurrentPage('home')}>← 返回首頁</button>
                    <div className="section-header">
                        <h2 className="section-title">閱讀詳細分析</h2>
                        <span className="record-count">共 {records.length} 筆紀錄</span>
                    </div>
                    <div className="form-container">
                        <h3 style={{ color: 'var(--text-main)', marginBottom: '1.5rem' }}>各類別詳細統計</h3>
                        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                            {sortedRawCategories.map(([cat, count]) => (
                                <div key={cat} style={{ background: 'var(--primary-pink)', padding: '1rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: '600', color: 'var(--accent-pink-hover)' }}>{cat}</span>
                                    <span style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>{count} 本</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── 書籍詳細頁 ── */}
            {currentPage === 'detail' && selectedRecord && (
                <BookDetail record={selectedRecord} defaultCover={DEFAULT_COVER} onBack={goBack} />
            )}
        </div>
    );
}

export default App;
