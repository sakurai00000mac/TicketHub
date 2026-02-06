# Firebase連携・マルチユーザー対応タスクリスト

## 概要
現在LocalStorageベースのTicketHubをFirebaseと連携し、複数ユーザーで利用できるようにする。
Cloudflare Pagesにデプロイし、Googleログイン + プロジェクトシリアルコードによるアクセス制御を実装する。

---

## Phase 1: Firebase環境構築

### 1.1 Firebaseプロジェクトのセットアップ
- [ ] Firebaseコンソールで新規プロジェクトを作成
- [ ] Firebase Authentication を有効化
  - [ ] Googleプロバイダーを有効化
  - [ ] 認証ドメインの設定（Cloudflare Pagesのドメインを追加）
- [ ] Cloud Firestore を有効化
  - [ ] 本番環境用のルールを設定（後述）
  - [ ] インデックスの作成
- [ ] Firebase SDK の依存関係をインストール
  ```bash
  npm install firebase
  ```

### 1.2 Firebase設定ファイルの作成
- [ ] `src/config/firebase.ts` を作成
  ```typescript
  import { initializeApp } from 'firebase/app';
  import { getAuth } from 'firebase/auth';
  import { getFirestore } from 'firebase/firestore';

  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  export const app = initializeApp(firebaseConfig);
  export const auth = getAuth(app);
  export const db = getFirestore(app);
  ```
- [ ] `.env` ファイルに環境変数を設定
- [ ] `.env.example` を作成してテンプレートを提供

---

## Phase 2: 認証機能の実装

### 2.1 認証ストアの作成
- [ ] `src/stores/authStore.ts` を作成
  - [ ] ユーザー状態の管理（ログイン中のユーザー情報）
  - [ ] Googleログイン機能
  - [ ] ログアウト機能
  - [ ] 認証状態の監視（onAuthStateChanged）

### 2.2 ログイン画面の作成
- [ ] `src/pages/LoginPage.tsx` を作成
  - [ ] Googleログインボタン
  - [ ] ログイン中の表示
  - [ ] エラーハンドリング

### 2.3 ルーティングの保護
- [ ] `src/components/ProtectedRoute.tsx` を作成
  - [ ] 未認証ユーザーをログイン画面にリダイレクト
- [ ] `App.tsx` のルーティングを更新
  - [ ] ログイン画面以外を `ProtectedRoute` でラップ

### 2.4 ヘッダーにユーザー情報を表示
- [ ] ヘッダーにユーザーアバター・名前を表示
- [ ] ログアウトボタンを追加

---

## Phase 3: データモデルの拡張

### 3.1 型定義の更新（`src/types/index.ts`）
- [ ] `User` インターフェースを更新
  ```typescript
  export interface User {
    id: string;              // Firebase Auth UID
    email: string;
    displayName: string;
    photoURL?: string;
    createdAt: number;
    lastLoginAt: number;
  }
  ```
- [ ] `Project` にメンバー管理フィールドを追加
  ```typescript
  export interface Project {
    // ... 既存フィールド
    ownerId: string;         // プロジェクト作成者
    memberIds: string[];     // メンバーのUID配列
    inviteCode: string;      // プロジェクト招待コード（シリアルコード）
    isPublic: boolean;       // 公開/非公開
  }
  ```
- [ ] `Issue` に担当者フィールドを活用
  ```typescript
  export interface Issue {
    // ... 既存フィールド
    assigneeId: string | null;  // 既に存在（担当者のUID）
    createdBy: string;          // 既に存在（作成者のUID）
  }
  ```

### 3.2 プロジェクト招待コードの生成
- [ ] `src/utils/inviteCode.ts` を作成
  - [ ] ランダムな6-8文字のコード生成関数
  - [ ] コードの重複チェック機能

---

## Phase 4: Firestoreデータ構造の設計

### 4.1 コレクション構造
```
/users/{userId}
  - id, email, displayName, photoURL, createdAt, lastLoginAt

/projects/{projectId}
  - id, name, description, ownerId, memberIds[], inviteCode, isPublic
  - issueStatuses[], issueTypes[], issueCounter, projectKey, createdAt

/projects/{projectId}/issues/{issueId}
  - (Issueの全フィールド)

/projects/{projectId}/issues/{issueId}/comments/{commentId}
  - (IssueCommentの全フィールド)

/projects/{projectId}/issues/{issueId}/history/{historyId}
  - (IssueHistoryの全フィールド)

/projects/{projectId}/pages/{pageId}
  - (Pageの全フィールド)

/projects/{projectId}/documents/{documentId}
  - (Documentの全フィールド)
```

### 4.2 Firestoreセキュリティルールの設計
- [ ] `firestore.rules` を作成
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      
      // ユーザーコレクション
      match /users/{userId} {
        allow read: if request.auth != null;
        allow write: if request.auth.uid == userId;
      }
      
      // プロジェクトコレクション
      match /projects/{projectId} {
        allow read: if request.auth != null && 
          (resource.data.ownerId == request.auth.uid || 
           request.auth.uid in resource.data.memberIds);
        allow create: if request.auth != null;
        allow update, delete: if request.auth.uid == resource.data.ownerId;
        
        // サブコレクション（issues, pages, documents）
        match /{document=**} {
          allow read, write: if request.auth != null && 
            (get(/databases/$(database)/documents/projects/$(projectId)).data.ownerId == request.auth.uid ||
             request.auth.uid in get(/databases/$(database)/documents/projects/$(projectId)).data.memberIds);
        }
      }
    }
  }
  ```
- [ ] Firebaseコンソールでルールをデプロイ

---

## Phase 5: Firestoreストアの実装

### 5.1 ユーザーストアの更新
- [ ] `src/stores/userStore.ts` を作成/更新
  - [ ] Firestoreからユーザー情報を取得
  - [ ] ユーザープロフィールの更新
  - [ ] プロジェクトメンバーの検索機能

### 5.2 プロジェクトストアの更新
- [ ] `src/stores/projectStore.ts` を更新
  - [ ] LocalStorageからFirestoreへ移行
  - [ ] プロジェクト作成時に `ownerId`, `memberIds`, `inviteCode` を設定
  - [ ] メンバー追加/削除機能
  - [ ] 招待コードによるプロジェクト参加機能
  - [ ] ユーザーが参加しているプロジェクトのみ取得

### 5.3 課題ストアの更新
- [ ] `src/stores/issueStore.ts` を更新
  - [ ] LocalStorageからFirestoreへ移行
  - [ ] サブコレクション構造に対応
  - [ ] リアルタイムリスナーの実装（onSnapshot）
  - [ ] 担当者フィルタリング機能

### 5.4 その他のストアの更新
- [ ] `src/stores/wikiStore.ts` を更新（Firestore対応）
- [ ] `src/stores/documentStore.ts` を更新（Firestore対応）

---

## Phase 6: UI機能の追加

### 6.1 プロジェクト設定画面
- [ ] `src/pages/ProjectSettingsPage.tsx` を作成
  - [ ] プロジェクト基本情報の編集
  - [ ] メンバー一覧の表示
  - [ ] メンバーの追加（招待コード表示）
  - [ ] メンバーの削除（オーナーのみ）
  - [ ] プロジェクトの削除（オーナーのみ）

### 6.2 プロジェクト参加機能
- [ ] `src/pages/JoinProjectPage.tsx` を作成
  - [ ] 招待コード入力フォーム
  - [ ] プロジェクトへの参加処理

### 6.3 課題の担当者機能
- [ ] 課題作成・編集画面に担当者選択を追加
  - [ ] プロジェクトメンバーのドロップダウン
  - [ ] 担当者の表示（アバター + 名前）
- [ ] 課題一覧に担当者列を追加
- [ ] ボード・ガントチャートに担当者を表示

### 6.4 フィルタリング機能の拡張
- [ ] `src/hooks/useIssueFilter.ts` を更新
  - [ ] 担当者フィルタを追加
  - [ ] 「自分の課題」フィルタを追加
- [ ] `src/components/common/IssueFilter.tsx` を更新
  - [ ] 担当者選択ドロップダウンを追加

### 6.5 変更履歴の改善
- [ ] 変更者の表示を実際のユーザー名に変更
- [ ] ユーザーアバターの表示

---

## Phase 7: データ移行機能

### 7.1 LocalStorageからFirestoreへの移行
- [ ] `src/utils/migration.ts` を作成
  - [ ] LocalStorageのデータを読み込み
  - [ ] Firestoreにインポート
  - [ ] 移行完了後にLocalStorageをクリア
- [ ] 移行用UIの作成（初回ログイン時に表示）

### 7.2 エクスポート/インポート機能の更新
- [ ] Firestore対応のエクスポート機能
- [ ] Firestore対応のインポート機能

---

## Phase 8: Cloudflare Pagesへのデプロイ

### 8.1 ビルド設定
- [ ] `vite.config.ts` の本番環境設定を確認
- [ ] 環境変数の設定方法を確認

### 8.2 Cloudflare Pagesプロジェクトの作成
- [ ] Cloudflare Pagesでプロジェクトを作成
- [ ] GitHubリポジトリと連携
- [ ] ビルドコマンドを設定: `npm run build`
- [ ] 出力ディレクトリを設定: `dist`

### 8.3 環境変数の設定
- [ ] Cloudflare PagesのダッシュボードでFirebase環境変数を設定
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_STORAGE_BUCKET`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`

### 8.4 カスタムドメインの設定（オプション）
- [ ] Cloudflare Pagesでカスタムドメインを設定
- [ ] Firebase Authenticationの認証ドメインに追加

---

## Phase 9: テストとデバッグ

### 9.1 機能テスト
- [ ] ログイン/ログアウトのテスト
- [ ] プロジェクト作成・参加のテスト
- [ ] 課題のCRUD操作のテスト
- [ ] 担当者の割り当てのテスト
- [ ] フィルタリング機能のテスト
- [ ] リアルタイム同期のテスト（複数ブラウザで確認）

### 9.2 セキュリティテスト
- [ ] Firestoreルールのテスト
- [ ] 権限のないユーザーがアクセスできないことを確認
- [ ] 招待コードの検証

### 9.3 パフォーマンステスト
- [ ] 大量データでの動作確認
- [ ] リアルタイムリスナーのパフォーマンス確認

---

## Phase 10: ドキュメント作成

### 10.1 ユーザー向けドキュメント
- [ ] README.md の更新
  - [ ] プロジェクトの概要
  - [ ] 使い方（ログイン、プロジェクト作成、招待）
- [ ] ヘルプページの作成（オプション）

### 10.2 開発者向けドキュメント
- [ ] セットアップ手順の作成
- [ ] Firebase設定の手順
- [ ] デプロイ手順の作成

---

## 技術的な詳細

### Firebaseの主要API使用例

#### 認証
```typescript
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from './config/firebase';

// Googleログイン
const provider = new GoogleAuthProvider();
const result = await signInWithPopup(auth, provider);
const user = result.user;

// ログアウト
await signOut(auth);
```

#### Firestore CRUD
```typescript
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from './config/firebase';

// プロジェクト一覧取得（ユーザーが参加しているもの）
const q = query(
  collection(db, 'projects'),
  where('memberIds', 'array-contains', currentUserId)
);
const snapshot = await getDocs(q);
const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

// 課題作成
const issueRef = await addDoc(
  collection(db, `projects/${projectId}/issues`),
  issueData
);

// 課題更新
await updateDoc(
  doc(db, `projects/${projectId}/issues/${issueId}`),
  updates
);

// リアルタイムリスナー
const unsubscribe = onSnapshot(
  collection(db, `projects/${projectId}/issues`),
  (snapshot) => {
    const issues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setIssues(issues);
  }
);
```

### プロジェクト招待コード生成例
```typescript
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 紛らわしい文字を除外
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function joinProjectByCode(code: string, userId: string) {
  const q = query(
    collection(db, 'projects'),
    where('inviteCode', '==', code)
  );
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    throw new Error('無効な招待コードです');
  }
  
  const projectDoc = snapshot.docs[0];
  const projectRef = doc(db, 'projects', projectDoc.id);
  
  await updateDoc(projectRef, {
    memberIds: arrayUnion(userId)
  });
  
  return projectDoc.id;
}
```

---

## 注意事項

1. **段階的な移行**
   - 一度に全てを移行せず、フェーズごとに実装・テストを行う
   - LocalStorageとFirestoreの両対応期間を設ける（フラグで切り替え）

2. **コスト管理**
   - Firebaseの無料枠を確認
   - 読み取り/書き込み回数を最適化（リアルタイムリスナーの使用箇所を限定）

3. **セキュリティ**
   - Firestoreルールを厳格に設定
   - クライアント側でも権限チェックを行う（UX向上のため）

4. **バックアップ**
   - 定期的なFirestoreのバックアップを設定
   - エクスポート機能を活用

5. **エラーハンドリング**
   - ネットワークエラー時の処理
   - オフライン対応（Firestore Offline Persistence）

---

## 優先順位

### 高優先度（MVP）
- Phase 1: Firebase環境構築
- Phase 2: 認証機能
- Phase 3: データモデル拡張
- Phase 4: Firestoreデータ構造
- Phase 5: Firestoreストア実装
- Phase 8: Cloudflare Pagesデプロイ

### 中優先度
- Phase 6: UI機能追加
- Phase 7: データ移行
- Phase 9: テスト

### 低優先度
- Phase 10: ドキュメント作成
- UI/UXの改善
- 追加機能（通知、メンション等）
