/**
 * 記事の新着一覧を受信し、DBに保存
 * deno run -A "index.300.article-download.ts"
 */
import { Database } from "./src/database.ts";
import { fetchHttpGetText } from "./src/fetchHttp.ts";
import { parseArticle, parseArticleImage, parseArticleIndex } from "./src/htmlParsed.ts";
import { CheckHasIaArchive } from "./src/checkHasIaArchive.ts";
import { ArticleList } from "./src/articleList.ts";
const db = Database.instance;
db.init();
const checkHasIaArchive = new CheckHasIaArchive(db);
checkHasIaArchive.isEnable = false;
const articleList = new ArticleList();
//articleList.isEnable = false;
fetchHttpGetText.isLogEnable = false;
let articleIdMax = 67392;// 2024/09/04 03:01

//await getNewArticles().then(({ maxArticleId }) => { articleIdMax = maxArticleId; });
{
  for (let id = 0; id < articleIdMax; id++) {
    console.log(`${id}/${articleIdMax}`);
    await saveArticlePage(id);
  }
}
if (articleList.isEnable) {
  const dumpData = articleList.getDumpObj();
  if (dumpData != null) {
    await Deno.writeTextFile("./.articles.json", JSON.stringify(articleList.getDumpObj(), null, 2));
    console.log(`articleListの保存完了`);
  } else {
    console.log(`articleListはnullなので保存しません`);
  }
}

console.log(`完了`);
async function getNewArticles() {
  let maxArticleId = 0;
  // 新着
  for (let pageId = 1; pageId < 100; pageId++) {
    console.log(`pageId:${pageId}`);
    const { status, isCache, htmlText } = await fetchHttpGetText(
      db,
      `https://akiba-souken.com/article/?page=${pageId}`,
      { loadCache: false, saveCache: false, }
    );
    const articleIdList = await parseArticleIndex(htmlText);
    let saveArticleCount = 0;
    for (const articleId of articleIdList) {
      maxArticleId = Math.max(maxArticleId, Number(articleId));
      const { getNewArticle } = await saveArticlePage(articleId);
      if (getNewArticle) {
        saveArticleCount += 1;
      }
    }
    if (saveArticleCount == 0) {
      break;
    }
  }
  return { maxArticleId };
}
async function saveArticlePage(targetArticleId: number) {
  const { status, isCache, htmlText } = await fetchHttpGetText(
    db,
    `https://akiba-souken.com/article/${targetArticleId}/`,
  );
  let getNewArticle = false;
  if (!isCache) {
    getNewArticle = true;
  }
  if (status != 200) {
    return { getNewArticle };
  }
  checkHasIaArchive.checkAkibaSouken(`/article/${targetArticleId}/`)
  const pictureIdSet: Set<number> = new Set();
  const { articleId, mainTitle, time, tags, images, breadLinks, commentCount, maxPageNumber } = await parseArticle(htmlText);
  if (articleList.isEnable) {
    const iaKey = db.getIaUrlKey("akiba-souken.com", `/article/${targetArticleId}/`);
    if (iaKey == null) {
      throw new Error(`IAのurlKeyが不明: ${targetArticleId}`);
    }
    articleList.appendData({
      articleId: articleId,
      title: mainTitle,
      tags: tags,
      timestampMs: time.getTime(),
      maxPageNumber: maxPageNumber,
      breadLinks: breadLinks,
      iaUrlKey: iaKey,
    });
    // articleListを作る時は個別ページを見る必要は無いのでスキップ
    return { getNewArticle: false };
  }
  images.forEach(i => pictureIdSet.add(i.pictureId));
  let nowPage = 2;
  let maxPage = maxPageNumber;
  while (true) {
    if (maxPage < nowPage) {
      break;
    }
    checkHasIaArchive.checkAkibaSouken(`/article/${targetArticleId}/?page=${nowPage}`)
    const { htmlText } = await fetchHttpGetText(
      db,
      `https://akiba-souken.com/article/${targetArticleId}/?page=${nowPage}`,
    );
    nowPage += 1;
    const { maxPageNumber, images } = await parseArticle(htmlText);
    maxPage = Math.max(maxPageNumber, maxPage);
    images.forEach(i => pictureIdSet.add(i.pictureId));
  }
  for (const pictureId of pictureIdSet) {
    checkHasIaArchive.checkAkibaSouken(`/article/${targetArticleId}/picture/${pictureId}/`)
    const { htmlText } = await fetchHttpGetText(
      db,
      `https://akiba-souken.com/article/${targetArticleId}/picture/${pictureId}/`,
    );
    const imageUrl = await parseArticleImage(htmlText);
    if (new URL(imageUrl).hostname != "akiba-souken.k-img.com") {
      throw new Error(imageUrl);
    }
    checkHasIaArchive.checkAkibaSoukenImage(new URL(imageUrl).pathname);
    //checkHasIaArchive(notSavedIAUrls, imageUrl);
  }
  //console.log(`${articleId}:${format(time, "yyyy-MM-dd HH:mm")} : コメント:${commentCount},画像:${images.length} 枚,${breadLinks.join("/")} , "${mainTitle}"  , ${maxPageNumber} ページ`);
  return { getNewArticle };
}
