# Swimphony 引き継ぎプロンプト

以下の内容と、添付する `swimphony-starter.zip` を前提に、このプロジェクトを引き継いでください。
既に企画・スコープ・技術方針はかなり詰めています。最初から企画を再検討するのではなく、リポジトリと資料を読み、完成に向けて実装を進めてください。

---

## あなたの役割

あなたは本プロジェクトのリードエンジニア兼テクニカルディレクターです。
Codex Builders Weekへの提出を前提に、完成率、デモ映え、再現性を優先して進めてください。

設計を必要以上に複雑化せず、各フェーズで「動くもの」を残してください。
技術的に魅力的でも締切までに不安定な機能は、拡張案へ退避してください。

---

## プロジェクト概要

プロジェクト名は **Swimphony** です。

> 1台の一般的なカメラで金魚の位置と動きを追跡し、その泳ぎをリアルタイムの音楽とアンビエント照明へ変換するアプリ。

コンセプトは「金魚を操作する」のではなく、普段の自然な泳ぎを観察し、音と光へ翻訳することです。

キャッチコピー案：

> Turn a goldfish into a living instrument for sound and ambient light.

ユーザーは、専門的な音響知識がなくても自然言語で雰囲気を指定し、音階・音色・照明・動きとの対応ルールを変更できます。

---

## 企画上の確定事項

### 提出版の本体

- **1カメラで動作することを最優先**する
- 特殊なセンサーや専用ハードウェアを必須にしない
- カメラがない人でも、サンプル動画または記録済みテレメトリで試せる
- Hueがなくても、ブラウザ画面のVirtual Lightで体験できる
- 金魚は1匹を想定する
- 金魚を刺激するフラッシュ、急激な明滅、強い照明は使わない

### 提出後または余裕がある場合の拡張

- 正面＋側面カメラによる簡易3D座標
- iPhone TrueDepthによる深度取得実験
- 複数匹の個体識別
- 録音・書き出し
- 長期間の泳ぎログから楽曲生成

これらは、P0機能が完成するまで着手しないでください。

---

## 実際の環境と素材

ユーザーの環境：

- MacBook Pro M1 Max
- iPhone
- DJI Action 2
- Switch 2用USBカメラ
- リビングにPhilips Hue照明あり

水槽の特徴：

- 金魚はオレンジ系で1匹
- 装飾はほぼなく、追跡対象が比較的明確
- 水が緑色で、背景と金魚の色差は大きい
- ガラスに部屋、撮影者、照明などの反射が入りやすい
- 緑色の光源または強い反射が写ることがある
- 水槽外にオレンジ色の商品パッケージ等が写る可能性がある

そのため、水槽ROIの固定、魚色キャリブレーション、前フレーム位置、動き検出を組み合わせた追跡が必要です。
単純な固定HSV閾値だけに依存しないでください。

参照写真は次にあります。

```text
public/references/aquarium-front.jpeg
public/references/aquarium-side.jpeg
```

今後、正面固定で撮影した40〜60秒の動画を次へ追加します。

```text
public/demo/goldfish-demo.mp4
```

推奨撮影条件：横向き16:9、1080p、30fps、カメラ固定、ズームなし、照明固定、水槽全体が大きく映る状態。

---

## P0機能

以下は必ず完成させてください。

1. サンプル動画入力
2. 1台のライブカメラ入力
3. 水槽ROI設定
4. 魚をクリックして色を登録するキャリブレーション
5. 金魚追跡
6. 追跡点・輪郭・軌跡・信頼度の表示
7. 金魚の動きをTone.jsの音へ変換
8. Hueなしで動くVirtual Light
9. 自然言語から演奏プリセットを作るAI Conductor
10. API失敗時にも固定プリセットで動作するフォールバック
11. Demo Mode
12. README、起動手順、テスト、デモ動画用資料

---

## 共通データ構造

カメラ方式やデモ入力は、すべて共通の `FishState` を出力してください。
音響・照明側は入力方式を意識しない構造にします。

```ts
type TrackingSource =
  | "video-file"
  | "webcam"
  | "dual-camera"
  | "iphone-truedepth"
  | "demo";

type FishState = {
  x: number;           // 0〜1、左→右
  y: number;           // 0〜1、上→下またはプロジェクト内定義に統一
  z?: number;          // 将来拡張
  speed: number;
  direction: number;
  acceleration?: number;
  area: number;
  confidence: number;
  detected: boolean;
  timestamp: number;
  source: TrackingSource;
};
```

既存コードの型定義と差がある場合は、互換性を壊さない形で統一してください。

---

## 推奨追跡方式

処理負荷を抑えるため、解析用フレームは480×270前後まで縮小して構いません。

基本パイプライン：

```text
動画／カメラ
→ 水槽ROIで切り出し
→ 魚クリックによる色サンプル取得
→ HSVまたはLab色距離による候補抽出
→ フレーム差分による動き候補
→ 輪郭抽出
→ 色・動き・前位置・面積・形状で候補評価
→ 最適候補を採用
→ EMAまたは同等の軽量平滑化
→ FishStateへ変換
```

候補評価の初期思想：

```ts
score =
  colorSimilarity * 0.45 +
  motionScore * 0.25 +
  previousPositionProximity * 0.20 +
  shapeScore * 0.10;
```

係数は動画を見て調整してください。

必須の失敗時挙動：

- 一時的に見失ってもクラッシュしない
- 数フレームは直前位置を保持して滑らかに減衰する
- 信頼度を下げる
- 再検出時に自然に復帰する
- ROI外は解析対象にしない

---

## 音へのマッピング

音程は連続周波数へ直接割り当てず、スケールに量子化してください。
初期プリセットはペンタトニック系で構いません。

基本対応：

| FishState | 音 |
|---|---|
| x | ステレオパン |
| y | 音程 |
| speed | 発音密度・アタック |
| direction / 急な方向転換 | ベルや打楽器のアクセント |
| area | フィルターまたはリバーブへの弱い影響 |
| confidence | 音量・演奏の安定度 |
| detected=false | 急停止せずフェードアウト |

映像フレームごとにノートを鳴らさず、音楽用クロックで現在の状態を参照してください。

---

## 照明へのマッピング

音がHueを動かすのではなく、共通の `FishState` またはPerformance Eventから音と光を並列生成します。

```text
FishState
→ Performance Mapper
   ├ Audio Event
   ├ Virtual Light Event
   └ Optional Hue Event
```

基本対応：

| FishState | 光 |
|---|---|
| x | 色相または左右の光源 |
| y | 明るさ |
| speed | 彩度・変化量 |
| 方向転換 | ゆっくりしたアクセント色 |
| confidence低下 | 彩度と変化量を下げる |
| detected=false | 中立色へゆっくり戻す |

重要：

- Hueは水槽を直接強く照らさず、壁・天井・水槽台への間接光を基本にする
- 照明更新は追跡や音より遅くする
- 急激な点滅は禁止
- 明るさ、彩度、最短遷移時間に安全上限を設ける
- Hue連携に失敗してもVirtual Lightと音は止めない

追跡信頼度が低下した場合、照明変化を自動的に弱めるSafety Controllerを実装してください。

---

## AI Conductor

AIは毎フレーム呼びません。
自然言語を、検証可能な `PerformancePreset` へ変換する用途だけに使います。

入力例：

> 深夜の水族館みたいに静かに。上へ泳いだときは透明感のある高音。急に方向転換したときだけ金色の光。点滅はしないで。

出力対象：

- BPM
- スケール
- オクターブ範囲
- 音色
- エンベロープ
- リバーブ
- FishStateと音のマッピング
- 色パレット
- 明るさ範囲
- 照明遷移時間
- 最大発音数
- 最大輝度などの安全制約

要件：

- OpenAI Responses APIをサーバー側から呼ぶ
- Structured Outputsまたは厳密なJSON Schemaを使う
- Zod等で検証する
- 数値は安全範囲へclampする
- APIキーをクライアントへ露出しない
- API失敗、タイムアウト、無効JSONでも固定プリセットへ戻る
- 使用モデル名は、作業時点の公式ドキュメントとプロジェクト要件を確認して設定する

---

## 技術構成

現在のスターターは、ブラウザ中心の構成です。

- Next.js
- React
- TypeScript
- OpenCV.jsまたは同等のブラウザ内画像処理
- Tone.js
- Zod
- OpenAI Responses API
- Philips Hue Local API（任意）

基本構成：

```text
Camera / MP4
→ Browser Tracker
→ FishState
→ Performance Mapper
   ├ Tone.js
   ├ Virtual Light
   └ Hue Adapter

Mood Prompt
→ Server-side OpenAI API
→ Validated PerformancePreset
→ Performance Mapper
```

別PythonサーバーやWebSocketは、明確な必要性がない限り追加しないでください。

---

## 現在のリポジトリ状態

`swimphony-starter.zip` には以下が入っています。

- Next.js / TypeScriptスターター
- 記録済みテレメトリで動くデモ
- Tone.js音声エンジン
- Virtual Light
- AI Conductor API Routeの土台
- プリセットスキーマ
- Hue Adapterの土台
- 水槽参照写真
- プロジェクト設計資料
- フェーズ別Codexプロンプト
- テストと提出チェックリスト

重要ファイル：

```text
AGENTS.md
START_HERE_JA.md
CODEX_MASTER_PROMPT.txt
docs/
prompts/01-phase1-tracking.md
prompts/02-phase2-audio-virtual-light.md
prompts/03-phase3-ai-conductor.md
prompts/04-phase4-hue.md
prompts/05-polish-and-submission.md
```

前回の環境ではnpmパッケージ取得がタイムアウトしたため、依存関係インストール後の完全なビルド検証は未完了です。
実機環境で最初に必ず確認してください。

---

## 最初に行う作業

編集前に次を実行してください。

1. `AGENTS.md` を読む
2. `START_HERE_JA.md` を読む
3. `docs/` 配下をすべて読む
4. 既存ソースを確認する
5. `.env.example` があれば `.env.local` を作成する
6. 以下を実行する

```bash
npm install
npm test
npm run lint
npm run build
npm run dev
```

エラーがある場合は、まずスターターの基礎を安定させてください。
大規模なリファクタリングは避け、必要最小限の修正にします。

その後、現在の状態を次の形式で報告してください。

```text
1. 読み取ったプロジェクト概要
2. baselineコマンドの結果
3. 既に動いている機能
4. 未実装または壊れている機能
5. Phase 1で触るファイル
6. 技術的リスク
7. 次の具体的な作業3〜7項目
```

この報告後、`prompts/01-phase1-tracking.md` に従って動画追跡を実装してください。

---

## フェーズ順序

```text
Phase 1  動画ファイルから金魚追跡
Phase 2  ライブカメラ・Tone.js・Virtual Light
Phase 3  AI Conductor
Phase 4  Philips Hue（余裕がある場合）
Phase 5  UI調整・README・テスト・デモ動画・提出
```

各フェーズで必ず行うこと：

- 受け入れ条件を確認する
- 実装する
- テストを追加または更新する
- lint / test / buildを実行する
- 手動確認手順を書く
- `docs/10-codex-build-log-template.md` を更新する
- 次フェーズへ進む前に、未解決事項を明示する

---

## P0の受け入れ条件

最低限、最終的に次が成立している必要があります。

- サンプル動画で金魚が追跡できる
- 水槽ROIを設定できる
- 金魚色をキャリブレーションできる
- 追跡点と軌跡が表示される
- `x / y / speed / direction / area / confidence` が更新される
- 見失っても安全に復帰する
- 金魚の動きで音が変化する
- 音程は音楽スケールへ量子化される
- Virtual Lightが音と同じ状態から変化する
- AI Conductorでプリセットを変更できる
- OpenAI APIが使えなくてもデモが動く
- Hueがなくてもデモが成立する
- Hue接続失敗でアプリ全体が止まらない
- カメラがなくてもサンプル動画またはテレメトリで体験できる
- READMEだけで第三者が起動できる
- `npm test`、`npm run lint`、`npm run build` が通る

---

## スコープ打ち切りルール

- 追跡改善に長時間かけ、音とデモが未完成になる状態を避ける
- Hueで詰まった場合はVirtual Lightで提出する
- ライブカメラが不安定ならサンプル動画を主デモにする
- 音色はまず1〜2種類で完成させる
- デザインは主要画面1枚に集中する
- 認証、ユーザー管理、クラウド保存は実装しない
- 2カメラ、TrueDepth、複数魚の個体識別はP0完了まで禁止

---

## 提出を意識した記録

- メインのCodexスレッドはなるべく最後まで維持する
- 主要な判断とCodex利用箇所をビルドログへ残す
- 提出に必要な `/feedback` Session IDを忘れず記録する
- READMEに、Codexが支援した内容と人間が判断した内容を書く
- サンプル動画、APIキー、Hue認証情報のライセンス・秘密情報に注意する
- `.env.local` やHueの認証情報をGitへ入れない

---

## 進め方の希望

- 不明点がコードや資料から判断できる場合、先に調査してから質問する
- 質問は作業を止める本当に必要なものだけに絞る
- 実装前に短い計画を提示する
- 実装後は変更ファイル、確認結果、残課題を明確に報告する
- コードはそのまま実務で使える品質にする
- 理想論だけでなく、締切と失敗時の代替案を含めて判断する

まずリポジトリを読み、baselineを実行し、現状報告から開始してください。
