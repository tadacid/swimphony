# 最初に読むファイル

このフォルダ一式を、そのままCodexでプロジェクトとして開いてください。プロンプトだけを貼るより、設計資料、参照写真、既存コード、段階別プロンプトをまとめて渡す方が精度が上がります。人間もAIも、文脈を小出しにされると判断が雑になります。驚くほど平等です。

## 最初にすること

```bash
cp .env.example .env.local
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開き、次を確認します。

- 金魚位置のデモ表示が動く
- **Start audio** を押すと音が鳴る
- 背景のVirtual Lightが変わる
- AI ConductorはAPIキー未設定でも安全な固定プリセットへフォールバックする

## Codexへの渡し方

1. このフォルダ全体をCodexで開く
2. 同じメインスレッドを最後まで使う
3. `CODEX_MASTER_PROMPT.txt` を最初に貼る
4. 初期確認が終わったら `prompts/01-phase1-tracking.md` を貼る
5. 各フェーズ完了時に `docs/10-codex-build-log-template.md` を更新する
6. 提出前にメインスレッドの `/feedback` Session IDを記録する

## 追加で必要なファイル

現在まだ必要なのは、正面固定で撮影した金魚動画です。

```text
public/demo/goldfish-demo.mp4
```

推奨条件:

- 40〜60秒
- 横向き16:9
- 1080p / 30fps
- カメラ固定
- 水槽全体が大きく映る
- ズーム・フラッシュなし
- 普段どおり泳いでいる状態

## 実装順

```text
Phase 1  動画から金魚追跡
Phase 2  ライブカメラ・音・Virtual Light
Phase 3  GPT-5.6 AI Conductor
Phase 4  Philips Hue（余裕がある場合のみ）
Phase 5  UI調整・README・デモ動画・提出
```

2カメラとiPhone TrueDepthは提出後です。今触ると、魚より開発者の方が水面下へ沈みます。
