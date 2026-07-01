import unittest

from app.services.vector.chunking import chunk_document


class ChunkDocumentTests(unittest.TestCase):
    def test_chunks_by_semantic_sections_and_preserves_sentences(self):
        text = (
            "# Project Summary\n"
            "This is the first paragraph of the project summary. It contains two sentences.\n\n"
            "- Item one\n"
            "- Item two\n\n"
            "## Notes\n"
            "These notes should stay together and not be split mid-sentence."
        )

        chunks = chunk_document(text, max_tokens=40, overlap_tokens=5)

        self.assertGreaterEqual(len(chunks), 2)
        self.assertTrue(all(chunk.strip() for chunk in chunks))
        self.assertTrue(any("Project Summary" in chunk for chunk in chunks))
        self.assertTrue(any("Notes" in chunk for chunk in chunks))


if __name__ == "__main__":
    unittest.main()
