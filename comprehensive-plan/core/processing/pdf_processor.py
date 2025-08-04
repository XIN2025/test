import os
import tempfile
import base64
from typing import List, Tuple
from core.processing.text_processor import TextProcessor
from core.db.graph_db import Neo4jDatabase

try:
    from unstructured.partition.pdf import partition_pdf
except ImportError:
    partition_pdf = None

class PDFProcessor:
    def __init__(self, text_processor: TextProcessor = None):
        self.text_processor = text_processor or TextProcessor()
        self.db = Neo4jDatabase()

    def process_pdf(self, file_content: bytes, filename: str) -> Tuple[List[dict], List[dict], List[dict]]:
        """
        Process a PDF file and extract entities, relationships, and images.
        Returns (entities, relationships, image_summaries)
        """
        if partition_pdf is None:
            raise ImportError("unstructured library not installed. Cannot process PDFs.")
        # Save PDF to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(file_content)
            tmp_path = tmp.name
        # Extract elements from PDF
        output_path = tempfile.mkdtemp()
        elements = partition_pdf(
            filename=tmp_path,
            extract_images_in_pdf=True,
            infer_table_structure=True,
            chunking_strategy="by_title",
            max_characters=4000,
            new_after_n_chars=3800,
            combine_text_under_n_chars=2000,
            extract_image_block_output_dir=output_path,
        )
        # Extract text and images
        text_chunks = []
        for e in elements:
            if hasattr(e, 'text') and e.text:
                text_chunks.append(e.text)
        # Process all text chunks
        entities, relationships = [], []
        for chunk in text_chunks:
            ents, rels = self.text_processor.process_text(chunk)
            entities.extend(ents)
            relationships.extend(rels)
        # Extract images and create summaries (dummy, to be filled in API)
        image_files = [f for f in os.listdir(output_path) if f.lower().endswith((".png", ".jpg", ".jpeg"))]
        image_summaries = []
        for img_file in image_files:
            img_path = os.path.join(output_path, img_file)
            with open(img_path, "rb") as f:
                img_b64 = base64.b64encode(f.read()).decode('utf-8')
            image_summaries.append({
                "id": f"image_{img_file}",
                "base64": img_b64,
                "summary": None  # To be filled by LLM in API if needed
            })
        return entities, relationships, image_summaries 