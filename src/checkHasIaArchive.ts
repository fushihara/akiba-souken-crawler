import { Database } from "./database.ts";

export class CheckHasIaArchive {
  private list: string[] = [];
  isEnable: boolean = true;
  constructor(
    private readonly db: Database,
  ) {

  }
  checkAkibaSouken(path: string) {
    if (!this.isEnable) {
      return;
    }
    //return;
    if (!path.startsWith("/")) {
      throw new Error(`Pathはスラッシュ始まりにして下さい`);
    }
    this.checkUrl(
      `akiba-souken.com`,
      path,
    );
  }
  checkAkibaSoukenImage(path: string) {
    if (!this.isEnable) {
      return;
    }
    if (!path.startsWith("/")) {
      throw new Error(`Pathはスラッシュ始まりにして下さい`);
    }
    this.checkUrl(
      `akiba-souken.k-img.com`,
      path,
    );
  }
  private checkUrl(domain: string, path: string) {
    if (!this.isEnable) {
      return;
    }
    if (!this.db.checkHasIaArchive(domain, path)) {
      const url = `https://${domain}${path}`;
      console.log(url);
      this.list.push(url);
      this.db.addNeedIaArchivedUrl(url);
    }
  }
}
