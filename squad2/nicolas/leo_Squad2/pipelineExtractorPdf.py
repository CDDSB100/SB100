
import docling
import pathlib
import pytesseract
import os
from pathlib import Path
import re
import unicodedata
import json
import os, glob, subprocess
from qdrant_client import QdrantClient, models
import torch
import os
from sentence_transformers import SentenceTransformer
from transformers import AutoTokenizer, AutoModelForMaskedLM
from typing import Literal
from pydantic import BaseModel



# Certifique-se de ter o Tesseract instalado no sistema:
#   macOS: brew install tesseract
#   Windows: Instale pelo site https://github.com/UB-Mannheim/tesseract/wiki



"""### Actual Pipeline"""

import os

# Get the absolute path of the current working directory
current_directory_path = os.path.abspath("/data/Alva(2005)-NUE - Fernanda Bochi.pdf")
print(f"Current Directory: {current_directory_path}")

# Get the absolute path of a specific file or directory
file_name = "my_document.txt"  # Replace with your file/directory name
full_file_path = os.path.abspath(file_name)
print(f"Full path of '{file_name}': {full_file_path}")

# Get the absolute path of the parent directory
parent_directory_path = os.path.abspath("/data/Alva(2005)-NUE - Fernanda Bochi.pdf")
print(f"Parent Directory: {parent_directory_path}")

# Get the absolute path of the current script file
script_path = os.path.abspath("/data/Alva(2005)-NUE - Fernanda Bochi.pdf")
print(f"Path of current script: {script_path}")

import json

def clean_text(text, miss_words_path="miss_words.json"):
    # Replace glyph artifacts
    text = text.replace("glyph&lt;c=3,font=/CIDFont+F8&gt;", " ")
    text = text.replace("glyph&lt;c=3,font=/CIDFont+F5&gt;", " ")
    text = text.replace("glyph<c=3,font=/CIDFont+F5>", " ")
    text = text.replace("glyph<c=3,font=/CIDFont+F8>", " ")
    text = text.replace("&gt;", "")
    text = text.replace("&lt;", "")

    # # Load misspelled words corrections
    # with open(miss_words_path, "r", encoding="utf-8") as f:
    #     corrections = json.load(f)["replacements"]
    # for wrong, right in corrections.items():
    #     text = text.replace(wrong, right)
    return text

from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import (
    PdfPipelineOptions,
    TesseractCliOcrOptions,
)
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling_core.types.doc import ImageRefMode, PictureItem


# Caminho do PDF (Colab)
file_path = "/home/sb100/leo_Squad2/data/Alva(2005)-NUE - Fernanda Bochi.pdf"



def pass_to_markdown_docling(file_path: str) -> str:
    base_file_name = os.path.basename(file_path)
    base_stem = os.path.splitext(base_file_name)[0]

    # Saídas
    out_md_dir = Path("md_images")
    out_md_dir.mkdir(parents=True, exist_ok=True)

    out_data_dir = Path("data_md")
    out_data_dir.mkdir(parents=True, exist_ok=True)

    # Nome do markdown "principal"
    md_main_path = out_data_dir / f"{base_stem}_docling_md.md"

    # --- pipeline OCR/Tabelas ---
    pipeline_options = PdfPipelineOptions()
    pipeline_options.do_ocr = True
    pipeline_options.do_table_structure = True
    pipeline_options.table_structure_options.do_cell_matching = True

    ocr_options = TesseractCliOcrOptions(lang=["por"], force_full_page_ocr=True)
    pipeline_options.ocr_options = ocr_options
    pipeline_options.generate_picture_images = True

    converter = DocumentConverter(
        format_options={
            InputFormat.PDF: PdfFormatOption(
                pipeline_options=pipeline_options,
            )
        }
    )

    # conversão
    try:
        print(f"🔄 Convertendo: {file_path}")
        print(f"📊 Tamanho: {os.path.getsize(file_path) / (1024*1024):.2f} MB")
        conv_result = converter.convert(file_path)
        # Verifica o status da conversão
        if hasattr(conv_result, 'status') and conv_result.status.name != "SUCCESS":
            print(f"❌ Conversão falhou com status: {conv_result.status}")
            if hasattr(conv_result, 'errors'):
                print(f"Erros: {conv_result.errors}")
            return None
        result = conv_result.document
        print(f"✅ Conversão bem-sucedida!")
    except Exception as e:
        print(f"❌ Erro ao converter: {type(e).__name__}")
        print(f"Mensagem: {str(e)}")
        import traceback
        traceback.print_exc()
        # Tenta um método alternativo simplificado
        print("\n🔄 Tentando conversão simplificada...")
        try:
            simple_options = PdfPipelineOptions()
            simple_options.do_ocr = False
            simple_options.do_table_structure = False

            simple_converter = DocumentConverter(
                format_options={
                    InputFormat.PDF: PdfFormatOption(
                        pipeline_options=simple_options,
                    )
                }
            )
            result = simple_converter.convert(file_path).document
            print(f"✅ Conversão simplificada bem-sucedida!")
        except Exception as e2:
            print(f"❌ Conversão simplificada também falhou: {e2}")
            return None

    # limpar textos
    for text in getattr(result, "texts", []):
        text.orig = clean_text(getattr(text, "orig", ""))

    for table in getattr(result, "tables", []):
        for cell in getattr(table.data, "table_cells", []):
            cell.text = clean_text(getattr(cell, "text", ""))

    # extrair imagens detectadas (PictureItem)
    picture_counter = 0
    for element, _level in result.iterate_items():
        if isinstance(element, PictureItem):
            picture_counter += 1
            element_image_filename = out_md_dir / f"{base_stem}-picture-{picture_counter}.png"
            with element_image_filename.open("wb") as fp:
                element.get_image(result).save(fp, "PNG")

    # salvar um MD com refs externas para as imagens exportadas
    md_with_refs = out_md_dir / f"{base_stem}-with-image-refs.md"
    # se sua versão do docling permitir, dá pra indicar o diretório de imagens também; aqui uso REFERENCED
    result.save_as_markdown(md_with_refs, image_mode=ImageRefMode.REFERENCED)

    # exportações em memória/arquivo
    result_md = result.export_to_markdown()          # markdown "puro"
    result_json = result.export_to_dict()            # estrutura Docling

    with md_main_path.open("w", encoding="utf-8") as f:
        f.write(result_md)

    # Se quiser salvar o JSON, descomente:
    # with (out_data_dir / f"{base_stem}_json.json").open("w", encoding="utf-8") as f:
    #     json.dump(result_json, f, ensure_ascii=False, indent=2)

    return str(md_main_path)

from docling.chunking import HybridChunker
from docling_core.types.doc import DoclingDocument

def docling_chunking(docling_doc: DoclingDocument):

    chunker = HybridChunker(merge_peers=True) #allMiniLM

    chunk_iter = chunker.chunk(docling_doc)
    docling_chunks = []
    for i, chunk in enumerate(chunk_iter):

        enriched_text = chunker.contextualize(chunk=chunk)
        docling_chunks.append(enriched_text)

    print("docling chunks: ", docling_chunks)
    return docling_chunks

"""### Extract Tables"""

def extract_markdown_tables(file_path):
    import re

    def clean_cell(cell):
        cell = cell.strip()
        cell = re.sub(r'GLYPH<[^>]*>', ' ', cell, flags=re.I)
        cell = re.sub(r'/?CIDFont\+\w+>', ' ', cell, flags=re.I)
        cell = re.sub(r'<[^>]+>', ' ', cell)
        cell = re.sub(r'(\S)-\s+(\S)', r'\1\2', cell)
        cell = re.sub(r'\b([A-Z])\s*\+\b', r'\1+ ', cell)
        cell = re.sub(r'\b([PK])\s+resina\b', r'\1-resina', cell, flags=re.I)
        cell = re.sub(r'\bmmol\s*c\b', 'mmolc', cell, flags=re.I)
        cell = re.sub(r'\bt\s*-\s*1\b', 't^-1', cell)
        cell = re.sub(r'\bha\s*-\s*1\b', 'ha^-1', cell)
        cell = re.sub(r'\bdm\s*-\s*3\b', 'dm^-3', cell)
        cell = re.sub(r'\bP\s*2\s*O\s*5\b', 'P2O5', cell)
        cell = re.sub(r'\bK\s*2\s*O\b', 'K2O', cell)
        cell = re.sub(r'_ *_{1,}', '', cell)
        cell = re.sub(r'_{5,}', '', cell)
        cell = re.sub(r'\s{2,}', ' ', cell)
        cell = re.sub(r'\s+([,.;:])', r'\1', cell)
        return cell.strip()

    def process_row(line):
        cells = [clean_cell(cell) for cell in line.split('|')[1:-1]]
        return '| ' + ' | '.join(cells) + ' |'

    with open(file_path, 'r', encoding='utf-8') as file:
        lines = file.readlines()

    tables, current_table, in_table = [], [], False

    for line in lines:
        s = line.strip()
        if s.startswith('|') and s.endswith('|'):
            in_table = True
            current_table.append(process_row(s))
        else:
            if in_table and current_table:
                tables.append(current_table)
                current_table = []
            in_table = False

    if in_table and current_table:
        tables.append(current_table)

    return tables

def extract_full_markdown_with_clean_tables(file_path, file_name):
    import re

    def clean_cell(cell):
        cell = cell.strip()
        # Remove sequências de mais de 4 underscores (com ou sem espaços)
        cell = re.sub(r'_\s*_{4,}', '', cell)
        return cell

    def process_row(line):
        cells = [clean_cell(cell) for cell in line.split('|')[1:-1]]
        return '| ' + ' | '.join(cells) + ' |'

    with open(file_path, 'r', encoding='utf-8') as file:
        lines = file.readlines()

    new_lines = []
    in_table = False
    table_buffer = []

    for line in lines:
        stripped_line = line.strip()
        if stripped_line.startswith('|') and stripped_line.endswith('|'):
            # Dentro de uma tabela
            in_table = True
            table_buffer.append(process_row(stripped_line))
        else:
            if in_table:
                # Saiu da tabela, despeja tabela limpa
                new_lines.extend(table_buffer)
                table_buffer = []
                in_table = False
            new_lines.append(line.rstrip('\n'))

    # Se terminar com tabela
    if in_table and table_buffer:
        new_lines.extend(table_buffer)

    markdown_result = '\n'.join(new_lines)

    with open(f"data_md/{file_name.replace('.pdf', '.md')}", "w", encoding="utf-8") as markdown_file:
        markdown_file.write(markdown_result)

    os.remove(file_path)


    return f"{file_path}\n{markdown_result}"

"""### Pipeline Call"""

# Candidatos comuns no Colab/Ubuntu
candidates = [
    "/usr/share/tesseract-ocr/5/tessdata",
    "/usr/share/tesseract-ocr/4.00/tessdata",
    "/usr/share/tesseract-ocr/tessdata",
    "/usr/share/tessdata",
]

tessdata = next((p for p in candidates if os.path.isdir(p)), None)

# Se não achar, tenta descobrir via comando
if tessdata is None:
    try:
        out = subprocess.check_output(["bash","-lc","dpkg -L tesseract-ocr | grep tessdata | head -n1"], text=True).strip()
        if out and os.path.isdir(out):
            tessdata = out
    except Exception:
        pass

# Último recurso: cria pasta padrão v5
if tessdata is None:
    tessdata = "/usr/share/tesseract-ocr/5/tessdata"
    os.makedirs(tessdata, exist_ok=True)

os.environ["TESSDATA_PREFIX"] = tessdata
print("TESSDATA_PREFIX ->", os.environ["TESSDATA_PREFIX"])

# Verifica se os arquivos essenciais existem
needed = ["osd.traineddata","por.traineddata","eng.traineddata"]
missing = [f for f in needed if not os.path.isfile(os.path.join(tessdata, f))]
print("Faltando:", missing)



# Já foi setado acima, mas se quiser garantir:
os.environ["TESSDATA_PREFIX"] = os.environ.get("TESSDATA_PREFIX", "/usr/share/tesseract-ocr/5/tessdata")

for i, file in enumerate(os.listdir('data')):
    start_file_path = 'data/'+file
    print(start_file_path)

    docling_filepath = pass_to_markdown_docling(start_file_path)
    print("docling")

    extract_full_markdown_with_clean_tables(docling_filepath, file)
    print("docling limpado")

"""Fazendo Chunck"""


import torch
from qdrant_client import QdrantClient, models
from sentence_transformers import SentenceTransformer
from pydantic import BaseModel, Field


from datetime import datetime

directory = "data_md/"
for file in os.listdir(directory):
    with open(directory+file, 'r', encoding='utf-8') as f:
        content = f.readlines()


    print(len(content))

    # Strip all paragraphs before the loop
    content = [paragraph.strip() for paragraph in content]

    # Filter out lines that contain only hyphens
    content = [paragraph for paragraph in content if not paragraph.replace('-', '').replace('|', '').replace(' ', '').strip() == '']

    estado = 0
    chunk_size = 1024
    current_chunk = ""
    chunks = []

    print(content)

    for i, paragraph in enumerate(content):
        if i == 0:
            current_chunk += paragraph
            continue

        if paragraph.startswith("| ") and paragraph.endswith(" |"):
            estado = 2 # Table
        else:
            estado = 1 # Text

        if estado == 2:  # Table row
            current_chunk += "\n" + paragraph
            continue

        # If adding this paragraph would exceed the chunk size
        if len(current_chunk) + len(paragraph) + 1 > chunk_size:
            if current_chunk:
                chunks.append(current_chunk)
            current_chunk = paragraph  # Start new chunk with current paragraph
        else:
            current_chunk += "\n" + paragraph

    if current_chunk:
        chunks.append(current_chunk)

    # input()

    # # Print any remaining content
    # for i, chunk in enumerate(chunks):
    #     print(f"Chunk {i + 1} ({len(chunk)} chars):")
    #     print(chunk)
    #     print("-" * 50)


    DENSE_VECTOR_NAME = "vetor_denso"
    SPARSE_VECTOR_NAME = "vetor_esparso"
    COLLECTION_NAME = "sb100"

    # client = QdrantClient(url="http://localhost:6333")
    # client = QdrantClient(url=os.getenv("QDRANT_URL"), api_key=os.getenv("QDRANT_API_KEY"))
    client = QdrantClient(
        url="http://10.147.20.52:6333/collections",
        api_key="fwaoNYhMTH3vf2QfzrxajQ==",
    )
    client

    class QdrantCollection(BaseModel):
        client: QdrantClient
        name: str
        model_name: str
        model_name_sparse: str
        distance: Literal["Cosine", "Euclid", "Dot"]
        model: SentenceTransformer = None
        sparse_tokenizer: AutoTokenizer = None
        sparse_model: AutoModelForMaskedLM = None

        def __init__(self, **data):
            super().__init__(**data)
            # Initialize the model and store it as an instance attribute
            self.model = SentenceTransformer(self.model_name)
            self.sparse_tokenizer = AutoTokenizer.from_pretrained(self.model_name_sparse)
            self.sparse_model = AutoModelForMaskedLM.from_pretrained(self.model_name_sparse)

        def gerar_vetor_denso(self, texto):
            """Gera um vetor denso para um texto usando o SentenceTransformer."""
            return self.model.encode(texto).tolist()

        def gerar_vetor_esparso(self, texto):
            """Gera um vetor esparso para um texto usando o modelo SPLADE."""
            tokens = self.sparse_tokenizer(
                texto,
                return_tensors='pt',
                max_length=512,
                truncation=True,
                padding='max_length'
            )
            with torch.no_grad():
                output = self.sparse_model(**tokens)
                ativacoes = torch.relu(output.logits)
                max_ativacoes, _ = ativacoes.max(dim=1)  # shape: [1, vocab_size]
                max_ativacoes = max_ativacoes.squeeze(0)  # shape: [vocab_size]
                indices = (max_ativacoes > 0).nonzero(as_tuple=True)[0].tolist()
                valores = max_ativacoes[indices].tolist()
            return models.SparseVector(indices=indices, values=valores)

        def create(self):
            if not self.client.collection_exists(collection_name=self.name):
                self.client.create_collection(
                    collection_name=self.name,
                    vectors_config={
                        DENSE_VECTOR_NAME: models.VectorParams(size=self.model.get_sentence_embedding_dimension(), distance=models.Distance.COSINE)
                    },
                    sparse_vectors_config={
                        SPARSE_VECTOR_NAME: models.SparseVectorParams(index=models.SparseIndexParams(on_disk=False))
                    }
                )
                print("Collection created")
            else:
                print("Collection already exists")

        def add_points(self, chunk, metadata):
            self.client.upsert(
                collection_name=self.name,
                points=[
                    models.PointStruct(
                        id=self.client.get_collection(self.name).points_count+1,
                        vector={
                            DENSE_VECTOR_NAME: self.gerar_vetor_denso(chunk),
                            SPARSE_VECTOR_NAME: self.gerar_vetor_esparso(chunk)
                        },
                        payload=metadata
                    )
                ]
            )
            print("Data added")

        def delete_collection(self):
            self.client.delete_collection(collection_name=self.name)
            print("Collection deleted")

        class Config:
            arbitrary_types_allowed = True # Allow arbitrary types like QdrantClient

    collections = QdrantCollection(
        client=client,
        name=COLLECTION_NAME,
        model_name="Qwen/Qwen3-Embedding-0.6B",
        model_name_sparse="opensearch-project/opensearch-neural-sparse-encoding-doc-v2-distill",
        distance="Cosine"
    )
    collections.create()

    # Inserção dos chunks com metadados
    for idx, chunk in enumerate(chunks):
        print("="*200)
        print(chunk)
        print("="*200)

        metadata = {
            "content": chunk,
            "file": file,
            "chunk_index": idx,
            "chunk_size": len(chunk),
            "tipo": "tabela" if any(
                ln.strip().startswith("|") and ln.strip().endswith("|")
                for ln in chunk.splitlines()
            ) else "texto",
            "ingestao": datetime.now().isoformat(),
            "cultura": "Citros"
        }

        collections.add_points(chunk, metadata=metadata)

    print(len(chunks))
