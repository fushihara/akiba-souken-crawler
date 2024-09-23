import { TextLineStream } from "jsr:@std/streams@1.0.1/text-line-stream";
import { Database } from "jsr:@db/sqlite@0.11";
/**
 * list.csv から list.db の ia_urls テーブルに情報をinsertする。
 * deno run -A "index.101.import-to-sqlite.ts"
 */
using f = await Deno.open("list.csv");
const db = new Database("list.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS ia_urls(
    id INTEGER PRIMARY KEY,
    timestamp TEXT NOT NULL,
    raw_url TEXT NOT NULL,
    schema TEXT NOT NULL,
    host_normalized TEXT NOT NULL,
    path TEXT NOT NULL,
    response_code INTEGER NOT NULL,
    mime_type     TEXT NOT NULL,
    content_length INTEGER NOT NULL,
    ia_url_key     TEXT NOT NULL,
    UNIQUE (timestamp, raw_url)
  ) STRICT`);
const readable = f.readable
  .pipeThrough(new TextDecoderStream())
  .pipeThrough(new TextLineStream());
let lineCount = 0;
db.exec("DELETE FROM ia_urls;");
db.exec("BEGIN");
for await (const data of readable) {
  lineCount += 1;
  if (lineCount % 1000 == 0) {
    console.log(`LINE. ${lineCount}`);
  }
  if (data == "") {
    continue;
  }
  // 2003 06 20  10 22 17
  const dataObj = JSON.parse(data);
  const iaUrlKey = (()=>{
    const str = String(dataObj[0]);
    return str;
  })();
  const timeNum = (() => {
    const str = String(dataObj[0]);
    const m = str.match(/^(?<year>\d{4})(?<month>\d{2})(?<day>\d{2})(?<hour>\d{2})(?<min>\d{2})(?<sec>\d{2})$/)
    // new Date("1970-01-01 00:00:00+00:00")
    if (!m) {
      throw new Error(str);
    }
    const g = m.groups!;
    const dateObj = new Date(`${g["year"]}-${g["month"]}-${g["day"]} ${g["hour"]}:${g["min"]}:${g["sec"]}+00:00`)
    return Math.floor(dateObj.getTime() / 1000);
  })();
  const rawUrl = String(dataObj[1]);
  const statusCode = (() => {
    const str = String(dataObj[2])
    if (/^\d+$/.test(str)) {
      return Number(str);
    } else {
      throw new Error(str);
    }
  })();
  const mimeType = String(dataObj[3]);
  const length = (() => {
    const str = String(dataObj[4])
    if (/^\d+$/.test(str)) {
      return Number(str);
    } else {
      throw new Error(str);
    }
  })();
  const schema = new URL(rawUrl).protocol;
  const host_normalized = (() => {
    const hostName = new URL(rawUrl).hostname;
    if (hostName == "www.kakaku.com") {
      return "kakaku.com";
    }
    if (hostName == "www.akiba.kakaku.com") {
      return "akiba.kakaku.com";
    }
    return hostName;
  })();
  const path = (() => {
    const urlObj = new URL(rawUrl);
    if (rawUrl.startsWith(urlObj.origin) == false) {
      throw new Error(rawUrl);
    }
    const pathOnly = urlObj.toString().substring(urlObj.origin.length);
    return pathOnly;
  })();
  db.exec(`
    INSERT INTO ia_urls (
      timestamp,
      raw_url,
      schema,
      host_normalized,
      path,
      response_code,
      mime_type,
      content_length,
      ia_url_key
    ) values (
      datetime(:timestampSec, 'unixepoch'),
      :raw_url,
      :schema,
      :host_normalized,
      :path,
      :response_code,
      :mime_type,
      :content_length,
      :ia_url_key
    ) ON CONFLICT DO NOTHING
    `, {
    timestampSec: timeNum,
    raw_url: rawUrl,
    schema: schema,
    host_normalized: host_normalized,
    path: path,
    response_code: statusCode,
    mime_type: mimeType,
    content_length: length,
    ia_url_key: iaUrlKey,
  });
}
db.exec("COMMIT");
db.close();
console.log(`処理完了`);
