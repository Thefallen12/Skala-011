type UniversalDocumentPreviewProps = {
  title: string;
  src: string;
};

export default function UniversalDocumentPreview({
  title,
  src,
}: UniversalDocumentPreviewProps) {
  return (
    <iframe
      title={title}
      src={src}
      className="h-[70vh] min-h-[480px] w-full rounded-md border bg-white"
    />
  );
}
