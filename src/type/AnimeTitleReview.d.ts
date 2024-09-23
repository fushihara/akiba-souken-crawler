type Score = number | null;
type AnimeTitleReviewScore = {
  story: Score,
  sakuga: Score,
  character: Score,
  music: Score,
  originality: Score,
  storyboard: Score,
  voice: Score,
  song: Score,
  manzokudo: Score,
};
type AnimeTitleReviewListItem = {
  reviewId: number,
  userIconUrl: string,
  userName: string,
  score: number,
  isSpoiler: boolean,
  timestampSec: number,
  commentCount: number,
  iineCount: number,
};
type Hitokoto = {
  hitokotoId: number,
  userIcon: string,
  userName: string,
  reviewHtml: string,
  timestampSec: number,
}
