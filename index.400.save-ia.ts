/**
 * DBに保存されているURL一覧から、実際にIAにリクエストを投げてアーカイブさせる。
 * 数千件あるので長期間動かし続ける必要あり。デバッグモードではなく直に動かしたい
 * まだ完了してない。閉鎖するまでに終わらせたい
 * deno run -A "index.400.save-ia.ts"
 */
import { Database } from "./src/database.ts";
const IA_AUTH = `XhZDnsDKGWUqdeyx:TYX7wfjf71bI7Lo4`;
const db = Database.instance;
db.init();
while (true) {
  const nextQueueItems = db.getNextIaArchiveRequest(10);
  if (nextQueueItems.length == 0) {
    break;
  }
  console.log(`${nextQueueItems.length} 件のURLを登録、確認する`);
  let skipRegistration = false;
  try {
    for (const v of nextQueueItems) {
      if (v.registrationResponse == null) {
        if (skipRegistration) {
          continue;
        }
        const postBody = new URLSearchParams();
        postBody.append("url", v.needDlUrl);
        postBody.append("capture_outlinks", "1");
        postBody.append("capture_screenshot", "1");
        postBody.append("if_not_archived_within", "3650d");
        const resp = await fetch(
          "https://web.archive.org/save",
          {
            method: "POST",
            body: postBody,
            headers: {
              "Accept": "application/json",
              "Authorization": `LOW ${IA_AUTH}`,
            }
          }
        );
        const respBody = await resp.json();
        if (resp.status != 200) {
          if (respBody?.status == "error" && respBody?.status_ext == "error:user-session-limit") {
            console.log(`error:user-session-limit なので1分待機. ${v.needDlUrl}`);
            //await new Promise(resolve => { setTimeout(() => { resolve(null) }, 30 * 1000) });
            skipRegistration = true;
            continue;
          }
          throw new Error(`${v.needDlUrl} ${JSON.stringify(respBody, null, 2)}`);
        } else if (respBody.job_id == null) {
          db.upsertIaArchiveRequest(
            v.needDlUrl,
            JSON.stringify(respBody),
          );
          console.log(`済み ${v.needDlUrl} , ${JSON.stringify(respBody)}`);
          db.upsertIaArchiveRequestStatus(
            v.needDlUrl,
            1,
            JSON.stringify(respBody),
          );
        } else {
          db.upsertIaArchiveRequest(
            v.needDlUrl,
            JSON.stringify(respBody),
          );
          console.log(`登録 ${v.needDlUrl} , ${JSON.stringify(respBody)}`);
        }
      } else {
        // 登録済みなのでチェックをする
        const jobId = String(JSON.parse(v.registrationResponse)?.job_id ?? "");
        if (jobId.length == 0) {
          throw new Error(v.registrationResponse);
        }
        const response = await fetch(`https://web.archive.org/save/status/${jobId}`)
        if (response.status != 200) {
          throw new Error(`statusCode:${response.status} , response:${v.registrationResponse}`);
        }
        const responseJson = await response.json();
        const pringResponse = structuredClone(responseJson);
        delete pringResponse["resources"];
        delete pringResponse["outlinks"];
        if (responseJson.status == "success") {
          console.log(`完了 ${v.needDlUrl} , ${JSON.stringify(pringResponse)}`);
          db.upsertIaArchiveRequestStatus(
            v.needDlUrl,
            1,
            JSON.stringify(responseJson),
          );
        } else if (responseJson.status == "pending") {
          console.log(`途中 ${v.needDlUrl} , ${JSON.stringify(pringResponse)}`);
          db.upsertIaArchiveRequestStatus(
            v.needDlUrl,
            0,
            JSON.stringify(responseJson),
          );
        } else if (responseJson.status == "error") {
          console.log(`異常 ${v.needDlUrl} , ${JSON.stringify(pringResponse)}`);
          db.upsertIaArchiveRequestStatus(
            v.needDlUrl,
            2,
            JSON.stringify(responseJson),
          );
        } else {
          throw new Error(JSON.stringify(responseJson, null, 2))
        }
      }
    }
  } catch (error) {
    console.error(error);
    await new Promise(resolve => { setTimeout(() => { resolve(null) }, 60 * 1000) });
  }
  await new Promise(resolve => { setTimeout(() => { resolve(null) }, 5 * 1000) });
}
console.log(`全て完了`);
