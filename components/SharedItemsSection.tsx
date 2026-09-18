"use client";

import { useCallback, useEffect, useState } from "react";
import type { CardDTO } from "./CardForm";
import ShareForm from "./ShareForm";
import Modal from "./Modal";
import ConfirmDialog from "./ConfirmDialog";
import { sharedItemContribution } from "@/lib/overviewItems";
import { UserGroupIcon } from "./icons";

export type IncomingShareDTO = {
  _id: string;
  ownerEmail: string;
  itemKey: string;
  label: string;
  amount: number;
  included: boolean;
};

type OutgoingShareDTO = {
  _id: string;
  targetEmail: string;
  itemKey: string;
  label: string;
  included: boolean;
};

type EmailGroup = {
  email: string;
  items: IncomingShareDTO[];
  includedTotal: number;
};

function groupByEmail(items: IncomingShareDTO[]): EmailGroup[] {
  const map = new Map<string, IncomingShareDTO[]>();
  for (const item of items) {
    const list = map.get(item.ownerEmail) ?? [];
    list.push(item);
    map.set(item.ownerEmail, list);
  }
  return Array.from(map.entries()).map(([email, groupItems]) => ({
    email,
    items: groupItems,
    includedTotal: groupItems
      .filter((i) => i.included)
      .reduce((sum, i) => sum + sharedItemContribution(i.itemKey, i.amount), 0),
  }));
}

export default function SharedItemsSection({
  incomingItems,
  loading,
  onIncomingChanged,
}: {
  incomingItems: IncomingShareDTO[];
  loading: boolean;
  /** 我(收件人)切換某個共享項目是否納入支出後呼叫,讓外層重新載入 overview 總覽數字。 */
  onIncomingChanged: () => void;
}) {
  const [outgoingShares, setOutgoingShares] = useState<OutgoingShareDTO[]>([]);
  const [cards, setCards] = useState<CardDTO[]>([]);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OutgoingShareDTO | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  // 「納入支出」勾選只先改本地狀態,按下「儲存」或關閉視窗前確認要不要儲存時,才一次送出變更,
  // 避免使用者每勾一次就打一次 API、等一次整頁重新載入。
  const [localItems, setLocalItems] = useState<IncomingShareDTO[]>(incomingItems);

  const loadOutgoing = useCallback(async () => {
    const res = await fetch("/api/shares");
    const data = await res.json();
    setOutgoingShares(data.shares ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadOutgoing();
    fetch("/api/cards")
      .then((res) => res.json())
      .then((data) => setCards(data.cards ?? []));
  }, [loadOutgoing]);

  async function handleShared() {
    setShowForm(false);
    await loadOutgoing();
  }

  async function confirmDeleteOutgoing() {
    if (!deleteTarget) return;
    await fetch(`/api/shares/${deleteTarget._id}`, { method: "DELETE" });
    setDeleteTarget(null);
    await loadOutgoing();
  }

  // 每次打開明細視窗都用伺服器最新的資料重置本地編輯狀態,開始一輪新的勾選。
  useEffect(() => {
    if (showDetail) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalItems(incomingItems);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDetail]);

  const isDirty = localItems.some((item) => {
    const original = incomingItems.find((i) => i._id === item._id);
    return original ? original.included !== item.included : false;
  });

  function toggleIncludedLocal(item: IncomingShareDTO) {
    // 結餘一律不計入統計,不提供勾選。
    if (item.itemKey === "balance") return;
    setLocalItems((prev) =>
      prev.map((i) => (i._id === item._id ? { ...i, included: !i.included } : i))
    );
  }

  async function saveChanges() {
    const changed = localItems.filter((item) => {
      const original = incomingItems.find((i) => i._id === item._id);
      return original && original.included !== item.included;
    });
    if (changed.length === 0) return;
    setSaving(true);
    await Promise.all(
      changed.map((item) =>
        fetch(`/api/shares/${item._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ included: item.included }),
        })
      )
    );
    setSaving(false);
    onIncomingChanged();
  }

  function discardChanges() {
    setLocalItems(incomingItems);
  }

  function requestCloseDetail() {
    if (isDirty) {
      setShowExitConfirm(true);
      return;
    }
    setShowDetail(false);
  }

  async function confirmExitSave() {
    await saveChanges();
    setShowExitConfirm(false);
    setShowDetail(false);
  }

  function confirmExitDiscard() {
    discardChanges();
    setShowExitConfirm(false);
    setShowDetail(false);
  }

  const groups = groupByEmail(localItems);
  const sharedWithMeEmails = Array.from(new Set(incomingItems.map((i) => i.ownerEmail)));
  const sharedByMeEmails = Array.from(new Set(outgoingShares.map((s) => s.targetEmail)));

  return (
    <div
      className={`rounded-lg border border-zinc-200 bg-white p-4 transition-opacity dark:border-zinc-800 dark:bg-zinc-900 ${loading ? "opacity-60" : ""}`}
    >
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 font-medium text-zinc-900 dark:text-zinc-50">
          <UserGroupIcon className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
          共享參考表
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDetail(true)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
          >
            查看明細
          </button>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
          >
            新增分享
          </button>
        </div>
      </div>

      {sharedWithMeEmails.length === 0 && sharedByMeEmails.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">目前沒有與任何人共享</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {sharedWithMeEmails.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">分享給我:</span>
              {sharedWithMeEmails.map((email) => (
                <span
                  key={email}
                  className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  {email}
                </span>
              ))}
            </div>
          )}
          {sharedByMeEmails.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">我分享給:</span>
              {sharedByMeEmails.map((email) => (
                <span
                  key={email}
                  className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  {email}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal open={showDetail} onClose={requestCloseDetail} title="共享參考表">
        <div className="flex flex-col gap-5">
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">別人分享給我(依 email 分類)</h3>
              <button
                type="button"
                onClick={saveChanges}
                disabled={!isDirty || saving}
                className="shrink-0 rounded-md border border-zinc-900 bg-zinc-900 px-3 py-1 text-xs font-medium text-white disabled:cursor-not-allowed disabled:border-zinc-300 disabled:bg-zinc-300 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:disabled:border-zinc-700 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-400"
              >
                {saving ? "儲存中…" : "確定"}
              </button>
            </div>
            {groups.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">目前沒有人跟你分享項目</p>
            ) : (
              <div className="flex flex-col gap-3">
                {groups.map((group) => (
                  <div key={group.email} className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate font-medium text-zinc-900 dark:text-zinc-50">{group.email}</p>
                      <span className="shrink-0 text-sm text-zinc-500 dark:text-zinc-400">
                        已納入支出 <span className="font-medium text-zinc-900 dark:text-zinc-50">${group.includedTotal.toLocaleString()}</span>
                      </span>
                    </div>
                    <ul className="flex flex-col gap-2">
                      {group.items.map((item) => (
                        <li
                          key={item._id}
                          className="flex flex-col gap-1.5 rounded-md bg-zinc-50 p-2.5 sm:flex-row sm:items-center sm:justify-between dark:bg-zinc-800/60"
                        >
                          <span className="text-sm text-zinc-700 dark:text-zinc-300">{item.label}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                              ${item.amount.toLocaleString()}
                            </span>
                            {item.itemKey === "balance" ? (
                              <span className="text-xs text-zinc-400 dark:text-zinc-500">結餘不計入統計</span>
                            ) : (
                              <label className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-300">
                                <input
                                  type="checkbox"
                                  checked={item.included}
                                  onChange={() => toggleIncludedLocal(item)}
                                />
                                納入支出
                              </label>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">我分享出去的項目</h3>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
              >
                新增分享
              </button>
            </div>
            {outgoingShares.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">還沒有分享任何項目給別人</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {outgoingShares.map((share) => (
                  <li
                    key={share._id}
                    className="flex items-center justify-between gap-2 rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-zinc-700 dark:text-zinc-300">{share.label}</p>
                      <p className="truncate text-xs text-zinc-400 dark:text-zinc-500">分享給 {share.targetEmail}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(share)}
                      className="shrink-0 text-xs text-red-600 hover:underline dark:text-red-400"
                    >
                      取消分享
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Modal>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="新增分享">
        <ShareForm cards={cards} onSaved={handleShared} onCancel={() => setShowForm(false)} />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="取消分享"
        message={`確定要取消分享「${deleteTarget?.label ?? ""}」給 ${deleteTarget?.targetEmail ?? ""} 嗎?`}
        confirmLabel="取消分享"
        onConfirm={confirmDeleteOutgoing}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={showExitConfirm}
        title="儲存變更?"
        message="「納入支出」的勾選有異動尚未儲存,要儲存嗎?"
        confirmLabel="儲存"
        cancelLabel="不儲存"
        danger={false}
        onConfirm={confirmExitSave}
        onCancel={confirmExitDiscard}
      />
    </div>
  );
}
