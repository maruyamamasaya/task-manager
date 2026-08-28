---
status: active
date: 2026-08-26
---

# ADR-002: 子を持つ Task はフォルダとして扱う

## Context

Task階層導入後、親自身の予定・実績と子の値が併存すると操作対象と集計の意味が曖昧になります。Git履歴の `6e911b4 Treat parent tasks as folders` と一連のmigration、利用者マニュアルに同じ規則が明記されています。

## Decision

子Taskが追加された親Taskは整理用フォルダとし、状態、進捗、優先度、期限、予定工数をクリアします。フォルダへのSchedule、Work Log、Progress Log、Reflectionの新規関連付けはDBでも拒否します。既存の関連履歴は削除しません。

## Consequences

実行・集計対象が末端Taskに限定され、二重計上を避けられます。子を追加する操作は不可逆的な履歴削除をしない一方、既にSchedule済みのTaskを親にする操作は拒否されます。UIだけでなくtrigger/RPCの規則も維持する必要があります。

## Evidence

`20260826000000_parent_tasks_become_folders.sql`、`20260826030000_prevent_scheduled_tasks_becoming_folders.sql`、README、利用者マニュアルを根拠とします。
