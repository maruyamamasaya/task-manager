---
status: active
date: 2026-08-26
---

# ADR-003: WBS を通常の Project / Task から独立させる

## Context

Git履歴の `c5c3292 Add independent WBS project management module` で、個人向けProject/Taskとは別の共有可能なWBSモデルが追加されました。schemaに両領域を結ぶ外部キーはなく、利用者マニュアルも非連携を明示しています。

## Decision

WBS Project / Item は通常 Project / Task と自動連携しない独立モデルとします。WBSは大きな工程と共同編集、Taskは実務の実行・記録を担います。WBS固有の共有コード、membership role、参加申請、階層制約と集約規則を用います。

## Consequences

共同編集WBSの認可と個人TaskのRLSを分離できます。一方、同じ案件名や工程を二重に入力する場合があり、自動同期を前提にできません。将来連携する場合は既存の対応関係を推測せず、明示的な識別子、移行、権限モデルを新たなADRで定める必要があります。

## Evidence

`20260826040000_wbs_module.sql`、Git履歴、`public/manual/README.md` と `public/manual/basics/wbs.md` を根拠とします。
