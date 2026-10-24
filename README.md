# 青安 3.0 房貸試算所

免登入、純靜態的青安 3.0 試算網站。使用者輸入只在瀏覽器內計算，不會傳送到伺服器。

**線上試用：** <https://larryveryhandsome.github.io/qing-an-3-calculator/>

## 已實作

- 青安 3.0 資格檢查：無自有住宅、自住、限貸一次、年齡、所得、區域總價、年限與寬限期。
- 額度試算：一般／新婚／育有未成年子女額度，以及最高 8 成 LTV 取低值。
- 3+3 補貼：前 36 個月補貼 0.5 個百分點；第 4、5、6 年分別為 0.375、0.25、0.125 個百分點；之後回原利率。
- 每月模擬還款、前 6 年明細、未套補貼比較與列印報告。
- 響應式、鍵盤可操作、具焦點提示與減少動態效果支援。

## 需要哪些金鑰？

不需要。本工具是純靜態網頁，沒有後端、不呼叫任何需要 API key／token 的服務，使用者輸入也只在瀏覽器內計算。

## 本機驗證

```powershell
npm.cmd test
```

要預覽靜態網站，可在此目錄執行：

```powershell
python -m http.server 8080
```

再開啟 `http://localhost:8080`。

## 對外部署（Netlify）

此專案沒有建置步驟，已附 `netlify.toml` 與安全標頭。最簡單的公開方式：

1. 在 [Netlify](https://app.netlify.com/drop) 登入後，把整個專案資料夾拖入。
2. Netlify 會提供 `*.netlify.app` 公開網址；可在 Site configuration 綁定自有網域。
3. 日後更新檔案後重新拖入，或連接 GitHub repository 取得自動部署。

## 換成你自己的顧問資料

頁面上方的「顧問卡」預設是示範資料（王小明、0900-000-000），並且會顯示「示範資料，請換成你自己的」。換成自己的只要改一個檔：

1. 打開 `advisor.config.js`。
2. 把 `name`（姓名）、`company`（公司／分店）、`phone`（電話）、`line`（LINE ID 例如 `@myshop`，或 `https://lin.ee/…` 短網址）改成你的。
3. 要放照片的話，把照片放進 `assets/` 資料夾（例如 `assets/me.jpg`），再把 `photo` 填成 `"assets/me.jpg"`；不放照片就留空，會顯示姓名第一個字。
4. 把 `demo` 改成 `false`，示範標示就會消失。
5. 不想顯示顧問卡：把 `enabled` 改成 `false`。

`phone`、`line` 留空就不會顯示那個按鈕。照片只能用站內的相對路徑，原則上不支援外部網址。

## 對外部署（GitHub Pages）

專案已附 GitHub Pages 自動部署工作流程。首次推送到公開 GitHub repository 的 `main` 分支後，工作流程會自動發布網站；後續每次推送也會更新。GitHub Pages 對公開 repository 可使用，實際網址由 GitHub 在部署完成後提供。

## 政策資料來源

- [財政部：青安貸款 3.0，2026-07-16](https://www.mof.gov.tw/singlehtml/384fb3077bb349ea973e7fc6f13b6974?cntId=482aa9c142b34abc83750cb64c15cb11)
- [行政院官網](https://www.ey.gov.tw/)（原方案說明頁已下架，請於官網搜尋「青安 3.0」；實際內容以主管機關公告為準）

本工具為教育與初步規劃用途，並非銀行核貸承諾或個別財務建議。利率、鑑價、負債所得比與實際攤還方式，均須以承辦銀行最終核定為準。

## 已知問題

- 本次修正：總價空白／0／負數時，結果原本顯示「條件初步符合」，現在顯示「請先輸入房屋總價」並在欄位下提示（用瀏覽器驗證，未另寫自動化測試）。
- 政策資料更新到 2026/07/18；政策若再調整，要手動更新 calculator.js 的 POLICY 與頁面日期（頁面與 README 都寫「以主管機關公告與承辦銀行核定為準」）。
- 「其他縣市」選項移除了括號內的地名。
- repo 目前沒有 LICENSE 檔，依法預設是「保留所有權利」，別人不能合法複製使用；建議比照其他 tw-* 工具用 Apache-2.0（授權要由維護者決定，這次沒有擅自加）。
- 只實測 Chromium（桌機與 375 寬）。

完整的發布前檢查（八道閘門）見 [RELEASE_CHECK.md](RELEASE_CHECK.md)。

## 🛠️ 需要客製化？

這個工具是開源的，可以免費使用。如果你想要：
- 改成符合你們公司的流程、欄位或品牌
- 串接你現在在用的系統（LINE、Google 表單、POS、會計軟體……）
- 幫你安裝、架站、教學，或長期維護

歡迎加 LINE 跟我們聊。我們會依需求的範圍與複雜度報價，原則上以實際報價單為準。

<a href="https://lin.ee/pdYGARu"><img src="https://scdn.line-apps.com/n/line_add_friends/btn/zh-Hant.png" alt="加入好友" height="36"></a>

- 💬 LINE 官方帳號：[@812ibtir](https://lin.ee/pdYGARu)（請註明「青安 3.0 房貸試算 客製化」）
- 🏢 留白事務所：網頁設計、AI 自動化、房仲遠端助理
- 👤 作者：[留白事務所](https://github.com/Larryveryhandsome)
