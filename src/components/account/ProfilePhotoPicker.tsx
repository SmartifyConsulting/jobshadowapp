import { useEffect, useRef, useState } from "react";
import { Camera, UserRound } from "lucide-react";
import { ImageCropModal } from "@/components/ImageCropModal";
import { supabase } from "@/integrations/supabase/client";

export function ProfilePhotoPicker({
  path,
  file,
  onChange,
}: {
  path: string;
  file?: File | undefined;
  onChange: (file: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [crop, setCrop] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => {
        active = false;
        URL.revokeObjectURL(url);
      };
    }
    setPreview("");
    if (path)
      void supabase.storage
        .from("scholar-docs")
        .createSignedUrl(path, 300)
        .then(({ data }) => {
          if (active) setPreview(data?.signedUrl ?? "");
        });
    return () => {
      active = false;
    };
  }, [file, path]);
  return (
    <div className="mb-4 flex items-center gap-3">
      <button
        type="button"
        aria-label="Change profile photo"
        onClick={() => input.current?.click()}
        className="relative grid aspect-square h-20 w-20 shrink-0 place-items-center rounded-full border border-input bg-muted"
        style={{ width: 80, height: 80 }}
      >
        {preview ? (
          <span className="absolute inset-0 overflow-hidden rounded-full">
            <img
              src={preview}
              alt="Profile photo"
              width={80}
              height={80}
              className="block h-full w-full object-cover"
            />
          </span>
        ) : (
          <UserRound className="h-9 w-9" />
        )}
        <Camera className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-background p-1" />
      </button>
      <span className="text-xs text-muted-foreground">Profile photo</span>
      <input
        ref={input}
        aria-label="Upload profile photo"
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const selected = e.target.files?.[0];
          e.target.value = "";
          if (!selected) return;
          if (!selected.type.startsWith("image/")) {
            setError("Choose an image file.");
            return;
          }
          setError("");
          setCrop(selected);
        }}
      />
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {crop && (
        <ImageCropModal
          key={crop.lastModified + crop.name}
          file={crop}
          onCancel={() => setCrop(null)}
          onSave={(blob) => {
            onChange(new File([blob], "profile-photo.jpg", { type: "image/jpeg" }));
            setCrop(null);
          }}
        />
      )}
    </div>
  );
}
