"use client";

import { X } from "lucide-react";
import type { MediaType, EntityType } from "@/lib/media-types";
import MediaManager from "./MediaManager";

type Props = {
  entityType: EntityType;
  entityId: string;
  allowedTypes: MediaType[];
  defaultType: MediaType;
  title: string;
  description?: string;
  onClose: () => void;
};

export default function MediaManagerModal({
  entityType,
  entityId,
  allowedTypes,
  defaultType,
  title,
  description,
  onClose,
}: Props) {
  return (
    <div className="fixed inset-0 z-[150] flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div>
            <h3 className="text-sm font-bold text-ink">{title}</h3>
            <p className="text-xs text-ink-dim">{entityType} · {entityId}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-muted hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-5">
          <MediaManager
            entityType={entityType}
            entityId={entityId}
            allowedTypes={allowedTypes}
            defaultType={defaultType}
            description={description}
          />
        </div>
      </div>
    </div>
  );
}
