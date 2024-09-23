type Article = {
  articleId: number,
  title: string,
  timestampMs: number,
  tags: string[],
  breadLinks: string[],
  maxPageNumber: number,
  iaUrlKey: string,
}
export class ArticleList {
  articleList: Article[] = [];
  isEnable = true;
  appendData(article: Article) {
    if (!this.isEnable) {
      return;
    }
    this.articleList.push(article);
  }
  getDumpObj() {
    if (!this.isEnable) {
      return null;
    }
    this.articleList.sort((a, b) => {
      return b.timestampMs - a.timestampMs;
    });
    const copyData = structuredClone(this.articleList);
    return copyData;
  }
}