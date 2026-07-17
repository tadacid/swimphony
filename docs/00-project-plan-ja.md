# Swimphony 提出版プラン

## 一文で説明

普通のカメラ1台で金魚を追跡し、泳ぎを音楽と環境光へ変換するWebアプリ。

## 必須

- サンプル動画
- ライブカメラ1台
- 水槽範囲の指定
- 金魚をクリックする色キャリブレーション
- `x / y / speed / direction / acceleration / area / confidence`
- Tone.jsによる音
- Hueがなくても使えるVirtual Light
- GPT-5.6による音と光のプリセット生成
- 金魚やカメラが動かなくても再現できるデモモード

## 余裕があれば

- Philips Hueの実電球連携
- カメラ切り替え
- プリセットJSON保存
- デバッグマスク

## 提出後

- 正面＋側面の2カメラ簡易3D
- iPhone TrueDepth
- 複数匹の個体識別

## 技術構成

```text
動画 / カメラ
  ↓
ブラウザ内の画像処理
  ↓
FishState
  ↓
Performance Mapper
  ├─ Tone.js
  ├─ Virtual Light
  └─ Hue（任意）

自然言語
  ↓
Next.js API Route
  ↓
GPT-5.6 Structured Output
  ↓
検証済みPerformancePreset
```

## 重要な判断

- 本命は1カメラ
- Hueは必須にしない
- Hueは水槽へ直接当てず、壁や部屋へ間接照明として使う
- 光は毎フレーム動かさず、ゆっくり変化させる
- GPTはリアルタイム追跡ではなく、音と光のルール設計に使う
- 追跡を見失ったら音量と照明変化を静かに落とす
