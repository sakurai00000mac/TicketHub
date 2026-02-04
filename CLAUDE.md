# CLAUDE.md - 作業ログ

## プロジェクト概要
Backlog風のプロジェクト管理ツール。課題管理・カンバンボード・ガントチャート・Wiki・ドキュメントを統合。
将来的にFirebase+グループ対応を予定。

## 技術スタック
- React 18 + TypeScript (Vite)
- react-router-dom（ルーティング）
- Zustand（状態管理、ドメイン別に分割）
- react-markdown + remark-gfm（Markdownレンダリング）
- react-icons（アイコン）
- LocalStorage（データ永続化）
- CSS（カスタムプロパティ利用、フレームワーク不使用）

## 実装済み機能

### プロジェクト管理
- プロジェクトの作成・編集・削除
- プロジェクト一覧表示（カード形式）
- プロジェクト設定ページ（名前変更・削除）
- プロジェクトキー自動生成（課題番号用）

### 課題管理（Issue）
- 課題の作成（件名、詳細Markdown、種別、優先度、ステータス、開始日、期限）
- 課題一覧テーブル（キー、件名、ステータス、優先度、期限表示）
- 課題詳細ページ（ステータス/優先度変更、子課題一覧、削除）
- 自動採番キー（例: PROJ-1）
- デフォルトステータス: 未対応→処理中→処理済み→完了
- デフォルト種別: タスク・バグ・要望・その他
- 優先度: 高・中・低
- 親子課題対応

### ボード（カンバン）
- ステータス別の列表示
- ドラッグ&ドロップでステータス変更
- カード表示（キー、タイトル、優先度、期限）

### Wikiページ管理
- ページの作成・編集・削除
- 階層構造（親子関係）対応
- サイドバーにツリー表示（折りたたみ可能）
- ドラッグ&ドロップでページ並び替え・階層移動
- 子ページの再帰削除

### Markdownエディタ
- 2ペイン構成（左: エディタ、右: リアルタイムプレビュー）
- ドラッグでペイン幅変更
- プレビューの表示/非表示切替
- GFM対応（テーブル、タスクリスト等）
- Ctrl+S で保存

### Wikiリンク
- `[[ページ名]]` 記法でページ間リンク
- 存在するページはクリック可能なリンクに変換
- 存在しないページは赤リンク風に表示

### データ永続化
- LocalStorageに自動保存
- JSONファイルへのエクスポート/インポート
- データ操作はutils/storageに分離（将来のFirestore移行を考慮）

### ナビゲーション
- react-router-domによるURL管理
- プロジェクト内タブナビ（左サイドバー）: 課題の作成・課題・ボード・ガントチャート・ドキュメント・Wiki・設定
- ヘッダーにパンくず（アプリ名 > プロジェクト名）

## ディレクトリ構成
```
src/
├── components/
│   ├── Layout/
│   │   ├── Header.tsx          # ヘッダー（パンくず、エクスポート/インポート）
│   │   ├── ProjectNav.tsx      # 左サイドバー（プロジェクトタブナビ）
│   │   ├── ProjectLayout.tsx   # プロジェクト内共通レイアウト
│   │   └── Sidebar.tsx         # Wikiページツリー表示
│   ├── Editor/
│   │   ├── MarkdownEditor.tsx  # 2ペインエディタ
│   │   └── MarkdownPreview.tsx # Markdownプレビュー（Wikiリンク解決含む）
│   ├── PageTree/
│   │   └── PageTreeItem.tsx    # ツリーノード（D&D対応）
│   └── common/
│       └── Modal.tsx           # 汎用モーダル
├── pages/
│   ├── ProjectList.tsx         # プロジェクト一覧（ホーム）
│   ├── IssuesPage.tsx          # 課題一覧
│   ├── IssueNewPage.tsx        # 課題作成
│   ├── IssueDetailPage.tsx     # 課題詳細
│   ├── BoardPage.tsx           # カンバンボード
│   ├── GanttPage.tsx           # ガントチャート（プレースホルダー）
│   ├── DocumentsPage.tsx       # ドキュメント（プレースホルダー）
│   ├── WikiPage.tsx            # Wikiトップ（サイドバー+Outlet）
│   ├── PageView.tsx            # Wikiページ閲覧
│   └── SettingsPage.tsx        # プロジェクト設定
├── stores/
│   ├── projectStore.ts         # プロジェクトCRUD
│   ├── issueStore.ts           # 課題・コメントCRUD
│   ├── wikiStore.ts            # WikiページCRUD
│   └── uiStore.ts              # UI状態・データインポート
├── types/
│   └── index.ts                # 全型定義（User, Group, Project, Issue, Page, Document等）
├── utils/
│   ├── markdown.ts             # Wikiリンク解決、slug生成、ID生成
│   └── storage.ts              # LocalStorage操作、エクスポート/インポート
├── App.tsx                     # ルーティング定義（react-router-dom）
├── main.tsx                    # エントリポイント
└── index.css                   # グローバルスタイル
```

## ルーティング構成
```
/                                → プロジェクト一覧
/projects/:projectId             → 課題一覧にリダイレクト
/projects/:projectId/issues      → 課題一覧
/projects/:projectId/issues/new  → 課題作成
/projects/:projectId/issues/:id  → 課題詳細
/projects/:projectId/board       → ボード
/projects/:projectId/gantt       → ガントチャート
/projects/:projectId/documents   → ドキュメント
/projects/:projectId/wiki        → Wikiトップ
/projects/:projectId/wiki/:pageId      → Wikiページ閲覧
/projects/:projectId/wiki/:pageId/edit → Wikiページ編集
/projects/:projectId/settings    → 設定
```

## 開発コマンド
```bash
npm run dev      # 開発サーバー起動
npm run build    # プロダクションビルド
npm run preview  # ビルド結果プレビュー
```

## 実装フェーズ
- [x] Phase 1: 基盤リファクタリング（型定義、ストア分割、ルーティング、レイアウト）
- [x] Phase 2: 課題管理（一覧、作成、詳細）
- [x] Phase 3: ボード（カンバン、ドラッグ移動）
- [x] Phase 4: ガントチャート（CSS Gridベース、ドラッグ編集、親子タスク）
- [x] Phase 5: ドキュメント管理
- [x] Phase 6: 設定・仕上げ（ステータス/種別カスタマイズ、レスポンシブ）
- [ ] Phase 7: Firebase移行（認証、Firestore、グループ/招待）
