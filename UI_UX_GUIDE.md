# 🎨 書香閱讀 (MyRead) 介面與設計規範 (UI_UX_GUIDE)

## 1. 核心風格：Aesthetic Glassmorphism (視覺玻璃擬態)
致力於營造一種「深夜書房」的沉浸感。利用半透明層次、模糊效果與細膩的邊框發光，展現高質感的數位閱讀空間。

### 🎨 配色方案 (Color Palette)
| 用途 | 顏色代碼 | 說明 |
| :--- | :--- | :--- |
| **背景主色** | `#0f1115` | 深邃暗色背景 |
| **卡片背景** | `rgba(25, 28, 35, 0.6)` | 半透明磨砂卡片 |
| **品牌強調色** | `#fb6f92` | 溫潤的櫻花粉 (Accent Pink) |
| **懸停發光** | `rgba(251, 111, 146, 0.4)` | 粉色霓虹光暈 |
| **文字主要** | `#ffffff` | 純白 (High Contrast) |
| **文字次要** | `rgba(255, 255, 255, 0.6)` | 柔和灰色 |

### 🔡 字體規範 (Typography)
- **英文/數字**: `Outcome`, `Outfit` (簡約現代感，且開源於 Google Fonts)。
- **中文內容**: `Noto Sans TC`, `Inter`, `system-ui` (確保跨平台閱讀流暢)。
- **標誌/標題**: 800 (Extra Bold)。
- **內文正文**: 400 (Regular)，行距定為 `1.8` 以利長文摘要閱讀。

## 2. 組件行為 (Component Logic)
- **卡片設計**: 統一 `28px` 圓角，邊框使用 `1px solid rgba(255, 255, 255, 0.1)` 增加邊緣切割感。
- **編輯模式**: 點擊「編輯資料」後，UI 背景微幅變深，輸入框使用 `box-shadow` 聚焦，給予明確的互動反饋。
- **載入動畫**: 使用 `pulse` 或 `shimmer` 效果處理 AI 辨識中的骨架屏佔位。

## 3. RWD 響應式邏輯
- **Desktop (900px+)**: 表單與統計圖採併排顯示。
- **Tablet/Mobile**: 
  - 自動切換為單欄垂直佈局。
  - 統計圖表寬度 100%。
  - 頂部導航簡化為圖示模式。

## 4. 微交互 (Micro-Animations)
- **Hover**: 所有按鈕需具備 `scale(1.02)` 與 `filter: brightness(1.1)` 效果。
- **Page Transitions**: 使用 CSS Keyframes `fadeInDown` 處理視窗切换，確保視覺不跳轉。
