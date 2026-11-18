export function ImagePreview({ previewUrl }: { previewUrl: string | null }) {
  if (!previewUrl) return null;

  return (
    <div className="mt-6 w-full max-w-sm">
      <img
        src={previewUrl}
        alt="Uploaded preview"
        style={{display: 'block', margin: '0 auto', maxWidth: '100%', maxHeight: '24rem', width: 'auto', height: 'auto', borderRadius: '0.5rem', opacity: 1}}
      />
    </div>
  );
}