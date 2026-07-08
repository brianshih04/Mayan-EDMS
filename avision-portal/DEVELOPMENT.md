# 開發說明

本文件是 Avision EDMS Portal 的唯一開發入口。後續 coding agent 接手時，請先讀本文件，再看 `TODOLIST.md` 與 `CHANGELOG.md`。

## 專案定位

Avision EDMS Portal 是 Mayan-EDMS 上方的角色式簡化前台，不取代 Mayan core。Mayan 仍負責正式文件儲存、OCR、索引、權限、搜尋與 workflow；Portal 負責把日常操作整理成簡單的工作台。

目前狀態（2026-07-07）：

- P0 / P1 / P2 主要項目已完成。
- P3 已補 ESLint、smoke test、`.env.example`，並完成 `src/locales.js` / `src/portalConfig.js` 拆檔。
- P4 已完成 operator 角色收斂與 OCR 校正 UI。
- OCR 正式讀寫 Mayan API 仍待下一階段串接。

## 目前環境

- 專案位置：`E:\Projects\Mayan-EDMS\avision-portal`
- 本機入口：`http://localhost:5174`
- Cloudflare 入口：`https://mayan-portal.avision-gb10.org`
- Mayan 入口：`https://mayan-emds.avision-gb10.org`
- Mayan Docker 工作目錄：`E:\Mayan-EDMS-Docker`
- Watch folder：`E:\watch_folder`
- Portal state：`E:\Mayan-EDMS-Docker\data\portal`

## 技術棧

- React
- Vite
- lucide-react
- Node middleware mounted by Vite
- PowerShell 啟動腳本

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
  docs/
    cloudflare-tunnel.md
  README.md
  CHANGELOG.md
  DEVELOPMENT.md
  TODOLIST.md
  USERGUIDE.md
  package.json
  start-portal.ps1
  start-system.ps1
```

## 開發指令

```powershell
cd E:\Projects\Mayan-EDMS\avision-portal
npm install
npm run dev
npm run lint
npm run build
$env:MAYAN_SERVICE_TOKEN=[Environment]::GetEnvironmentVariable('MAYAN_SERVICE_TOKEN','User')
npm run test:smoke
```

常用腳本：

```powershell
.\start-portal.ps1
.\build-portal.ps1
.\preview-portal.ps1
.\start-system.ps1
.\stop-system.ps1
.\check-system.ps1
```

## 角色與 UI/UX

目前產品角色為：

- `operator`：掃描匯入、縮圖 QC、空白頁檢查、Mayan 匯入、文件分類、OCR 校正、metadata、送審。
- `reviewer`：審核、OCR 複核 / 校正、核准、退回、審核註記。
- `viewer`：唯讀查詢、預覽、下載。
- `admin`：使用者、文件類型、系統狀態、Portal 設定。

既有 Mayan group 仍保留以維持相容性：

- `Operator` group → Portal `operator`
- `Scanner` group → Portal `operator`
- `Records` group → Portal `operator`
- `Reviewer` group → Portal `reviewer`
- `Viewer` group → Portal `viewer`
- `Admin` group / Mayan superuser → Portal `admin`

Operator 目前是 5 步流程：

```text
掃描匯入 -> 文件分類 -> OCR 校正 -> 資料欄位 -> 文件搜尋
```

OCR 不做成獨立角色，也不放到 viewer。Operator 先完成 OCR 初校；reviewer 審核時可校正小錯或退回 operator 補正。

## 多國語言

語系字串集中在 `src/locales.js`，目前支援：

- `zh-TW`：繁體中文
- `en`：英文
- `ja`：日文
- `zh-CN`：簡體中文

後續若需要交給翻譯人員維護，可再拆成 `locales/*.json` 或導入 i18n 套件。

## Backend Bridge

Vite 透過 `vite.config.js` 掛載 `server/router.js`，目前提供：

- `GET /api/scanner/watch-folder`
- `GET /api/scanner/files/:fileName`
- `DELETE /api/scanner/files/:fileName`
- `GET /api/scanner/files/:fileName/pages`
- `GET /api/scanner/files/:fileName/pages/:page/thumbnail`
- `GET /api/scanner/files/:fileName/pages/:page/image`
- `POST /api/scanner/batches`
- `POST /api/mayan/import`
- `GET/PATCH /api/mayan/documents/:id`
- `GET/POST /api/reviews`
- `GET/PATCH /api/system/settings`
- `GET /api/system/status`
- `GET /api/system/batches`
- `POST /api/admin/users`

Scanner API 必須持續防止 path traversal，只能處理 watch folder 內允許格式的檔案。

## Watch Folder 與 Batch

預設 watch folder：

```text
E:\watch_folder
```

可用環境變數覆寫：

```powershell
$env:AVISION_WATCH_FOLDER = 'D:\your_watch_folder'
npm run dev
```

Batch manifest 預設寫入：

```text
E:\Mayan-EDMS-Docker\data\portal\batches\SCAN-*.json
```

不要把 manifest 寫回 `E:\watch_folder`，避免 Mayan watch-folder source 把 manifest 當文件匯入。

## Mayan 整合

Portal 後端以 Mayan service token 代理資料存取：

- 登入使用使用者帳密取得 token。
- 後端用 service token 查 Mayan group 並解析 Portal role。
- 文件類型、文件清單、預覽、metadata、workflow、admin 建立使用者等由後端呼叫 Mayan API。
- 敏感操作仍會重新解析使用者 role，例如 admin API 只允許 admin。

環境變數：

- `MAYAN_API_URL`：Mayan REST base，預設 `http://localhost:8080/api/v4`
- `MAYAN_SERVICE_TOKEN`：必填，Portal 後端使用
- `AVISION_WATCH_FOLDER`：watch folder 路徑
- `AVISION_PORTAL_STATE_DIR`：Portal state 路徑

一次性 bootstrap：

```powershell
$env:MAYAN_ADMIN_PASSWORD='<mayan admin 密碼>'
node avision-portal\scripts\mayan-bootstrap.mjs
```

腳本會建立 `Scanner/Records/Reviewer/Viewer/Admin` 群組與 `scanner/records/reviewer/viewer` 測試使用者，預設密碼為 `Avision-Portal-2026!`。bootstrap 也會印出 service token；不要提交或公開 token。

## OCR 整合狀態

已完成：

- Operator 文件預覽區有 OCR 文字校正 UI。
- Reviewer 審核區有 OCR 複核 / 校正 UI。
- 文件流程與文件已標明 OCR 是 operator + reviewer 的責任。

尚待串接：

- 匯入 Mayan 後讀取 Mayan OCR / parsed text 結果。
- 將校正後 OCR 文字寫回 Mayan。
- 加入正式 OCR 狀態：未執行、執行中、需校正、已確認、失敗。
- 送審前檢查 OCR 是否已確認，或由 operator 明確標記「無需 OCR」。
- Viewer 搜尋使用已確認的 OCR / index 文字，但不提供修改。

## Cloudflare 掛載

目前使用同一條 Cloudflare named tunnel：`mayan-emds`

```yaml
tunnel: 30d74dba-9789-4cf3-805e-50e4573d6374
credentials-file: C:\Users\Brian\.cloudflared\30d74dba-9789-4cf3-805e-50e4573d6374.json

ingress:
  - hostname: mayan-emds.avision-gb10.org
    service: http://localhost:8080
  - hostname: mayan-portal.avision-gb10.org
    service: http://localhost:5174
  - service: http_status:404
```

設定檔：

```text
E:\Mayan-EDMS-Docker\cloudflared-mayan-emds.yml
```

DNS route：

```powershell
cloudflared tunnel route dns mayan-emds mayan-portal.avision-gb10.org
```

啟動 tunnel：

```powershell
cloudflared tunnel --config E:\Mayan-EDMS-Docker\cloudflared-mayan-emds.yml --logfile E:\Mayan-EDMS-Docker\cloudflared-mayan-emds.log run
```

詳細文件在 `docs/cloudflare-tunnel.md`。

## 開發原則

- 不直接修改 Mayan core，除非明確需要且已評估升級成本。
- 一般使用者留在 Portal，管理員必要時才進 Mayan 原生後台。
- UI 以工作流程為中心，不呈現 Mayan 完整設定樹。
- 新功能先做成角色可理解的操作，再接 Mayan API。
- `src/main.jsx` 仍偏大，下一階段應拆成 components / hooks。
- 長期可把 Vite middleware 抽成正式 backend service：`server/scanner`、`server/mayan`、`server/auth`。

## 每次交付前

- `npm run lint`
- `npm run build`
- `npm run test:smoke`
- 若改 UI，實際登入 `scanner` 或 `records` 確認進入 operator 工作台。
- 若改 Cloudflare，確認 `mayan-emds.avision-gb10.org` 與 `mayan-portal.avision-gb10.org` 都可用。
