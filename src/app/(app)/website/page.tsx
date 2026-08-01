"use client";

import { useMemo, useRef, useState } from "react";
import {
  Eye, EyeOff, Film, Image as ImageIcon, Images, Pencil, Trash2, Upload,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { fmtDate, toISODate, uid } from "@/lib/format";
import { WEBSITE_SECTIONS, type Media, type MediaKind } from "@/lib/types";
import { downloadExcel } from "@/lib/exporter";
import { FilterBar, matches } from "@/components/ui/Filters";
import { Badge, Card, EmptyState, PageHeader, Stat, cx } from "@/components/ui/primitives";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { FormGrid, SelectField, TextAreaField, TextField, ToggleField } from "@/components/ui/Form";
import { useToast } from "@/components/ui/Toast";

/** Browser storage is small, so keep uploads modest. */
const MAX_UPLOAD_MB = 3;

function blank(): Media {
  return {
    id: uid("md"),
    title: "",
    kind: "image",
    url: "",
    section: WEBSITE_SECTIONS[0],
    published: true,
    uploadedAt: toISODate(new Date()),
  };
}

export default function WebsitePage() {
  const { db, save, remove } = useStore();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [section, setSection] = useState("");
  const [kind, setKind] = useState("");
  const [visibility, setVisibility] = useState("");
  const [editing, setEditing] = useState<Media | null>(null);
  const [deleting, setDeleting] = useState<Media | null>(null);

  const rows = useMemo(
    () =>
      db.media
        .filter(
          (m) =>
            (!section || m.section === section) &&
            (!kind || m.kind === kind) &&
            (!visibility || (visibility === "live" ? m.published : !m.published)) &&
            matches(search, m.title, m.section, m.caption),
        )
        .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)),
    [db.media, search, section, kind, visibility],
  );

  const live = db.media.filter((m) => m.published).length;

  /* Read the picked file into a data URL so it survives a reload. */
  const onPickFile = (file: File) => {
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      toast.error(
        "File is too large",
        `Keep uploads under ${MAX_UPLOAD_MB} MB, or paste a hosted link instead. Large videos are best linked, not uploaded.`,
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setEditing({
        ...blank(),
        title: file.name.replace(/\.[^.]+$/, ""),
        kind: file.type.startsWith("video") ? "video" : "image",
        url: String(reader.result),
      });
    };
    reader.readAsDataURL(file);
  };

  const togglePublished = (m: Media) => {
    save("media", { ...m, published: !m.published });
    toast.success(m.published ? "Hidden from the website" : "Published to the website", m.title);
  };

  const exportRows = () =>
    downloadExcel(
      [
        {
          name: "Website Media",
          rows: rows.map((m) => ({
            Title: m.title,
            Type: m.kind === "video" ? "Video" : "Image",
            Section: m.section,
            Caption: m.caption ?? "",
            Status: m.published ? "Live" : "Hidden",
            Source: m.url.startsWith("data:") ? "Uploaded file" : m.url,
            Uploaded: m.uploadedAt,
          })),
        },
      ],
      "malwa-website-media",
    );

  return (
    <>
      <PageHeader title="Website" subtitle="Photos and videos that appear on the public site">
        <input
          ref={fileInput}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPickFile(file);
            e.target.value = "";
          }}
        />
        <button className="btn btn-outline btn-sm" onClick={() => setEditing(blank())}>
          Add by link
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => fileInput.current?.click()}>
          <Upload size={14} /> Upload
        </button>
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Live on the site" value={live} sub={`${db.media.length - live} hidden`} icon={<Eye size={16} />} tone="green" />
        <Stat label="Photos" value={db.media.filter((m) => m.kind === "image").length} icon={<ImageIcon size={16} />} tone="blue" />
        <Stat label="Videos" value={db.media.filter((m) => m.kind === "video").length} icon={<Film size={16} />} tone="violet" />
      </div>

      <Card className="mt-4" padded={false}>
        <FilterBar
          search={search}
          onSearch={setSearch}
          placeholder="Search title, section or caption…"
          onExport={exportRows}
          filters={[
            {
              allLabel: "All sections",
              value: section,
              onChange: setSection,
              options: WEBSITE_SECTIONS.map((s) => ({ value: s, label: s })),
            },
            {
              allLabel: "Photos & videos",
              value: kind,
              onChange: setKind,
              options: [
                { value: "image", label: "Photos only" },
                { value: "video", label: "Videos only" },
              ],
            },
            {
              allLabel: "Live & hidden",
              value: visibility,
              onChange: setVisibility,
              options: [
                { value: "live", label: "Live" },
                { value: "hidden", label: "Hidden" },
              ],
            },
          ]}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon={<Images size={30} />}
            title="Nothing here yet"
            hint="Upload a photo or video, or add one by pasting a link, and it will show up on the website."
            action={
              <button className="btn btn-primary btn-sm" onClick={() => fileInput.current?.click()}>
                <Upload size={14} /> Upload media
              </button>
            }
          />
        ) : (
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rows.map((m) => (
              <figure key={m.id} className="group overflow-hidden rounded-xl border border-line bg-surface-2">
                <div className="relative aspect-[4/3] overflow-hidden bg-surface-3">
                  {m.kind === "video" ? (
                    <video src={m.url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={m.url} alt={m.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                  )}

                  <div className="absolute left-2 top-2 flex gap-1.5">
                    <Badge tone={m.kind === "video" ? "violet" : "blue"}>
                      {m.kind === "video" ? <Film size={11} /> : <ImageIcon size={11} />}
                      {m.kind === "video" ? "Video" : "Photo"}
                    </Badge>
                    <Badge tone={m.published ? "green" : "gray"} dot>
                      {m.published ? "Live" : "Hidden"}
                    </Badge>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                    <button
                      className="btn btn-xs bg-white/90 text-black hover:bg-white"
                      onClick={() => togglePublished(m)}
                      title={m.published ? "Hide from the website" : "Show on the website"}
                    >
                      {m.published ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                    <button className="btn btn-xs bg-white/90 text-black hover:bg-white" onClick={() => setEditing(m)} title="Edit">
                      <Pencil size={12} />
                    </button>
                    <button className="btn btn-xs bg-rose-600 text-white hover:bg-rose-700" onClick={() => setDeleting(m)} title="Delete">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <figcaption className="p-3">
                  <p className={cx("truncate text-[13px] font-semibold", m.published ? "text-ink" : "text-muted")}>
                    {m.title}
                  </p>
                  <p className="truncate text-[11.5px] text-muted">{m.section}</p>
                  {m.caption && <p className="mt-1 line-clamp-2 text-[11.5px] text-muted">{m.caption}</p>}
                  <p className="mt-1.5 text-[10.5px] text-muted">Added {fmtDate(m.uploadedAt)}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </Card>

      {editing && (
        <MediaModal
          media={editing}
          onClose={() => setEditing(null)}
          onSave={(m) => {
            save("media", m);
            toast.success(db.media.some((x) => x.id === m.id) ? "Media updated" : "Media added", m.title);
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          remove("media", deleting.id);
          toast.success("Media deleted", `${deleting.title} was removed from the website.`);
        }}
        title="Delete this media?"
        message={<><strong>{deleting?.title}</strong> will disappear from the website immediately.</>}
      />
    </>
  );
}

function MediaModal({
  media,
  onClose,
  onSave,
}: {
  media: Media;
  onClose: () => void;
  onSave: (m: Media) => void;
}) {
  const [form, setForm] = useState<Media>(media);
  const set = <K extends keyof Media>(key: K, value: Media[K]) => setForm((f) => ({ ...f, [key]: value }));
  const uploaded = form.url.startsWith("data:");
  const valid = form.title.trim() && form.url.trim();

  return (
    <Modal
      open
      onClose={onClose}
      title={media.title ? "Edit media" : "Add media"}
      subtitle="Published media appears on the public website straight away."
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!valid} onClick={() => onSave(form)}>
            Save
          </button>
        </>
      }
    >
      {form.url && (
        <div className="mb-4 overflow-hidden rounded-xl border border-line bg-surface-3">
          {form.kind === "video" ? (
            <video src={form.url} className="max-h-56 w-full object-contain" controls preload="metadata" />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={form.url} alt={form.title} className="max-h-56 w-full object-contain" />
          )}
        </div>
      )}

      <FormGrid>
        <TextField label="Title" value={form.title} onChange={(v) => set("title", v)} full placeholder="Gill Residence — Front Elevation" />
        <SelectField
          label="Type"
          value={form.kind}
          onChange={(v) => set("kind", v as MediaKind)}
          options={[
            { value: "image", label: "Photo" },
            { value: "video", label: "Video" },
          ]}
        />
        <SelectField
          label="Website section"
          value={form.section}
          onChange={(v) => set("section", v)}
          options={WEBSITE_SECTIONS.map((s) => ({ value: s, label: s }))}
        />
        {uploaded ? (
          <div className="sm:col-span-2">
            <label className="label">Source</label>
            <p className="rounded-lg bg-surface-2 px-3 py-2 text-[12.5px] text-muted">
              Uploaded from this device. Replace it by uploading a new file.
            </p>
          </div>
        ) : (
          <TextField
            label="Link"
            type="url"
            value={form.url}
            onChange={(v) => set("url", v)}
            full
            placeholder="https://…"
            hint="Any public image or video URL works — YouTube links should use the direct file or embed URL."
          />
        )}
        <TextField label="Added on" type="date" value={form.uploadedAt} onChange={(v) => set("uploadedAt", v)} />
        <TextAreaField label="Caption" value={form.caption ?? ""} onChange={(v) => set("caption", v)} rows={2} placeholder="Shown under the photo on the website" />
        <ToggleField
          label="Show on the website"
          checked={form.published}
          onChange={(v) => set("published", v)}
          hint="Turn this off to keep it in the panel without publishing it."
        />
      </FormGrid>
    </Modal>
  );
}
