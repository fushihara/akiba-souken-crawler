import { format } from "jsr:@std/datetime@0.224.0/format"
import { Database as SqliteDb } from "jsr:@db/sqlite@0.11";
const programVersion = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
export class Database {
  public static instance = new Database();
  private db!: SqliteDb;
  init() {
    const db = new SqliteDb("list.db");
    this.db = db;
    // create database
    db.exec(`
      CREATE TABLE IF NOT EXISTS http_request_result(
        id                     INTEGER NOT NULL PRIMARY KEY,
        url                    TEXT NOT NULL,
        request_method         TEXT NOT NULL,
        request_header         TEXT NOT NULL,
        response_code          INTEGER NOT NULL CHECK( 0 < response_code ),
        response_header        TEXT NOT NULL CHECK( json_valid(response_header) ),
        is_binary              INTEGER NOT NULL check(is_binary = 1 OR is_binary = 0),
        response_text          TEXT NULL,
        response_binary        BLOB NULL,
        created_at             TEXT NOT NULL,
        insert_program_version TEXT NOT NULL,
        check ( 
          ( is_binary = 1 AND response_text IS NULL AND response_binary IS NOT NULL) OR
          ( is_binary = 0 AND response_text IS NOT NULL AND response_binary IS NULL )
        )
      ) strict;`);
    db.exec(`CREATE INDEX IF NOT EXISTS http_request_result_url ON http_request_result(url)`);
    db.exec(`CREATE INDEX IF NOT EXISTS ia_urls_hostn_path ON ia_urls(host_normalized,path)`);
    // anime
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS anime_page(
        id INTEGER NOT NULL PRIMARY KEY CHECK(1<=id),
        title TEXT NOT NULL,
        manzokudo_x10 INTEGER NULL CHECK( manzokudo_x10 IS NULL OR (0<=manzokudo_x10 AND manzokudo_x10<=50 ) ) ,
        review        INTEGER NOT NULL CHECK( 0 <= review ),
        hitokoto      INTEGER NOT NULL CHECK( 0 <= hitokoto ),
        clip          INTEGER NOT NULL CHECK( 0 <= clip ) ,
        thumbnail_url TEXT NOT NULL
      )strict;
      `)
    // ia_need_download_urls
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ia_need_download_urls(
        id          INTEGER NOT NULL PRIMARY KEY,
        need_dl_url TEXT    NOT NULL UNIQUE,
        registration_is_finish   INTEGER NOT NULL,
        registration_response    TEXT NULL,
        registration_time        TEXT NULL,
        registration_status      TEXT NULL,
        registration_status_time TEXT NULL
      )strict;`);
  }
  getHttpText(requestUrl: string, requestHeader: Record<string, string>) {
    const sortedRequestHeaderObj = Object.fromEntries(Object.entries(requestHeader).sort((a, b) => { return a[0].localeCompare(b[0]) }));
    const requestHeaderJsonString = JSON.stringify(sortedRequestHeaderObj);
    const prepare = this.db.prepare(`SELECT response_code,response_text,response_header FROM http_request_result WHERE url=:url AND request_header=:request_header LIMIT 1`);
    const getResponse = prepare.get({ url: requestUrl, request_header: requestHeaderJsonString });
    if (getResponse == null) {
      prepare.finalize();
      return null;
    }
    if ("response_text" in getResponse) {
      const response_text = String(getResponse["response_text"]);
      const response_code = Number(getResponse["response_code"]);
      const response_header = JSON.parse(String(getResponse["response_header"]));
      prepare.finalize();
      return { htmlText: response_text, status: response_code, responseHeader: response_header, };
    }
    prepare.finalize();
    return null;
  }
  appendHttpResultText(
    requestMethod: "GET",
    requestUrl: string,
    requestHeader: Record<string, string>,
    responseObj: Response,
    responseText: string,
  ) {
    const headersObj = Object.fromEntries(responseObj.headers);
    const sortedHeaderObj = Object.fromEntries(Object.entries(headersObj).sort((a, b) => { return a[0].localeCompare(b[0]) }));
    const sortedRequestHeaderObj = Object.fromEntries(Object.entries(requestHeader).sort((a, b) => { return a[0].localeCompare(b[0]) }));
    this.db.exec(`DELETE FROM http_request_result WHERE url=:url AND request_header=:request_header`, { url: requestUrl, request_header: JSON.stringify(sortedRequestHeaderObj) });
    this.db.exec(`
      INSERT INTO http_request_result (
        url,
        request_method,
        request_header,
        response_code,
        response_header,
        is_binary,
        response_text,
        response_binary,
        created_at,
        insert_program_version
      ) values (
        :url,
        :request_method,
        :request_header,
        :response_code,
        :response_header,
        :is_binary,
        :response_text,
        :response_binary,
        strftime('%F %R:%f',:created_at,'unixepoch'),
        :insert_program_version
      )`, {
      url: requestUrl,
      request_method: requestMethod,
      request_header: JSON.stringify(sortedRequestHeaderObj),
      response_code: responseObj.status,
      response_header: JSON.stringify(sortedHeaderObj),
      is_binary: 0,
      response_text: responseText,
      response_binary: null,
      created_at: new Date().getTime() / 1000,
      insert_program_version: programVersion,
    });
  }
  upsertAnimePage(
    id: number,
    title: string,
    manzokudo: number | null,
    review: number,
    hitokoto: number,
    clip: number,
    thumbnailUrl: string
  ) {
    this.db.exec(`DELETE FROM anime_page WHERE id=:id`, { id });
    this.db.exec(`
      INSERT INTO anime_page(
        id,
        title,
        manzokudo_x10,
        review,
        hitokoto,
        clip,
        thumbnail_url
      ) VALUES(
        :id,
        :title,
        :manzokudo_x10,
        :review,
        :hitokoto,
        :clip,
        :thumbnail_url
       )
      `, {
      id: id,
      title: title,
      manzokudo_x10: manzokudo != null ? Math.floor(manzokudo * 10) : null,
      review: review,
      hitokoto: hitokoto,
      clip: clip,
      thumbnail_url: thumbnailUrl,
    })
  }
  /// 指定ページがIAに保存済みか調べる
  checkHasIaArchive(host: string, path: string) {
    const prepare = this.db.prepare(`SELECT id FROM ia_urls WHERE host_normalized=:host AND path=:path LIMIT 1`);
    const getResponse = prepare.get({ host: host, path: path });
    if (getResponse != null) {
      return true;
    }
    return false;
  }
  /**
   * ia_urls テーブルの ia_url_key カラムの値を取得する。
   * 正規化したホスト名とパス名だけの指定で一意に特定出来ると考えているが、
   * 正規化したホスト名とパス名で特定出来ないケースを検知したらソースを修正する必要あり。
   */
  getIaUrlKey(hostNormalized: string, path: string) {
    const prepare = this.db.prepare(`SELECT raw_url,ia_url_key FROM ia_urls WHERE host_normalized=:host AND path=:path LIMIT 2`);
    const getResponse = prepare.all({ host: hostNormalized, path: path });
    if (getResponse.length == 2) {
      throw new Error(`URLが重複. host:${hostNormalized} , path:${path}`);
    } else if (getResponse.length == 0) {
      return null;
    } else {
      const urlKey = String(getResponse[0].ia_url_key);
      return urlKey;
    }
  }
  // ia_need_download_urls にURLを追加。重複しても飲み込む
  addNeedIaArchivedUrl(url: string) {
    this.db.exec(`INSERT OR IGNORE INTO ia_need_download_urls(need_dl_url,registration_is_finish)VALUES(?,0)`, url);
  }
  // ia_need_download_urls から次に登録するべき、確認するべきURLの情報を返す
  getNextIaArchiveRequest(limit: number) {
    const prepare = this.db.prepare(`
      SELECT need_dl_url,registration_response 
      FROM 
        ia_need_download_urls 
      WHERE 
        registration_is_finish=0
      ORDER BY 
        (need_dl_url not like '%/picture/%' and need_dl_url  not like '%akiba-souken.k-img.com%') DESC,
        (need_dl_url not like '%akiba-souken.k-img.com%') DESC,
        registration_status_time IS NULL,
        registration_status_time
      LIMIT ${limit}
    `);
    const response = prepare.all<{ need_dl_url: string, registration_response: string | null }>();
    const result: { needDlUrl: string, registrationResponse: string | null }[] = [];
    for (const v of response) {
      result.push({
        needDlUrl: v.need_dl_url,
        registrationResponse: v.registration_response,
      });
    }
    return result;
  }
  upsertIaArchiveRequest(url: string, responseJsonString: string) {
    this.db.exec(`
      UPDATE ia_need_download_urls SET registration_response=:resp,registration_time=strftime('%F %R:%f','now') WHERE need_dl_url=:url
      `, {
      resp: responseJsonString,
      url: url,
    })
  }
  upsertIaArchiveRequestStatus(url: string, isFinish: 0 | 1 | 2, responseJsonString: string) {
    this.db.exec(`
      UPDATE ia_need_download_urls SET registration_is_finish=:fin,registration_status=:resp,registration_status_time=strftime('%F %R:%f','now') WHERE need_dl_url=:url
      `, {
      fin: isFinish,
      resp: responseJsonString,
      url: url,
    })
  }
}
export const dbInstance = new Database();
