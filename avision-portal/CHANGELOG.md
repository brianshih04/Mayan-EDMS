# 更新紀錄

本文件記錄 Avision EDMS Portal 的主要變更。

## Unreleased

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

- 串接 Mayan REST API。
- 將 demo 工作清單改成真實文件資料。
- 依 Mayan 使用者權限切換角色工作台。
- 加入正式登入與 session 管理。
- 加入文件搜尋、預覽、metadata 更新與審核 API。
