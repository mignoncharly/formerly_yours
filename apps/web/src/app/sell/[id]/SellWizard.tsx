"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { parsePriceToMinor } from "@owy/validation";
import type { Listing, ItemCondition } from "@owy/database/types";
import { createClient } from "@/lib/supabase/client";
import { compressAndStripImage } from "@/lib/images";
import { Button, Card, Progress } from "@/components/ui";
import { CONDITIONS, CONDITION_LABELS, formatMinorPrice } from "@/lib/listings";
import {
  attachImage,
  publishListing,
  removeImage,
  saveDraft,
  type DraftPatch,
} from "../actions";

type Cat = { id: number; parent_id: number | null; slug: string; name: string };
type Img = { id: string; storagePath: string; sortOrder: number; url: string };

const STEPS = ["Photos", "Title", "Category", "Condition", "Details", "Price"] as const;

const inputClass =
  "w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2.5 text-[var(--color-paper)] outline-none placeholder:text-[color-mix(in_oklab,var(--color-muted)_70%,transparent)] focus:border-[color-mix(in_oklab,var(--color-paper)_45%,transparent)]";

export function SellWizard({
  listing,
  categories,
  initialImages,
  userId,
}: {
  listing: Listing;
  categories: Cat[];
  initialImages: Img[];
  userId: string;
}) {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);

  const tops = categories.filter((c) => c.parent_id === null);
  const initialCat = categories.find((c) => c.id === listing.category_id) ?? null;
  const initialTopId = initialCat
    ? (initialCat.parent_id ?? initialCat.id)
    : null;

  const [step, setStep] = React.useState(0);
  const [images, setImages] = React.useState<Img[]>(initialImages);
  const [uploading, setUploading] = React.useState(false);

  const [title, setTitle] = React.useState(listing.title ?? "");
  const [topId, setTopId] = React.useState<number | null>(initialTopId);
  const [categoryId, setCategoryId] = React.useState<number | null>(
    listing.category_id,
  );
  const [condition, setCondition] = React.useState<ItemCondition | null>(
    listing.condition,
  );
  const [brand, setBrand] = React.useState(listing.brand ?? "");
  const [model, setModel] = React.useState(listing.model ?? "");
  const [description, setDescription] = React.useState(listing.description ?? "");
  const [price, setPrice] = React.useState(
    listing.price_amount != null ? (listing.price_amount / 100).toString() : "",
  );

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const subs = topId ? categories.filter((c) => c.parent_id === topId) : [];
  const priceMinor = parsePriceToMinor(price);

  async function persist(patch: DraftPatch) {
    setSaving(true);
    setError(null);
    const res = await saveDraft(listing.id, patch);
    setSaving(false);
    if (!res.ok) setError(res.error);
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    let order = images.length;
    for (const file of Array.from(files)) {
      try {
        const { blob, width, height } = await compressAndStripImage(file);
        const imageId = crypto.randomUUID();
        const path = `${userId}/${listing.id}/${imageId}.webp`;
        const { error: upErr } = await supabase.storage
          .from("listing-images")
          .upload(path, blob, { contentType: "image/webp", upsert: false });
        if (upErr) throw new Error(upErr.message);

        const res = await attachImage({
          listingId: listing.id,
          storagePath: path,
          width,
          height,
          sortOrder: order,
        });
        if (!res.ok) throw new Error(res.error);

        const url = URL.createObjectURL(blob);
        setImages((prev) => [
          ...prev,
          { id: res.id, storagePath: path, sortOrder: order, url },
        ]);
        order += 1;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not add that photo.");
      }
    }
    setUploading(false);
  }

  async function onRemoveImage(imageId: string) {
    setImages((prev) => prev.filter((i) => i.id !== imageId));
    await removeImage(imageId);
  }

  function next() {
    // Persist the current step before advancing.
    if (step === 1) void persist({ title });
    if (step === 2) void persist({ categoryId });
    if (step === 3) void persist({ condition });
    if (step === 4) void persist({ brand, model, description });
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onPublish() {
    setError(null);
    // Final save of everything, then publish.
    await persist({
      title,
      categoryId,
      condition,
      brand,
      model,
      description,
      priceMinor: priceMinor ?? null,
    });
    const res = await publishListing(listing.id);
    if (res && !res.ok) setError(res.error);
    // On success the action redirects to the listing page.
  }

  const canContinue =
    step === 0 ? images.length > 0 : step === 1 ? title.trim().length >= 3 : true;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-5 py-8">
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs text-[var(--color-muted)]">
          <span>
            Step {step + 1} of {STEPS.length} · {STEPS[step]}
          </span>
          <span>{saving ? "Saving…" : "Saved"}</span>
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} label="Listing progress" />
      </div>

      <Card className="p-6">
        {step === 0 && (
          <section>
            <h2 className="mb-1 font-[family-name:var(--font-display)] text-xl text-[var(--color-paper)]">
              Photos
            </h2>
            <p className="mb-4 text-sm text-[var(--color-muted)]">
              Add a few clear photos. We strip location &amp; device data from every
              image automatically.
            </p>

            <div className="grid grid-cols-3 gap-2">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="group relative aspect-square overflow-hidden rounded-lg border border-[var(--color-line)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveImage(img.id)}
                    className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white opacity-0 transition group-hover:opacity-100"
                    aria-label="Remove photo"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <label className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border border-dashed border-[var(--color-line)] text-2xl text-[var(--color-muted)] hover:border-[var(--color-paper)]">
                +
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => onFiles(e.target.files)}
                />
              </label>
            </div>
            {uploading && (
              <p className="mt-3 text-sm text-[var(--color-muted)]">Processing…</p>
            )}
          </section>
        )}

        {step === 1 && (
          <section>
            <h2 className="mb-1 font-[family-name:var(--font-display)] text-xl text-[var(--color-paper)]">
              What are you selling?
            </h2>
            <p className="mb-4 text-sm text-[var(--color-muted)]">
              A short, clear title buyers would search for.
            </p>
            <input
              className={inputClass}
              placeholder="e.g. Vintage Omega Seamaster watch"
              value={title}
              maxLength={80}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => persist({ title })}
            />
          </section>
        )}

        {step === 2 && (
          <section>
            <h2 className="mb-1 font-[family-name:var(--font-display)] text-xl text-[var(--color-paper)]">
              Category
            </h2>
            <p className="mb-4 text-sm text-[var(--color-muted)]">
              Where does it belong?
            </p>
            <div className="flex flex-col gap-3">
              <select
                className={inputClass}
                value={topId ?? ""}
                onChange={(e) => {
                  const v = e.target.value ? Number(e.target.value) : null;
                  setTopId(v);
                  setCategoryId(v);
                  void persist({ categoryId: v });
                }}
              >
                <option value="">Select a category…</option>
                {tops.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {subs.length > 0 && (
                <select
                  className={inputClass}
                  value={categoryId && categoryId !== topId ? categoryId : ""}
                  onChange={(e) => {
                    const v = e.target.value ? Number(e.target.value) : topId;
                    setCategoryId(v);
                    void persist({ categoryId: v });
                  }}
                >
                  <option value="">All of {tops.find((t) => t.id === topId)?.name}</option>
                  {subs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <h2 className="mb-1 font-[family-name:var(--font-display)] text-xl text-[var(--color-paper)]">
              Condition
            </h2>
            <p className="mb-4 text-sm text-[var(--color-muted)]">
              Be honest — it builds trust.
            </p>
            <div className="flex flex-col gap-2">
              {CONDITIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setCondition(c);
                    void persist({ condition: c });
                  }}
                  className={`rounded-lg border px-4 py-3 text-left ${
                    condition === c
                      ? "border-[var(--color-primary)] text-[var(--color-paper)]"
                      : "border-[var(--color-line)] text-[var(--color-muted)]"
                  }`}
                >
                  {CONDITION_LABELS[c]}
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 4 && (
          <section>
            <h2 className="mb-1 font-[family-name:var(--font-display)] text-xl text-[var(--color-paper)]">
              Details
            </h2>
            <p className="mb-4 text-sm text-[var(--color-muted)]">
              Brand, model and a description. No story yet — that comes later.
            </p>
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <input
                  className={inputClass}
                  placeholder="Brand (optional)"
                  value={brand}
                  maxLength={80}
                  onChange={(e) => setBrand(e.target.value)}
                  onBlur={() => persist({ brand })}
                />
                <input
                  className={inputClass}
                  placeholder="Model (optional)"
                  value={model}
                  maxLength={80}
                  onChange={(e) => setModel(e.target.value)}
                  onBlur={() => persist({ model })}
                />
              </div>
              <textarea
                className={`${inputClass} min-h-32 resize-y`}
                placeholder="Describe the item, its flaws and details."
                value={description}
                maxLength={2000}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => persist({ description })}
              />
            </div>
          </section>
        )}

        {step === 5 && (
          <section>
            <h2 className="mb-1 font-[family-name:var(--font-display)] text-xl text-[var(--color-paper)]">
              Price
            </h2>
            <p className="mb-4 text-sm text-[var(--color-muted)]">
              Set a fair asking price in euros.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-lg text-[var(--color-muted)]">€</span>
              <input
                className={inputClass}
                inputMode="decimal"
                placeholder="690,00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                onBlur={() => persist({ priceMinor: parsePriceToMinor(price) ?? null })}
              />
            </div>
            {price.trim() !== "" && priceMinor == null && (
              <p className="mt-2 text-sm text-[color-mix(in_oklab,#ff6b6b_80%,var(--color-paper))]">
                Enter a valid amount, e.g. 690 or 690,00.
              </p>
            )}
            {priceMinor != null && (
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                Buyers see {formatMinorPrice(priceMinor)}.
              </p>
            )}
          </section>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-[color-mix(in_oklab,#ff6b6b_85%,var(--color-paper))]">
            {error}
          </p>
        )}
      </Card>

      <div className="mt-6 flex items-center justify-between">
        {step > 0 ? (
          <Button type="button" variant="ghost" onClick={back}>
            Back
          </Button>
        ) : (
          <button
            type="button"
            onClick={() => router.push("/sell")}
            className="text-sm text-[var(--color-muted)] underline underline-offset-4"
          >
            Save &amp; exit
          </button>
        )}

        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={next} disabled={!canContinue}>
            Continue
          </Button>
        ) : (
          <Button type="button" onClick={onPublish} disabled={priceMinor == null}>
            Publish
          </Button>
        )}
      </div>
    </main>
  );
}
