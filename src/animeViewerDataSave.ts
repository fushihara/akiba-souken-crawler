type Episode = {
  episodeId: number;
  subTitle: string | null;
  reviewCount: number;
  score: number | null;
}
export class AnimeViewerDataSave {
  private map: Map<number, AnimeTitle> = new Map();
  isEnable = true;
  insertTitle(id: number, title: string, primaryCategory: string, startSeason: string) {
    if (this.map.has(id)) {
      throw new Error(`IDが重複. id:${id}`);
    }
    const at = new AnimeTitle(
      id,
      title,
      primaryCategory,
      startSeason,
    );
    this.map.set(id, at);
  }
  setTitleReviewScore(id: number, reviewScore: AnimeTitleReviewScore, reviewList: AnimeTitleReviewListItem[]) {
    const d = this.map.get(id);
    if (!d) {
      throw new Error();
    }
    d.titleReviewScore = structuredClone(reviewScore);
    d.titleReviewList = structuredClone(reviewList);
  }
  setTitleHitokoto(id: number, hitokoto: Hitokoto[]) {
    const d = this.map.get(id);
    if (!d) {
      throw new Error();
    }
    d.titleHitokoto = structuredClone(hitokoto);
  }
  setEpisodeList(id: number, episodeList: Episode[]) {
    const d = this.map.get(id);
    if (!d) {
      throw new Error();
    }
    d.episodeList = structuredClone(episodeList);
  }
  setEpisodeHitokoto(id: number, episodeId: number, hitokotoList: Hitokoto[]) {
    const d = this.map.get(id);
    if (!d) {
      throw new Error();
    }
    const exists = d.episodeHitokotoList.find(h => h.episodeId == episodeId);
    if (exists) {
      throw new Error(`既にあります`);
    }
    d.episodeHitokotoList.push({
      episodeId: episodeId,
      hitokotoList: structuredClone(hitokotoList)
    });
  }
  getDumpObj() {
    if (!this.isEnable) {
      return null;
    }
    console.log(`A`);
    const list = [...this.map.values()];
    console.log(`B`);
    list.sort((a, b) => {
      return a.sort(b);
    });
    console.log(`C`);
    const jsonList = list.map(v => v.dumpJsonObj);
    console.log(`D`);
    return jsonList;
  }
}
class AnimeTitle {
  // 作品自体のレビューの合計スコア
  titleReviewScore: AnimeTitleReviewScore = {
    story: null,
    sakuga: null,
    character: null,
    music: null, // 音楽
    originality: null,
    storyboard: null,// 演出
    voice: null, // 声優
    song: null,// 歌
    manzokudo: null,// 満足度
  };
  // 作品自体のレビューのID一覧
  titleReviewList: AnimeTitleReviewListItem[] = [];
  titleHitokoto: Hitokoto[] = [];
  episodeList: Episode[] = [];
  episodeHitokotoList: {
    episodeId: number,
    hitokotoList: Hitokoto[]
  }[] = [];
  constructor(
    readonly animeId: number,
    readonly title: string,
    readonly primaryCategory: string,
    readonly startSeason: string
  ) { }
  sort(b: AnimeTitle) {
    const specialValue = "未定";
    if (this.startSeason === specialValue) { return 1; }
    if (b.startSeason === specialValue) { return -1; }
    return b.startSeason.localeCompare(this.startSeason);
  }
  get dumpJsonObj() {
    return {
      animeId: this.animeId,
      title: this.title,
      primaryCategory: this.primaryCategory,
      startSeason: this.startSeason,
      titleReviewScore: this.titleReviewScore,
      titleReviewList: this.titleReviewList,
      titleHitokotoList: this.titleHitokoto,
      episodeList: this.episodeList,
      episodeHitokotoList: this.episodeHitokotoList,
    }
  }
}