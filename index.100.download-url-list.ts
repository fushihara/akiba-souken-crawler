/**
 * IAからアキバ総研のURL一覧を取得し、list.csvに書き込む
 */
import { format } from "jsr:@std/fmt/bytes"
import { TextLineStream } from "jsr:@std/streams@1.0.1/text-line-stream";
const urlList: { url: string, matchType: string }[] = [
  { url: "kakaku.com/akiba/", matchType: "prefix" },
  { url: "akiba.kakaku.com", matchType: "domain" },
  { url: "akiba-souken.k-img.com", matchType: "domain" },
  { url: "akiba-souken.com", matchType: "domain" },
]
const handle = await Deno.open(`list.csv`, {
  create: true,   // ファイルが無ければ作成
  truncate: true, // ファイルがあれば0バイトにする
  write: true,    // 書き込み可能にする
});
for (const urlPattern of urlList) {
  const sp = new URLSearchParams();
  sp.append("url", urlPattern.url);
  sp.append("matchType", urlPattern.matchType);
  sp.append("output", "json");
  sp.append("filter", "statuscode:200");
  sp.append("collapse", "urlkey");
  const requestUrl = `https://web.archive.org/cdx/search/cdx?${sp}`;
  const response = await fetch(requestUrl);
  console.log(`response受信`);
  const lineStream = response.body?.pipeThrough(new TextDecoderStream()).pipeThrough(new TextLineStream())
  if (lineStream == null) {
    console.log(`Streamがnullでした`);
    Deno.exit(0);
  }
  const te = new TextEncoder();
  let loadBytes = 0;
  for await (const l of lineStream) {
    loadBytes += te.encode(l).byteLength;
    const m = l.match(/(\[".+?\d+"])/);
    if (!m) {
      console.log(`line not match`);
      continue;
    }
    const jsonArray = JSON.parse(m[1]);
    const jsonObj = {
      urlkey: jsonArray[0],
      timestamp: jsonArray[1],
      original: jsonArray[2],
      mimetype: jsonArray[3],
      statuscode: jsonArray[4],
      digest: jsonArray[5],
      length: jsonArray[6],
    };
    const writeJsonStr = JSON.stringify([
      jsonObj.timestamp,
      jsonObj.original,
      jsonObj.statuscode,
      jsonObj.mimetype,
      jsonObj.length,
    ]);
    await handle.write(te.encode(writeJsonStr + "\r\n"));
    console.log(`${urlPattern.url} ${format(loadBytes)}`);
  }
}
handle.close();
console.log(`保存完了`);

async function pipeTo() {
  const sp = new URLSearchParams();
  sp.append("url", "kakaku.com/akiba/");
  sp.append("matchType", "prefix");
  sp.append("output", "json");
  sp.append("filter", "statuscode:200");
  sp.append("collapse", "urlkey");
  const requestUrl = `https://web.archive.org/cdx/search/cdx?${sp}`;
  const response = await fetch(requestUrl);
    console.log(`response受信`);
    const handle = await Deno.open(`list.csv`, { create: true, createNew: true, write: true, truncate: true });
    await response.body?.pipeTo(handle.writable);
    console.log(`保存完了`);
  }