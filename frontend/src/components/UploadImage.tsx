
import { useState, type ChangeEvent } from "react";

function UploadImageForm({
  onUploadSuccess,
}: {
  onUploadSuccess: (url: string) => void;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleUpload() {
    if (!selectedFile) {
      setMessage("Please choose an image.");
      return;
    }

    setIsUploading(true);

    try {
      const presignResponse = await fetch("http://localhost:4000/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileType: selectedFile.type,
        }),
      });

      if (!presignResponse.ok) {
        throw new Error(`Presign failed (${presignResponse.status})`);
      }

      const { signedUrl, publicUrl } = await presignResponse.json();

      const uploadResponse = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      if (!uploadResponse.ok) {
        const errorBody = await uploadResponse.text();
        const code = errorBody.match(/<Code>([^<]+)<\/Code>/)?.[1];
        const detail = errorBody.match(/<Message>([^<]+)<\/Message>/)?.[1];
        const reason = [code, detail].filter(Boolean).join(": ");
        throw new Error(
          `Upload to R2 failed (${uploadResponse.status})${reason ? `: ${reason}` : ""}`,
        );
      }

      // Return the actual public R2 URL
      onUploadSuccess(publicUrl);
      setMessage("Upload successful!");
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        type="file"
        accept="image/*"
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          setSelectedFile(e.target.files?.[0] ?? null)
        }
      />

      <button
        type="button"
        onClick={handleUpload}
        disabled={isUploading}
      >
        {isUploading ? "Uploading..." : "Upload Image"}
      </button>

      {message && <p>{message}</p>}
    </div>
  );
}

export default UploadImageForm;
