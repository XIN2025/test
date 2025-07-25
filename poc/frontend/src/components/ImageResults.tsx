import React from "react";

export interface ImageResult {
  id: string;
  summary: string;
  base64: string;
}

interface Props {
  images: ImageResult[];
}

const ImageResults: React.FC<Props> = ({ images }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
    {images.map((img) => (
      <div key={img.id} style={{ border: "1px solid #ccc", padding: 8 }}>
        <img
          src={`data:image/png;base64,${img.base64}`}
          alt={img.summary}
          style={{ maxWidth: 200, maxHeight: 200, display: "block" }}
        />
        <div style={{ marginTop: 8 }}>{img.summary}</div>
      </div>
    ))}
  </div>
);

export default ImageResults;
