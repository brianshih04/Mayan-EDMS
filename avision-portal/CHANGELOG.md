# 更新紀錄

本文件記錄 Avision EDMS Portal 的主要變更。

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
