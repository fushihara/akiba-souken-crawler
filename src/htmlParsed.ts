// @deno-types="npm:@types/jsdom"
import { JSDOM } from "npm:jsdom@25.0.0";
/**
 * https://akiba-souken.com/article/67392/ の様な記事ページを解析
 */
export async function parseArticle(html: string) {
  const document = new JSDOM(html).window.document;
  await new Promise(resolve => { setTimeout(() => { resolve(null) }, 1) });
  const articleId = (() => {
    const selfUrl = document.querySelector(`meta[property="og:url"]`)!.getAttribute("content")!;
    const m = selfUrl.match(/\/article\/(\d+)\/$/);
    if (m) {
      return Number(m[1]);
    } else {
      throw new Error(selfUrl);
    }
  })();
  const mainTitle = (() => {
    const mainTitle = document.querySelector(".mainTitle");
    const titleString = String(mainTitle?.textContent ?? "");
    return titleString;
  })();
  const time = (() => {
    const articleSUbInfoNodes = [...document.querySelector(".articleSubInfo")?.childNodes ?? []];
    let timestampText: string;
    if (articleSUbInfoNodes.length == 5 && articleSUbInfoNodes[1].nodeName == "SPAN") {
      // PR付き
      timestampText = articleSUbInfoNodes[2].textContent?.trim() ?? "";
    } else {
      // 通常
      timestampText = articleSUbInfoNodes[0].textContent?.trim() ?? "";
    }
    const m1 = timestampText.match(/^(?<year>\d+)年(?<month>\d+)月(?<date>\d+)日 (?<hour>\d+):(?<minute>\d+)$/);
    if (m1) {
      const g = m1.groups!;
      const dateObj = new Date(`${g["year"]}-${g["month"]}-${g["date"]} ${g["hour"]}:${g["minute"]}:00`);
      return dateObj;
    } else {
      throw new Error(`timestampText:[${document.querySelector(".articleSubInfo")?.outerHTML}]`);
    }
  })();
  const commentCount = (() => {
    const commentElement = document.querySelector(".articleSubInfo .comment");
    const c = Number(commentElement?.textContent ?? "0");
    if (Number.isNaN(c)) {
      throw new Error(`${commentElement}`);
    }
    return c;
  })();
  const tags = (() => {
    const tagElements = document.querySelectorAll(".articleTag .clearFix dd");
    const tagNames: string[] = [];
    for (const e of tagElements) {
      const tag = String(e.textContent ?? "").trim();
      tagNames.push(tag);
    }
    return tagNames;
  })();
  const breadLinks = (() => {
    const breadElements = document.querySelectorAll(".breadLink li");
    const breadLinks: string[] = [];
    for (const e of breadElements) {
      if (e.classList.contains("here")) {
        continue;
      }
      const tag = String(e.textContent ?? "").trim();
      breadLinks.push(tag);
    }
    if (breadLinks[0] != "アキバ総研") {
      throw new Error(`${breadLinks}`);
    }
    breadLinks.shift();
    return breadLinks;
  })();
  const images = (() => {
    const imageElements = document.querySelectorAll(".articleImageBox li a");
    const images: { pictureId: number, src: string, }[] = [];
    for (const e of imageElements) {
      const hrefText = e.getAttribute("href") ?? "";
      const imageSrc = e.querySelector<HTMLImageElement>("img")!.src!;
      const m = hrefText.match(/\/picture\/(\d+)\/$/);
      if (m) {
        const pictureId = Number(m[1]);
        images.push({
          pictureId: pictureId,
          src: imageSrc,
        })
      } else {
        throw new Error(`${e}`);
      }
    }
    return images;
  })();
  const maxPageNumber = (() => {
    const liElements = document.querySelectorAll(".pageNavigation li");
    let maxPage = 1;
    for (const e of liElements) {
      const text = String(e.textContent ?? "");
      const m = text.match(/^(\d+)$/);
      if (m) {
        const pageNum = Number(m[1]);
        maxPage = Math.max(maxPage, pageNum);
      }
    }
    return maxPage;
  })();
  return {
    articleId,
    mainTitle,
    time,
    commentCount,
    tags,
    breadLinks,
    images,
    maxPageNumber,
  }
}

/**
 * https://akiba-souken.com/article/
 * https://akiba-souken.com/article/?page=2
 * の様な記事の一覧ページを解析
 */
export async function parseArticleIndex(html: string) {
  const document = new JSDOM(html).window.document;
  await new Promise(resolve => { setTimeout(() => { resolve(null) }, 1) });
  const aElements = document.querySelectorAll<HTMLAnchorElement>(".newsList li h3 a");
  const articleIdList: number[] = [];
  for (const e of aElements) {
    const href = e.href;
    const m = href.match(/\/article\/(\d+)/);
    if (m) {
      articleIdList.push(Number(m[1]));
    }
  }
  return articleIdList;
}
/**
 * https://akiba-souken.com/article/67392/picture/1063000/
 * のような個別の画像詳細ページを解析
 */
export async function parseArticleImage(html: string) {
  const document = new JSDOM(html).window.document;
  await new Promise(resolve => { setTimeout(() => { resolve(null) }, 1) });
  const image = document.querySelector<HTMLImageElement>(".mainImageBox img");
  if (!image) {
    throw new Error(`Imageが検出できません`);
  }
  const imageUrl = String(image.getAttribute("src"));
  return imageUrl;
}
/**
 * https://akiba-souken.com/anime/search/?sort=gojuon&page=1
 * の様なアニメタイトル一覧ページを解析
 */
export async function parseAnimeListPage(html: string) {
  const dom = new JSDOM(html);
  await new Promise(resolve => { setTimeout(() => { resolve(null) }, 1) });
  // 1/221ページ
  const maxPageCount = (() => {
    const tableDom = dom.window.document.querySelector(".total");
    const x1 = String(tableDom?.textContent ?? "").trim();
    const m = x1.match(/\/(\d+)ページ/);
    if (m) {
      return Number(m[1]);
    } else {
      return 1;
    }
  })();
  const items = (() => {
    const liElements = dom.window.document.querySelectorAll<HTMLLIElement>(".itemList>ul>li");
    const result = [...liElements].map(liElement => {
      const thumbnailUrl = liElement.querySelector(".itemImg img")!.getAttribute("src");
      if (!thumbnailUrl) {
        throw new Error(`thumbnail ${liElement.outerHTML}`);
      }
      const manzokudo = (() => {
        const textContent = liElement.querySelector(".itemImg>strong")?.textContent;
        if (textContent == null) {
          return null;
        }
        const m = textContent.match(/^\d+\.\d+$/);
        if (m) {
          return Number(textContent);
        } else {
          return null;
        }
      })();
      const titleId = (() => {
        // "/anime/20737/"
        const hrefString = liElement.querySelector<HTMLAnchorElement>(".itemImg a")?.href;
        if (!hrefString) {
          throw new Error(`hrefString not found. ${liElement.outerHTML}`);
        }
        const m = hrefString.match(/^\/anime\/(\d+)\/$/);
        if (m) {
          return Number(m[1]);
        } else {
          throw new Error(`hrefString not found. ${hrefString}`);
        }
      })();
      const titleText = (() => {
        const titleText = liElement.querySelector<HTMLAnchorElement>(".rightTxt > h3 > a")?.textContent;
        if (!titleText) {
          throw new Error(`titleElement not found. ${liElement.outerHTML}`);
        }
        return titleText;
      })();
      const count = (() => {
        const dlElements = [...liElement.querySelectorAll<HTMLDListElement>(".rightTxt div.count > dl")];
        function getCount(element: HTMLDListElement | null) {
          if (element == null) {
            return 0;
          }
          const text = element.querySelector("dd")?.textContent;
          if (!text) {
            throw new Error(`${element.outerHTML}`);
          }
          const m = text.match(/^\d+$/);
          if (m) {
            return Number(text);
          } else {
            throw new Error(text);
          }
        }
        const review = getCount(dlElements[0]);
        const hitokoto = getCount(dlElements[1]);
        const clip = getCount(dlElements[1]);
        return { review, hitokoto, clip };
      })();
      return { thumbnailUrl, manzokudo, titleId, titleText, ...count, };
    });
    return result;
  })();
  return { maxPageCount, items };
}
/**
 * https://akiba-souken.com/anime/388/
 * https://akiba-souken.com/anime/19041/ 作品のレビュー多い
 * の様な個別のアニメの詳細ページを解析
 */
export async function parseAnimeDetailPage(html: string) {
  const dom = new JSDOM(html);
  await new Promise(resolve => { setTimeout(() => { resolve(null) }, 1) });
  const animeTitle = (() => {
    const h1 = dom.window.document.querySelector(".detailInfoBox .itemTitle h1")!.textContent!;
    return h1;
  })();
  // 「テレビアニメ」など
  const primaryCategory = (() => {
    const h1 = dom.window.document.querySelector(".detailInfoBox .itemTitle .category")!.textContent!;
    return h1;
  })();
  const startSeason = (() => {
    const dl = dom.window.document.querySelector(".detailInfoBox .itemInfo .info_main dl")!;
    const children = [...dl.children];
    for (let i = 0; i < children.length; i++) {
      const now = children[i];
      const next = children[i + 1];
      if (next == null) {
        break;
      }
      const nowText = now.textContent?.trim();
      if (nowText != "開始時期：") {
        i += 1;
        continue;
      }
      const nextText = next.textContent!.trim();
      return nextText
    }
    throw new Error(`Seasonが検出不可`)
  })();
  return { animeTitle, primaryCategory, startSeason }
}
// /anime/123/review/ ページの解析
export async function parseAnimeReviewListPage(html: string) {
  const dom = new JSDOM(html);
  await new Promise(resolve => { setTimeout(() => { resolve(null) }, 1) });
  const totalPageCount = (() => {
    const tableDom = dom.window.document.querySelector(".total");
    const x1 = String(tableDom?.textContent ?? "").trim();
    const m = x1.match(/\/(\d+)ページ/);
    if (m) {
      return Number(m[1]);
    } else {
      return 1;
    }
  })();
  const reviewList = (() => {
    const result: AnimeTitleReviewListItem[] = [];
    const reviewList = dom.window.document.querySelectorAll(".review .box");
    for (const r of reviewList) {
      let reviewId: number;
      let userIconUrl: string;
      let userName: string;
      let score: number;// 0.5単位
      let isSpoiler: boolean;// ネタバレのレビューか？
      let timestampSec: number;//秒単位
      let commentCount: number;
      let iineCount: number;
      {
        const link = r.querySelector<HTMLAnchorElement>(".userName h3 a")!;
        const path = new URL(link.href, "https://akiba-souken.com/").pathname;
        const m = path.match(/^\/anime\/\d+\/review\/(\d+)/);
        if (m) {
          reviewId = Number(m[1]);
        } else {
          throw new Error(r.outerHTML);
        }
      }
      {
        const img = r.querySelector<HTMLImageElement>(".userName .userIcon img")!;
        userIconUrl = new URL(img.src, "https://akiba-souken.com/").toString()
        userName = img.getAttribute("title")!
      }
      {
        const span = r.querySelector<HTMLSpanElement>(".userName>h3>span")!.textContent!;
        if (!span.match(/^\d\.\d+$/)) {
          throw new Error();
        }
        score = Number(span);
      }
      {
        const spoiler = r.querySelector(".spoilerWarning");
        if (spoiler) {
          isSpoiler = true;
        } else {
          isSpoiler = false;
        }
      }
      {
        const iineText = r.querySelector<HTMLSpanElement>(".clearFix span.list02")!.textContent!.match(/^いいね\((\d+)\)/)![1];
        iineCount = Number(iineText);
        const commentText = r.querySelector<HTMLSpanElement>(".clearFix span.list03")!.textContent!.match(/^コメント\((\d+)\)/)![1];
        commentCount = Number(commentText);
        const timestampStr = r.querySelector<HTMLSpanElement>(".clearFix span:not([class])")!.textContent!.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)![0];
        timestampSec = new Date(timestampStr).getTime() / 1000;
      }
      result.push({
        reviewId: reviewId,
        userIconUrl: userIconUrl,
        userName: userName,
        score: score,
        isSpoiler: isSpoiler,
        timestampSec: timestampSec,
        commentCount: commentCount,
        iineCount: iineCount,
      });
    }
    return result;
  })();
  const titleTotalReview = (() => {
    type Score = number | null;
    const res: AnimeTitleReviewScore = {
      story: null,
      sakuga: null,
      character: null,
      music: null,
      originality: null,
      storyboard: null,
      voice: null,
      song: null,
      manzokudo: null,
    }
    // 総合評価 以外
    const dlList = dom.window.document.querySelectorAll(".itemReview .evalBox .evalScore .clearFix dl");
    for (const v of dlList) {
      const c = [...v.children];
      if (c.length != 2) {
        throw new Error();
      }
      const name = c[0].textContent!;
      const scoreString = c[1].textContent!;
      if (!scoreString.match(/^\d\.\d+$/)) {
        continue;
      }
      const score = Number(scoreString);
      switch (name) {
        case "ストーリー":
          res.story = score;
          break;
        case "作画":
          res.sakuga = score;
          break;
        case "キャラクター":
          res.character = score;
          break;
        case "音楽":
          res.music = score;
          break;
        case "オリジナリティ":
          res.originality = score;
          break;
        case "演出":
          res.storyboard = score;
          break;
        case "声優":
          res.voice = score;
          break;
        case "歌":
          res.song = score;
          break;
        default:
          throw new Error(name);
      }
    }
    // 総合評価。満足度
    const manzokudoStr = dom.window.document.querySelector(".itemReview .evalBox .evalScore .score strong")!.textContent!;
    if (manzokudoStr.match(/^\d\.\d+$/)) {
      res.manzokudo = Number(manzokudoStr);
    }
    return res;
  })();

  return { totalPageCount, reviewList, titleTotalReview };
}
/**
 * https://akiba-souken.com/anime/hitokoto/partial/?offset=0&type=item&id=388&supplement=51
 * などから取得するレビューのajaxページ。作品のヒトコトとエピソードごとのヒトコトが同じ構造かは現状不明
 */
export async function parseAnimeTitleHitokotoPage(html: string) {
  const dom = JSDOM.fragment(html);
  await new Promise(resolve => { setTimeout(() => { resolve(null) }, 1) });
  const result: Hitokoto[] = [];
  for (const review of dom.children) {
    if (review.nodeName != "LI") {
      continue;
    }
    let hitokotoId: number;
    let userIcon: string;
    let userName: string;
    let reviewHtml: string;
    let timestampSec: number;
    {
      const hitokotoNum = Number(review.getAttribute("id")!.match(/^hitokoto_(\d+)$/)![1]);
      hitokotoId = hitokotoNum;
    }
    {
      const img = review.querySelector<HTMLImageElement>(".thumbnail img")!;
      userIcon = img.src;
      userName = img.getAttribute("title")!;
    }
    {
      const pTag = review.querySelector<HTMLParagraphElement>(".rightTxt p")!;
      reviewHtml = pTag.innerHTML;
    }
    {
      const timeStr = review.querySelector<HTMLSpanElement>(".moreInfo span")!.textContent!.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)![0];
      timestampSec = new Date(timeStr).getTime() / 1000;
    }
    result.push({
      hitokotoId,
      userIcon,
      userName,
      reviewHtml,
      timestampSec,
    })
  }
  return { hitokotoList: result };
}
export async function parseAnimeEpisodeListPage(html: string) {
  const dom = new JSDOM(html);
  await new Promise(resolve => { setTimeout(() => { resolve(null) }, 1) });
  const totalPageCount = (() => {
    const tableDom = dom.window.document.querySelector(".total");
    const x1 = String(tableDom?.textContent ?? "").trim();
    const m = x1.match(/\/(\d+)ページ/);
    if (m) {
      return Number(m[1]);
    } else {
      return 1;
    }
  })();
  const episodeList = (() => {
    const liElements = dom.window.document.querySelectorAll<HTMLLIElement>(".lineup div.box ul>li");
    const result = [...liElements].map(liElement => {
      const episodeId = (() => {
        const href = liElement.querySelector("a")?.href;
        if (href == null) {
          throw new Error(liElement.outerHTML);
        }
        const m = href.match(/\/anime\/\d+\/(\d+)\//);
        if (m) {
          return Number(m[1]);
        } else {
          throw new Error(liElement.outerHTML);
        }
      })();
      const subTitle = (() => {
        const aTag = liElement.querySelector("a");
        if (aTag == null) {
          throw new Error(liElement.outerHTML);
        }
        return aTag.textContent;
      })();
      const reviewCount = (() => {
        const spanTag = [...liElement.querySelectorAll("span")][0].textContent;
        const m = spanTag?.match(/（(\d+)）/);
        if (m) {
          return Number(m[1]);
        } else {
          throw new Error(liElement.outerHTML);
        }
      })();
      const score = (() => {
        const spanTag = liElement.querySelector("span.smallTxt");
        // [総合評価：4.00]
        const m = spanTag?.textContent?.match(/\[総合評価：(-|\d+\.\d+)\]/);
        if (m) {
          if (m[1] == "-") {
            return null;
          } else {
            return Number(m[1]);
          }
        } else {
          throw new Error(liElement.outerHTML);
        }
      })();
      return {
        episodeId: episodeId,
        subTitle: subTitle,
        reviewCount: reviewCount,
        score: score,
      }
    })
    return result;
  })();
  return { totalPageCount, episodeList };
}