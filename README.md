# 青安 3.0 房貸試算所

免登入、純靜態的青安 3.0 試算網站。使用者輸入只在瀏覽器內計算，不會傳送到伺服器。

## 已實作

- 青安 3.0 資格檢查：無自有住宅、自住、限貸一次、年齡、所得、區域總價、年限與寬限期。
- 額度試算：一般／新婚／育有未成年子女額度，以及最高 8 成 LTV 取低值。
- 3+3 補貼：前 36 個月補貼 0.5 個百分點；第 4、5、6 年分別為 0.375、0.25、0.125 個百分點；之後回原利率。
- 每月模擬還款、前 6 年明細、未套補貼比較與列印報告。
- 響應式、鍵盤可操作、具焦點提示與減少動態效果支援。

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

## 對外部署（GitHub Pages）

專案已附 GitHub Pages 自動部署工作流程。首次推送到公開 GitHub repository 的 `main` 分支後，工作流程會自動發布網站；後續每次推送也會更新。GitHub Pages 對公開 repository 可使用，實際網址由 GitHub 在部署完成後提供。

## 政策資料來源

- [財政部：青安貸款 3.0，2026-07-16](https://www.mof.gov.tw/singlehtml/384fb3077bb349ea973e7fc6f13b6974?cntId=482aa9c142b34abc83750cb64c15cb11)
- [行政院：青安 3.0 方案說明，2026-07-16](https://cpc.ey.gov.tw/Page/8AC028685E311A7/e1cbf8e8-c298-4d35-b735-47ad16fd2b7d)

本工具為教育與初步規劃用途，並非銀行核貸承諾或個別財務建議。利率、鑑價、負債所得比與實際攤還方式，均須以承辦銀行最終核定為準。
