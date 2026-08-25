# 專案計劃書

## 基本資訊
- 專案名稱：My_Read（智慧閱讀紀錄系統）
- 建立日期：2026-02-24
- 負責人：Tulip
- 狀態：[ ] 規劃中 / [x] 進行中 / [ ] 完成

## 專案概況
上傳書籍封面，Gemini AI 自動辨識書名，查詢書籍資訊並歸檔至 Google Sheets，以前端儀表板呈現閱讀紀錄。

- **使用者**：Tulip 個人使用
- **核心功能**：封面辨識書名、書籍資訊查詢、Google Sheets 歸檔、閱讀統計儀表板
- **目前版本**：開發中

## 目標與背景
用拍封面的方式快速記錄讀過的書，讓書單管理變得輕鬆。

## 資源評估
| 項目 | 說明 |
|---|---|
| 使用工具 | React、Vite、Google Apps Script |
| 外部 API / 服務 | Gemini API（辨識）、Google Sheets API、Google Books API（已評估不適用） |
| 部署 | 待定 |

## 實作步驟
- [x] 建立 React + Vite 前端架構
- [x] 串接 Gemini AI 封面辨識
- [x] 建立 Google Apps Script 後端（gas_backend.gs）
- [x] 串接 Google Sheets 歸檔
- [ ] 完成前端儀表板 UI
- [ ] 部署上線

## 當前進度備註
- **最後更新**：2026-08-25
- **使用工具**：Claude Code
- **做到哪裡**：修復博客來網址解析錯誤（改用 Firecrawl 抓商品頁）、OCR 自動查詢的隱藏例外、AI 心得摘要空白、手機版預覽卡片排版被裁切、正式站前端 5 個月未部署等問題；已重新部署正式站並推送至 GitHub main（詳見 `docs/log.md` V4.2）。前端儀表板 UI 仍待完成。
- **下一步**：完成前端儀表板；視情況清理 `gas_backend.gs` 殘留的除錯欄位（debugPhase/debugId 等，不影響功能）。
- **注意事項**：Google Books API 評估後不適合中文書，改用 Gemini Search Grounding；博客來網址解析現依賴 Firecrawl（GAS Script Properties 需設定 `FIRECRAWL_API_KEY`）；GAS 後端修改後務必用「管理部署作業→編輯→新版本」部署，不可新建部署（會變更 `/exec` 網址）。

## 完成定義（Done Criteria）
- 上傳書籍封面可自動辨識並記錄，儀表板可正常瀏覽
