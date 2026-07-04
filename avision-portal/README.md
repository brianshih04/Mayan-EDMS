# Avision EDMS Portal

Avision EDMS Portal 是建立在 Mayan-EDMS 之上的簡化前台。Mayan-EDMS 繼續負責文件儲存、OCR、權限、搜尋與流程管理；本前台負責把日常使用者會看到的畫面簡化成角色導向的工作台。

## 目標

- 讓不同角色只看到自己需要的 UI/UX。
- 降低 Mayan 原生後台的設定複雜度。
- 保留 Mayan 作為穩定的文件管理後端。
- 支援多國語言，第一版包含繁體中文、英文、日文、簡體中文。

## 目前角色

- `scanner`：掃描匯入、批次檢查。
- `records`：文件分類、metadata 編輯。
- `reviewer`：審核清單、決策工作。
- `viewer`：文件搜尋、檢視、下載入口。
- `admin`：使用者與角色、系統狀態、Mayan 後台入口。

## 啟動方式

```powershell
npm install
npm run dev
```

本機網址：

```text
http://localhost:5174
```

Mayan 後端網址：

```text
https://mayan-emds.avision-gb10.org
```

## 相關文件

- [CHANGELOG.md](./CHANGELOG.md)：版本紀錄。
- [DEVELOPMENT.md](./DEVELOPMENT.md)：開發與架構說明。
- [USERGUIDE.md](./USERGUIDE.md)：使用者操作指南。
