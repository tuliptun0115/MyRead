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
    const [records, setRecords] = useState([]);
    const [fetching, setFetching] = useState(false);
    const [loading, setLoading] = useState(false);
    const [ocrLoading, setOcrLoading] = useState(false);
    const [toast, setToast] = useState('');
    const [currentPage, setCurrentPage] = useState('home'); 
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    const [formData, setFormData] = useState({
        title: '', subtitle: '', author: '', publisher: '', 
        category: '', completionDate: '', summary: '', coverUrl: ''
    });
    const [showStats, setShowStats] = useState(false);
    const [bookUrl, setBookUrl] = useState('');

    const fetchRecords = async () => {
        setFetching(true);
        try {
            const data = await apiService.fetchRecords();
            if (data && data.length > 0) {
                const sorted = data.sort((a, b) => new Date(b.completionDate) - new Date(a.completionDate));
                setRecords(sorted);
            }
        } catch (e) {
            setToast('⚠️ 資料讀取異常');
        } finally {
            setFetching(false);
        }
    };

    const compressImage = (file) => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 600; canvas.height = 800;
                canvas.getContext('2d').drawImage(img, 0, 0, 600, 800);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const b64WithPrefix = await compressImage(file);
            const b64Data = b64WithPrefix.split(',')[1];
            
            setFormData(prev => ({ ...prev, coverUrl: b64WithPrefix }));
            setOcrLoading(true);
            setToast('🔍 Gemini 辨識中...');

            const ocrRes = await apiService.performOCR(b64Data, auth);
            
            if (ocrRes.success) {
                setFormData(prev => ({ 
                    ...prev, 
                    title: ocrRes.title, 
                    author: ocrRes.author || '',
                    publisher: ocrRes.publisher || '',
                    category: ocrRes.category || '',
                    completionDate: new Date().toISOString().split('T')[0]
                }));
                
                setToast(`📚 找到《${ocrRes.title}》，同步網路資料...`);
                
                const searchRes = await apiService.searchBook(ocrRes.title);
                let scrapedInfo = `書名: ${ocrRes.title}\n作者: ${ocrRes.author}`;

                if (searchRes.success && searchRes.data) {
                    scrapedInfo += `\n簡介: ${searchRes.data.summary}`;
                    setFormData(prev => ({
                        ...prev,
                        coverUrl: searchRes.data.coverUrl || prev.coverUrl,
                        author: searchRes.data.author || prev.author,
                        publisher: searchRes.data.publisher || prev.publisher,
                        category: searchRes.data.category || prev.category
                    }));
                }

                setToast('✍️ AI 正在濃縮精華內容 (100字內)...');
                const aiRes = await apiService.generateSummary(scrapedInfo, auth);
                if (aiRes && aiRes.summary) {
                    setFormData(prev => ({ ...prev, summary: aiRes.summary }));
                    setToast('✅ 辨識與濃縮完成！');
                } else {
                    setToast('✅ 辨識完成！');
                }
            } else {
                setToast(`❌ 辨識失敗：${ocrRes.message || '連線超時'}`);
            }
        } catch (err) {
            setToast('❌ 圖片處理異常');
        } finally {
            setOcrLoading(false);
        }
    };

    const handleUrlInquiry = async () => {
        if (!bookUrl) return setToast('⚠️ 請先輸入網址');
        setOcrLoading(true);
        setToast('🌐 正在解析網頁內容...');
        
        try {
            const res = await apiService.scrapeUrl(bookUrl, auth);
            if (res.success) {
                setFormData(prev => ({
                    ...prev,
                    title: res.title || '',
                    author: res.author || '',
                    publisher: res.publisher || '',
                    category: res.category || '',
                    coverUrl: res.coverUrl || '',
                    completionDate: new Date().toISOString().split('T')[0]
                }));

                setToast('✍️ AI 正在濃縮精華內容 (100字內)...');
                const aiRes = await apiService.generateSummary(res.rawDescription || res.title, auth);
                if (aiRes && aiRes.summary) {
                    setFormData(prev => ({ ...prev, summary: aiRes.summary }));
                }
                setToast('✅ 網址解析與濃縮完成！');
                setBookUrl(''); // 清空
            } else {
                setToast(`❌ 解析失敗: ${res.message}`);
            }
        } catch (e) {
            setToast('❌ 網址解析異常');
        } finally {
            setOcrLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title) return setToast('⚠️ 請至少輸入書名');
        
        setLoading(true);
        try {
            const res = await apiService.submitRecord(formData, auth);
            if (res.success) {
                setToast('✅ 紀錄已成功存檔！');
                setFormData({ title: '', subtitle: '', author: '', publisher: '', category: '', completionDate: '', summary: '', coverUrl: '' });
                fetchRecords();
            } else {
                setToast(`❌ 儲存失敗: ${res.message}`);
            }
        } catch (e) {
            setToast('❌ 連線至伺服器失敗');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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
                    <input type="text" placeholder="帳號" value={loginData.username} onChange={(e) => setLoginData({...loginData, username: e.target.value})} />
                    <input type="password" placeholder="密碼" value={loginData.password} onChange={(e) => setLoginData({...loginData, password: e.target.value})} />
                    <button onClick={() => { setAuth(loginData); localStorage.setItem('myread_auth', JSON.stringify(loginData)); }} className="submit-btn" style={{ marginTop: '20px' }}>進入書庫</button>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <div className="site-header">
                <h1 onClick={() => setCurrentPage('home')} style={{ cursor: 'pointer' }}><BookIcon /> 書香閱讀</h1>
                <nav className="page-nav">
                    <button className={`nav-btn ${currentPage === 'home' ? 'active' : ''}`} onClick={() => setCurrentPage('home')}>首頁</button>
                    <button className={`nav-btn ${currentPage === 'list' ? 'active' : ''}`} onClick={() => setCurrentPage('list')}>閱讀紀錄</button>
                    <button className={`nav-btn ${currentPage === 'stats' ? 'active' : ''}`} onClick={() => setCurrentPage('stats')}>數據中心</button>
                    <button className="nav-btn logout" onClick={() => { setAuth(null); localStorage.removeItem('myread_auth'); }}>登出</button>
                </nav>
            </div>

            {toast && <div className="toast-notification">{toast}</div>}

            {currentPage === 'home' && (
                <>
                    <div className="home-stats-line">
                        <div className="home-stats-text">累計閱讀<span>{records.length}</span>本</div>
                    </div>

                    <div className="form-container">
                        <form onSubmit={handleSubmit}>
                            <div className="form-grid-layout">
                                <div className="upload-section">
                                    <label className="upload-label">
                                        {formData.coverUrl ? (
                                            <img src={formData.coverUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => e.target.src = DEFAULT_COVER} />
                                        ) : (
                                            <div className="upload-placeholder">
                                                <CameraIcon />
                                                <span style={{ fontSize: '0.9rem', textAlign: 'center' }}>上傳書籍封面</span>
                                                {ocrLoading && <div className="ocr-loading"><span>分析中...</span></div>}
                                            </div>
                                        )}
                                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden-input" />
                                    </label>
                                </div>
                                <div className="input-box" style={{ justifyContent: 'center' }}>
                                    <label>🔗 輸入書籍介紹網址</label>
                                    <input 
                                        name="bookUrl" 
                                        type="text" 
                                        value={bookUrl} 
                                        onChange={(e) => setBookUrl(e.target.value)} 
                                        placeholder="https://www.books.com.tw/..." 
                                    />
                                    <div style={{ marginTop: '12px' }}>
                                        <label>📖 封面連結 (自動填入/手動修改)</label>
                                        <input name="coverUrl" type="text" value={formData.coverUrl} onChange={handleInputChange} placeholder="自動填入或手動輸入網址" />
                                    </div>
                                    <button type="button" onClick={handleUrlInquiry} className="nav-btn" style={{ marginTop: '15px', width: '100%', height: '42px', background: 'rgba(251, 111, 146, 0.1)' }}>
                                        🚀 開始解析資料
                                    </button>
                                </div>
                            </div>

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
                                    <label>✨ AI 心得</label>
                                    <textarea name="summary" value={formData.summary} onChange={handleInputChange} rows="5" placeholder="自動產生的精華摘要..." />
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
                        <button className="nav-btn secondary" onClick={() => setCurrentPage('list')}>看全部</button>
                    </div>
                    {fetching ? <div className="loader-text">載入中...</div> : (
                        <div className="books-list">
                            {records.length > 0 ? (
                                records.slice(0, 5).map((r, i) => (
                                    <BookListItem key={i} record={r} defaultCover={DEFAULT_COVER} onClick={() => { setSelectedRecord(r); setCurrentPage('detail'); }} />
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
                    <div className="stats-item" style={{ width: '100%', marginBottom: '2rem' }}>
                        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.4rem' }}>📚 分類佔比</h3>
                        <PieChart data={Object.entries(records.reduce((acc, r) => {
                            const cat = getMainCategory(r.category);
                            acc[cat] = (acc[cat] || 0) + 1;
                            return acc;
                        }, {})).sort((a,b) => b[1]-a[1])} />
                    </div>
                    <div className="stats-item" style={{ width: '100%' }}>
                        <YearlyChart records={records} />
                    </div>
                </div>
            )}

            {currentPage === 'list' && (
                <div className="books-list" style={{ marginTop: '20px' }}>
                    {records.map((r, i) => (
                        <BookListItem key={i} record={r} defaultCover={DEFAULT_COVER} onClick={() => { setSelectedRecord(r); setCurrentPage('detail'); }} />
                    ))}
                </div>
            )}

            {currentPage === 'detail' && selectedRecord && (
                <div className="book-detail">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
                        <button className="back-btn" style={{ marginBottom: 0 }} onClick={() => { setIsEditing(false); setCurrentPage(records.length > 5 ? 'list' : 'home'); }}>← 返回書庫</button>
                        <button className="nav-btn" onClick={async () => {
                            if (isEditing) {
                                setLoading(true);
                                const res = await apiService.updateRecord(selectedRecord, auth);
                                if (res.success) {
                                    setToast('✅ 資料更新成功！');
                                    fetchRecords();
                                    setIsEditing(false);
                                } else {
                                    setToast('❌ 更新失敗');
                                }
                                setLoading(false);
                            } else {
                                setIsEditing(true);
                            }
                        }}>
                            {isEditing ? (loading ? '儲存中...' : '確認儲存') : '編輯資料'}
                        </button>
                    </div>

                    <div className="detail-hero">
                        <img src={selectedRecord.coverUrl || DEFAULT_COVER} className="detail-cover-img" alt="封面" />
                        <div className="detail-main">
                            {isEditing ? (
                                <div className="edit-form grid-2">
                                    <div className="input-box" style={{ gridColumn: 'span 2' }}>
                                        <label>📖 高清封面連結</label>
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
                                        <label>📝 AI 摘要精華</label>
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
                                        📅 閱讀完成日：{selectedRecord.completionDate || '未記錄'}
                                    </p>
                                    <div className="detail-summary-section">
                                        <h3>📝 AI 摘要精華</h3>
                                        <p className="detail-summary-text">{selectedRecord.summary}</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
