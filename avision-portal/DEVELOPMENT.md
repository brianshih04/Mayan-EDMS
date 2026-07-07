# 開發說明

## 專案定位

Avision EDMS Portal 是 Mayan-EDMS 的簡化前台，不取代 Mayan。Mayan 仍是主要文件管理後端，本專案只負責提供更容易使用的角色式 UI/UX。

## 技術棧

- React
- Vite
- lucide-react
- PowerShell 啟動腳本

目前 P0 / P1 / P2 主要功能已完成，P4 operator UI 也已開始落地：operator 已接本機 watch folder、PDF/TIFF 逐頁轉圖、Mayan 匯入與匯入後刪檔、文件分類、OCR 校正 UI、metadata 與送審；reviewer 可透過 Mayan workflow 核准 / 退回並校正 OCR；viewer 可搜尋、預覽與下載；admin 可新增文件類型、建立使用者、查看系統狀態與 batch queue。

## 目錄結構

```text
avision-portal/
  public/
    avision-mark.svg
  src/
    locales.js
    main.jsx
    portalConfig.js
    styles.css
  server/
    lib/
    router.js
  scripts/
    mayan-bootstrap.mjs
    portal-smoke.mjs
  README.md
  CHANGELOG.md
  DEVELOPMENT.md
  USERGUIDE.md
  package.json
  start-portal.ps1
  build-portal.ps1
  preview-portal.ps1
```

## 開發指令

安裝套件：

```powershell
npm install
```

啟動開發伺服器：

```powershell
npm run dev
```

或使用腳本：

```powershell
.\start-portal.ps1
```

建立 production build：

```powershell
npm run build
```

檢查 lint：

```powershell
npm run lint
```

執行 smoke test：

```powershell
$env:MAYAN_SERVICE_TOKEN=[Environment]::GetEnvironmentVariable('MAYAN_SERVICE_TOKEN','User')
npm run test:smoke
```

或使用腳本：

```powershell
.\build-portal.ps1
```

預覽 build 結果：

```powershell
npm run preview
```

## 多國語言

目前語系字串已拆到 `src/locales.js`，scanner-specific strings 也在同一檔案中，透過 `useTranslation()` 合併使用。

已支援：

- `zh-TW`：繁體中文。
- `en`：英文。
- `ja`：日文。
- `zh-CN`：簡體中文。

後續若需要交給翻譯人員維護，可再從 `src/locales.js` 拆成 `locales/*.json` 或導入 i18n 套件。

## 角色式 UI 設計

角色與導航目前定義在 `src/portalConfig.js`：

- `demoUsers`
- `roleNav`
- `tasks`
- `panels`

目前產品角色為：

- `operator`：合併 scanner + records，負責掃描匯入、縮圖 QC、OCR 檢查 / 校正、文件分類、metadata、送審。
- `reviewer`：負責審核、OCR 複核 / 校正、核准、退回與審核註記。
- `viewer`：唯讀查詢、預覽、下載。
- `admin`：使用者、文件類型、系統狀態與設定。

OCR 不應做成獨立角色，也不應放到 viewer。OCR 屬於資料品質確認，應由 operator 在文件分類與 metadata 補齊時先完成；reviewer 審核時若發現 OCR 錯誤，也能直接校正或退回 operator 補正。既有 `Scanner` / `Records` Mayan group 目前都映射到 operator 工作台。

## Mayan API 整合狀態

目前已完成：

1. Scanner watch folder 狀態顯示與批次建立。
2. Mayan 帳號密碼登入與 8 小時 session timeout。
3. 讀取目前使用者資訊。
4. 依 Mayan group / role 對應 portal role。
5. 文件搜尋、文件清單與預覽。
6. metadata 更新。
7. Mayan workflow 送審 / 核准 / 退回。
8. Admin 文件類型、使用者建立、系統狀態與設定。

Portal 內已加入 operator / reviewer OCR 校正 UI。尚待下一階段補上正式 OCR workflow API：匯入後讀取 Mayan OCR / parsed text 狀態、將校正文字寫回 Mayan，並在審核流程中保存 OCR 確認狀態。

## Scanner 本機 API

Scanner API 目前由 `server/router.js` + `server/lib/*` 提供，並以 Vite plugin 掛到 dev / preview server，方便 Cloudflare tunnel 直接轉發到 `localhost:5174`：

- `GET /api/scanner/watch-folder`
- `GET /api/scanner/files/:fileName`
- `DELETE /api/scanner/files/:fileName`
- `GET /api/scanner/files/:fileName/pages`
- `GET /api/scanner/files/:fileName/pages/:page/thumbnail`
- `GET /api/scanner/files/:fileName/pages/:page/image`
- `POST /api/scanner/batches`

預設讀取：

```text
E:\watch_folder
```

可用環境變數覆寫：

```powershell
$env:AVISION_WATCH_FOLDER = 'D:\your_watch_folder'
npm run dev
```

建立批次時不會自動搬移原始掃描檔。使用者可手動「刪除選取」，或在匯入 Mayan 前勾選「匯入成功後刪除原始檔」。manifest 預設寫入：

```text
E:\Mayan-EDMS-Docker\data\portal\batches\SCAN-*.json
```

可用 `AVISION_PORTAL_STATE_DIR` 改變狀態目錄。

Scanner 預覽：

- JPG、JPEG、PNG、BMP 可直接顯示並用瀏覽器 canvas 做空白頁輔助偵測。
- PDF/TIFF 透過 `mupdf` 在 server 端逐頁轉 PNG，並做逐頁空白頁偵測。

## 本機 Mayan 設定

目前 Mayan 後端網址：

```text
https://mayan-emds.avision-gb10.org
```

本機 Mayan Docker 對應：

```text
http://localhost:8080
```

Watch folder：

```text
Windows: E:\watch_folder
Mayan:   /watch_folder
```

## 開發原則

- 不直接修改 Mayan core，避免未來升級困難。
- 一般使用者留在簡化前台。
- 管理員必要時才進 Mayan 原生後台。
- UI 以工作流程為中心，不呈現 Mayan 的完整設定樹。
- 新功能先做成角色可理解的操作，再接 Mayan API。

## Mayan 整合（P1）

Portal 後端（Vite middleware，`server/`）以 **service token** 代理 Mayan API：登入驗證使用者帳密、以 service token 查群組對應角色、列文件類型、建立文件類型、上傳文件。原因是 Mayan 採 ACL 權限模型，新建使用者看不到資料，因此由 portal 後端用一組具權限的 service token 統一存取，而不替每個使用者設 ACL。敏感管理操作（例如新增文件類型）會再用使用者 token 解析 portal role，只有 admin 可執行。

### 環境變數

- `MAYAN_API_URL`：Mayan REST base，預設 `http://localhost:8080/api/v4`。
- `MAYAN_SERVICE_TOKEN`：**必填**。portal 後端用的 service token（admin 或同等權限帳號的 DRF token）。用 `scripts/mayan-bootstrap.mjs` 產生與印出。
- `AVISION_WATCH_FOLDER`、`AVISION_PORTAL_STATE_DIR`：同前。

### 一次性設定（建立群組與測試帳號）

```powershell
$env:MAYAN_ADMIN_PASSWORD='<mayan admin 密碼>'
node avision-portal\scripts\mayan-bootstrap.mjs
```

腳本會：建立 `Scanner/Records/Reviewer/Viewer/Admin` 群組、建立測試使用者（`scanner/records/reviewer/viewer`，密碼 `Avision-Portal-2026!`）、驗證登入與上傳，最後印出 service token。把該 token 設為 `MAYAN_SERVICE_TOKEN` 再啟動 portal。

### 啟動（含 service token）

```powershell
$env:MAYAN_SERVICE_TOKEN='<bootstrap 印出的 token>'
.\start-system.ps1
```

`start-system.ps1` 會 build + preview + cloudflared，子行程繼承環境變數。

### 離線 demo

若 Mayan 暫時不可用，可用舊的 demo 登入：啟動時多設 `VITE_DEMO_LOGIN=1`（前端用 demo 帳號，不呼叫 Mayan）。
