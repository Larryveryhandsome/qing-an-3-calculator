import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAdvisor } from "../advisor.js";
import config from "../advisor.config.js";

test("預設設定是明顯的示範資料，而且會顯示示範標示", () => {
  const a = normalizeAdvisor(config);
  assert.equal(a.demo, true);
  assert.equal(a.name, "王小明");
  assert.equal(a.tel, "tel:0900000000");
  assert.equal(a.photo, "");
  assert.equal(a.initial, "王");
});

test("換成自己的資料：電話、LINE ID、照片", () => {
  const a = normalizeAdvisor({ demo: false, name: "陳示範", phone: "0900-000-456", line: "@myshop", photo: "assets/me.jpg" });
  assert.equal(a.demo, false);
  assert.equal(a.tel, "tel:0900000456");
  assert.equal(a.lineUrl, "https://line.me/R/ti/p/%40myshop");
  assert.equal(a.photo, "assets/me.jpg");
});

test("LINE 可以直接貼官方短網址", () => {
  assert.equal(normalizeAdvisor({ name: "A", line: "https://lin.ee/abc123" }).lineUrl, "https://lin.ee/abc123");
  assert.equal(normalizeAdvisor({ name: "A", line: "javascript:alert(1)" }).lineUrl, "");
});

test("照片只接受站內相對路徑", () => {
  for (const bad of ["https://evil.example/x.jpg", "//evil/x.jpg", "javascript:alert(1)", "../secret.jpg", "assets/x.exe"]) {
    assert.equal(normalizeAdvisor({ name: "A", photo: bad }).photo, "", bad);
  }
});

test("沒填姓名或 enabled:false 就不顯示；電話太短不顯示撥號", () => {
  assert.equal(normalizeAdvisor({ name: "" }).enabled, false);
  assert.equal(normalizeAdvisor({ name: "A", enabled: false }).enabled, false);
  assert.equal(normalizeAdvisor({ name: "A", phone: "12" }).tel, "");
});
