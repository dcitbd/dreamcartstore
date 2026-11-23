#!/usr/bin/env python3
"""
DREAM CART BD — UNIVERSAL BULK PRODUCT FILE PARSER (python_engine/bulk_file_parser.py)
Parses .xlsx, .xls, .csv, and .pdf files into normalized 23-column JSON rows.
"""

import csv
import io
import json
import re
import sys
from pathlib import Path


def parse_xlsx(file_path: str) -> list:
    import openpyxl
    wb = openpyxl.load_workbook(file_path, data_only=True)
    ws = wb.active
    rows = []
    for row in ws.iter_rows(values_only=True):
        vals = [str(c).strip() if c is not None else '' for c in row]
        if any(vals):
            rows.append(vals)
    return rows


def parse_csv(file_path: str) -> list:
    raw = Path(file_path).read_text(encoding='utf-8-sig', errors='replace')
    if not raw.strip():
        return []
    first_line = raw.splitlines()[0] if raw.splitlines() else ''
    delim = '\t' if ('\t' in first_line and ',' not in first_line) else ','
    reader = csv.reader(io.StringIO(raw), delimiter=delim)
    return [[c.strip() for c in r] for r in reader if any(c.strip() for c in r)]


def parse_pdf(file_path: str) -> list:
    rows = []
    try:
        import pdfplumber
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables() or []
                for tbl in tables:
                    for r in tbl:
                        cleaned = [str(c).strip() if c is not None else '' for c in r]
                        if any(cleaned):
                            rows.append(cleaned)
            if rows:
                return rows
    except Exception:
        pass

    # Fallback: extract text via pypdf and parse CSV/tabular lines
    try:
        import pypdf
        reader = pypdf.PdfReader(file_path)
        full_text = '\n'.join((p.extract_text() or '') for p in reader.pages)
        if full_text.strip():
            # Try CSV parsing if lines contain commas
            csv_rows = list(csv.reader(io.StringIO(full_text)))
            multi_col = [[c.strip() for c in r] for r in csv_rows if len(r) >= 3 and any(c.strip() for c in r)]
            if multi_col:
                return multi_col
            # Otherwise split on 2+ spaces or pipes
            for line in full_text.splitlines():
                line = line.strip()
                if not line:
                    continue
                parts = re.split(r'\s*\|\s*|\s{2,}', line)
                if len(parts) >= 2:
                    rows.append([p.strip() for p in parts])
    except Exception:
        pass
    return rows


def main():
    if len(sys.argv) < 2:
        print(json.dumps({'rows': [], 'error': 'Missing file path'}))
        return
    file_path = sys.argv[1]
    ext = (sys.argv[2] if len(sys.argv) > 2 else Path(file_path).suffix.lstrip('.')).lower()

    rows = []
    try:
        if ext == 'xlsx':
            rows = parse_xlsx(file_path)
        elif ext == 'pdf':
            rows = parse_pdf(file_path)
        elif ext in ('csv', 'tsv', 'txt'):
            rows = parse_csv(file_path)
    except Exception as e:
        print(json.dumps({'rows': [], 'error': str(e)}))
        return

    print(json.dumps({'rows': rows, 'count': len(rows)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
