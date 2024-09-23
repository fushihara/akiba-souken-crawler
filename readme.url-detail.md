# アニメまとめ
```
https://akiba-souken.com/anime/matome/ から一覧を取得
  https://akiba-souken.com/anime/matome/survival/  などのまとめ個別ページを取得
  https://akiba-souken.com/anime/matome/anison/
```

# アニメの作品一覧
作品への評価・ヒトコト
エピソードごとの評価・ヒトコトが両方ある。エピソードごとの評価は5段階で集計された値のみ。

```
https://akiba-souken.com/anime/search/?sort=gojuon から一覧を取得. anime_search_list に保存
  https://akiba-souken.com/anime/19041/ 個別のURLはこの通り。 anime_detail に保存
    https://akiba-souken.com/anime/19041/review/ 作品ごとのレビュー一覧 anime_review_listに保存。ページングあり
      https://akiba-souken.com/anime/19041/review/6621/ 個別のレビュー anime_review_detailに保存。ページングなし
    https://akiba-souken.com/anime/19041/hitokoto/ 作品ごとのヒトコト一覧。ここにはヒトコトのテキストは無い。 anime_hitokoto に保存
    https://akiba-souken.com/anime/388/hitokoto/   ヒトコトはajaxで非同期的に読み込む。ヒトコトの個別ページは無い
    https://akiba-souken.com/anime/388/list/ エピソード一覧。ここからレビュー数、総合評価を見れる anime_episode_listに保存
      https://akiba-souken.com/anime/388/51/ 個別エピソード。5段階の総合評価とヒトコトがある。このヒトコト、ページングしているタイトルあるのかな？ anime_episode_hitokoto と anime_episode_detailに保存
```


## 作品ごとのレビュー一覧
ストーリー、作画、満足度など5段階スコアを付けれる。
```
https://akiba-souken.com/anime/review/ からレビューの一覧を取得できる。各コメントの投稿日、ユーザー名、コメント数、いいね数を取得できる
  https://akiba-souken.com/anime/20811/review/8595/ リンク先はこのようなURL。良いね数、ユーザー名、ユーザー画像URL、コメント数を記録する。
```

作品へのレビューは、ユーザーは0.5単位。
集計した作品へのレビューは小数点2桁(例 1.23)まで出る


#  投票一覧

```plaintext
https://akiba-souken.com/vote/article/ 投票の一覧。JS無効でも
  https://akiba-souken.com/vote/v_7881/ 個別の投票。JS一覧でも票数取れたからこれでよさそう…
```
