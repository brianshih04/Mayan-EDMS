# 更新紀錄

本文件記錄 Avision EDMS Portal 的主要變更。

## Unreleased

### 產品角色設計

- 明確將下一階段角色收斂方向定為 `operator` / `reviewer` / `viewer` / `admin`。
- `operator` 會合併目前 scanner + records 的日常流程，包含掃描匯入、品質檢查、OCR 結果初次檢查 / 校正、metadata 補齊與送審。
- OCR 定位為資料品質工作，應由 operator 先完成；reviewer 審核時也可複核 / 校正 OCR，viewer 只負責查閱。
- Operator UI 已重新設計為 5 步流程列：掃描匯入、文件分類、OCR 校正、資料欄位、文件搜尋。
- Mayan `Scanner` 與 `Records` 群組現在都映射到 Portal `operator` role，既有 `scanner` / `records` 測試帳號會進同一個 operator 工作台。
- Operator 與 reviewer 文件預覽區已加入 OCR 文字校正 UI 與 OCR 確認狀態；正式 OCR 寫回 Mayan API 仍待下一階段串接。

### 後端重構

- 將 Vite middleware 內的掃描 API 抽出到 `server/` 目錄（`router.js` + `lib/{config,http,watchFolder,batch,convert,mayan,auth,roleMap}.js`），`vite.config.js` 只剩 plugin 接線。

### P0：Scanner 流程穩定化

- Scanner 改為「先選取再送出」：可勾選單一檔案、全選可見、清除選取，批次只含選取的檔案。
- 每個檔案可標記品質狀態：`正常` / `重掃` / `忽略`，狀態存於 `localStorage` 並寫入 batch manifest。
- 空白頁偵測改成可調靈敏度（4 段），降低誤判；顯示疑似空白總數與「只看疑似空白」過濾。
- 縮圖大小切換加上 tooltip；檔名顯示在預覽資訊卡與 hover tooltip。
- Batch manifest 升級到 schema v2（`qcState` / `qcNote` / `pages` / `importStatus` / `mayanDocumentId`）。
- Scanner 介面字串完成多國語系（zh-TW / en / ja / zh-CN）。

### P0：營運腳本

- 新增 `start-system.ps1`（build + preview + cloudflared，含 log 與 PID 記錄）。
- 新增 `stop-system.ps1`、`check-system.ps1`（四端點健康檢查）、`register-autostart.ps1`（登入時自動啟動）。
- 新增 `docs/cloudflare-tunnel.md`（sanitized 設定，不含 credentials）。

### P1：PDF / TIFF 逐頁轉圖

- 改用 `mupdf`（libmupdf WASM，PDF 與 TIFF 都能逐頁轉 PNG，免原生編譯）。
- 新增 API：`GET /api/scanner/files/:file/pages`、`/pages/:n/thumbnail`、`/pages/:n/image`，含磁碟快取與逐頁空白偵測。
- Scanner 對 PDF/TIFF 改以「頁」為單位顯示縮圖，每頁可獨立標記品質狀態。

### P1：Mayan 匯入

- 新增 Mayan REST client（`server/lib/mayan.js`）：token、目前使用者、群組、文件類型、上傳，含 429 節流重試。
- 新增 `POST /api/mayan/import`：以 service token 將 watch folder 檔案上傳到 Mayan，回寫 batch 狀態（`queued` → `importing` → `imported` / `failed`）與 Mayan document id。
- Scanner 加入文件類型選擇與匯入結果面板（每檔狀態、Mayan 連結、失敗重試）。
- Scanner 可手動刪除選取的 watch folder 檔案，並可選擇「匯入成功後刪除原始檔」；只刪成功匯入的檔案，失敗檔案保留。
- 新增 `scripts/mayan-bootstrap.mjs`：建立角色群組與測試帳號，並驗證登入/匯入流程。

### P1：登入與角色權限

- 登入改打 Mayan（`POST /api/auth/login`），以 service token 查群組 → 對應 portal 角色；超級使用者對應 admin。
- 保留 `VITE_DEMO_LOGIN=1` 離線 demo 登入備援。
- 新增環境變數 `MAYAN_SERVICE_TOKEN`（portal 後端用，資料存取與匯入）。
- 啟動腳本會從 Windows User environment 補入 `MAYAN_SERVICE_TOKEN`，並以 `--strictPort` 避免 preview server 默默改跑其他 port。

### P1：Admin 簡化管理

- Admin 畫面可直接新增 Mayan 文件類型，不必進入 Mayan 原生後台。
- 新增 `POST /api/mayan/document-types`，server 端重新驗證登入 token 並限制 admin role 才能建立文件類型。

### P2：Viewer 文件查詢

- Viewer 搜尋頁改為讀取 Mayan 真實文件清單，不再顯示 demo rows。
- 新增 `GET /api/mayan/documents`，以 service token 讀取最近文件，支援簡單關鍵字過濾並回傳 Mayan 文件連結。
- Viewer 可在 portal 內預覽文件頁面，並可下載 Mayan 原始檔。
- 新增文件頁面與二進位 proxy routes：`/api/mayan/documents/:id/pages`、`/files/:fileId/pages/:pageId/image`、`/files/:fileId/download`。

### P2：Records / Reviewer 工作台

- Records 的分類與 metadata 畫面改讀 Mayan 真實文件清單，可在 portal 內預覽文件並更新文件 label / description。
- Records 可寫入正式 Mayan metadata：Customer、Case ID、Document date、Amount、Tags；portal 會自動建立 metadata type 並掛到文件類型。
- Records 可將文件送審，送審後 reviewer 清單只顯示 pending 文件；送審會同步啟動 / 轉移 Mayan `Avision Review` workflow。
- Reviewer 審核畫面改讀 Mayan 真實文件清單，可核准或退回文件；狀態同步寫入 Mayan workflow，portal review state 作為 UI 快取與備援。
- 新增 Mayan review workflow helper：自動建立 `Avision Review` workflow、states、transitions，並掛到文件類型。
- 新增 portal review state store：`server/lib/reviews.js`，資料寫入 `AVISION_PORTAL_STATE_DIR/reviews.json`。
- Records 儲存文件類型前會先驗證 Mayan document type id，避免傳入不存在或不可用的 id。
- Reviewer 顯示最新 Mayan workflow state 與審核提示；退回文件可重新送審。

### P2：Admin / Viewer / System

- Viewer 搜尋加入 document type 與 Avision metadata filters（Customer、Case ID、Document date、Amount、Tags）。
- Admin 新增使用者建立入口，可指定 portal role 並自動加入對應 Mayan group。
- Admin System 畫面新增 Mayan、Portal、watch folder、Cloudflare health checks。
- Admin System 畫面新增 portal settings：預設縮圖大小、空白偵測靈敏度。
- Admin System 畫面新增最近 scanner batch queue。
- 新增 `GET/PATCH /api/system/settings`、`GET /api/system/status`、`GET /api/system/batches`、`POST /api/admin/users`。

### P3：工程整理

- 新增 `.env.example`。
- 新增 `npm run test:smoke`，驗證 Mayan service token、document types、documents、review workflow status、settings、batch queue。
- 前端登入 session 加入 8 小時到期自動登出。
- 將 base locales 與 scanner strings 從 `src/main.jsx` 拆到 `src/locales.js`。
- 將 demo users、role navigation、dashboard panels、workflow content 拆到 `src/portalConfig.js`。
- 新增 ESLint flat config 與 `npm run lint`，先以保守規則檢查未定義與未使用變數。


## 0.1.0 - 2026-07-05

### 新增

- 建立 React + Vite 前台專案。
- 加入角色導向 UI：
  - 掃描人員。
  - 分類人員。
  - 審核主管。
  - 查閱使用者。
  - 系統管理員。
- 加入多國語言切換：
  - 繁體中文。
  - English。
  - 日本語。
  - 简体中文。
- 加入 Mayan 後台入口連結。
- 加入 Watch folder 流程提示，預設使用：

```text
E:\watch_folder
```

- 加入本機啟動腳本：
  - `start-portal.ps1`
  - `build-portal.ps1`
  - `preview-portal.ps1`

### 驗證

- `npm install` 成功。
- `npm run build` 成功。
- 本機開發伺服器可在以下網址開啟：

```text
http://localhost:5174
```

## 下一步

- 將 `src/main.jsx` 繼續拆成 React components / hooks。
- 將 `src/locales.js` 拆成 JSON 或導入 i18n 套件。
- 補 Playwright E2E 測試，覆蓋 login、scanner、records、reviewer、viewer、admin flows。
- 評估將 Vite middleware 抽成正式 backend service。
