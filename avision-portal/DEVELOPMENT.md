# 開發說明

## 專案定位

Avision EDMS Portal 是 Mayan-EDMS 的簡化前台，不取代 Mayan。Mayan 仍是主要文件管理後端，本專案只負責提供更容易使用的角色式 UI/UX。

## 技術棧

- React
- Vite
- lucide-react
- PowerShell 啟動腳本

目前 scanner 角色已透過 Vite middleware 接入本機 watch folder API；其他角色的工作清單與角色資料仍為前端 demo data。

## 目錄結構

```text
avision-portal/
  public/
    avision-mark.svg
  src/
    main.jsx
    styles.css
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

或使用腳本：

```powershell
.\build-portal.ps1
```

預覽 build 結果：

```powershell
npm run preview
```

## 多國語言

目前語系字串集中在 `src/main.jsx` 的 `locales` 物件中。

已支援：

- `zh-TW`：繁體中文。
- `en`：英文。
- `ja`：日文。
- `zh-CN`：簡體中文。

短期內可以先維持這種集中式字典。當字串量變大時，再拆成獨立 JSON 檔或導入 i18n 套件。

## 角色式 UI 設計

角色與導航目前定義在 `src/main.jsx`：

- `demoUsers`
- `roleNav`
- `tasks`
- `panels`

第一版目標是先確認操作體驗：

- 掃描人員只看掃描與批次檢查。
- 分類人員只看分類與 metadata。
- 審核主管只看審核清單。
- 查閱使用者只看搜尋與文件。
- 系統管理員才看到角色、系統與 Mayan 後台入口。

## Mayan API 整合方向

後續 API 串接建議分階段進行：

1. Scanner watch folder 狀態顯示與批次建立。已完成第一版。
2. 登入與 session。
3. 讀取目前使用者資訊。
4. 依 Mayan group / role 對應 portal role。
5. 文件搜尋。
6. 文件清單與預覽。
7. metadata 更新。
8. workflow 審核動作。

## Scanner 本機 API

Scanner API 目前在 `vite.config.js` 內以 Vite middleware 提供，方便 Cloudflare tunnel 直接轉發到 `localhost:5174`：

- `GET /api/scanner/watch-folder`
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

建立批次時不會搬移或刪除原始掃描檔。manifest 預設寫入：

```text
E:\Mayan-EDMS-Docker\data\portal\batches\SCAN-*.json
```

可用 `AVISION_PORTAL_STATE_DIR` 改變狀態目錄。

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
