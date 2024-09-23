import { Database } from "./database.ts";
type Opt = {
  reqHeader: Record<string, string>,
  loadCache: boolean,
  saveCache: boolean,
}
const td = new TextEncoder();
const defaultOPt = {
  reqHeader: {},
  loadCache: true,
  saveCache: true,
} satisfies Opt;
export async function fetchHttpGetText(db: Database, url: string | URL, opt_?: Partial<Opt>) {
  const option = Object.assign({}, defaultOPt, opt_);
  if (option.loadCache) {
    const dbCache = db.getHttpText(url.toString(), option.reqHeader);
    if (dbCache) {
      if (fetchHttpGetText.isLogEnable) {
        const byte = td.encode(dbCache.htmlText);
        console.log(`CACHE GET ${url} , ${byte.byteLength} byte`);
      }
      return { ...dbCache, isCache: true, };
    }
  }
  if (fetchHttpGetText.isLogEnable) {
    console.log(`HTTP  GET ${url}`);
  }
  const response = await fetch(url, {
    headers: {
      ...option.reqHeader,
    }
  });
  const htmlText = await response.text();
  if (option.saveCache) {
    db.appendHttpResultText(
      "GET",
      url.toString(),
      option.reqHeader,
      response,
      htmlText,
    );
  }
  const responseHeader = Object.fromEntries(response.headers);
  return { htmlText, status: response.status, isCache: false, responseHeader };
}
fetchHttpGetText.isLogEnable = true;
