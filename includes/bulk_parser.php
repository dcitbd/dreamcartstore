<?php
/**
 * DREAM CART BD — UNIVERSAL BULK FILE PARSER (includes/bulk_parser.php)
 * Parses .xlsx, .xls, .csv, .tsv, and .pdf files into 2D row arrays on cPanel PHP
 * without requiring Composer or external PHP dependencies.
 */

class DcbdBulkFileParser {
    /**
     * Parse an uploaded file path by extension into a 2D array of string rows
     */
    public static function parseFile(string $filePath, string $origFilename = ''): array {
        $ext = strtolower(pathinfo($origFilename ?: $filePath, PATHINFO_EXTENSION));
        if ($ext === 'xlsx') {
            $rows = self::parseXlsx($filePath);
            if (!empty($rows)) return $rows;
        }
        if ($ext === 'pdf') {
            $rows = self::parsePdf($filePath);
            if (!empty($rows)) return $rows;
        }
        if ($ext === 'xls') {
            $rows = self::parseXlsOrHtml($filePath);
            if (!empty($rows)) return $rows;
        }
        if (in_array($ext, ['csv', 'tsv', 'txt'], true)) {
            return self::parseCsv($filePath, $ext === 'tsv' ? "\t" : ',');
        }
        // Fallback: try Python helper if available
        return self::parseViaPython($filePath, $ext);
    }

    /**
     * RFC-4180 Multi-line CSV/TSV parser using PHP fgetcsv
     */
    public static function parseCsv(string $filePath, string $delimiter = ','): array {
        $rows = [];
        $raw = @file_get_contents($filePath);
        if ($raw === false || trim($raw) === '') return [];
        // Strip UTF-8 BOM
        $raw = preg_replace('/^\xEF\xBB\xBF/', '', $raw);
        // Auto-detect tab delimiter if first line has tabs and no commas
        $firstLine = strtok($raw, "\r\n");
        if ($firstLine !== false && strpos($firstLine, "\t") !== false && strpos($firstLine, ',') === false) {
            $delimiter = "\t";
        }
        $fp = @fopen('php://temp', 'r+');
        if (!$fp) return [];
        fwrite($fp, $raw);
        rewind($fp);
        while (($data = fgetcsv($fp, 0, $delimiter, '"', '\\')) !== false) {
            if (is_array($data) && count(array_filter($data, function($v) { return trim((string)$v) !== ''; })) > 0) {
                $rows[] = array_map(function($v) { return trim((string)$v); }, $data);
            }
        }
        fclose($fp);
        return $rows;
    }

    /**
     * Pure-PHP XLSX parser using ZipArchive + SimpleXML (works on all cPanel PHP servers)
     */
    public static function parseXlsx(string $filePath): array {
        if (!class_exists('ZipArchive') || !function_exists('simplexml_load_string')) {
            return self::parseViaPython($filePath, 'xlsx');
        }
        $zip = new ZipArchive();
        if ($zip->open($filePath) !== true) {
            return self::parseViaPython($filePath, 'xlsx');
        }

        // 1. Read shared strings
        $sharedStrings = [];
        $ssXmlRaw = $zip->getFromName('xl/sharedStrings.xml');
        if ($ssXmlRaw !== false) {
            $ssXml = @simplexml_load_string($ssXmlRaw);
            if ($ssXml && isset($ssXml->si)) {
                foreach ($ssXml->si as $si) {
                    if (isset($si->t)) {
                        $sharedStrings[] = (string)$si->t;
                    } elseif (isset($si->r)) {
                        $txt = '';
                        foreach ($si->r as $r) {
                            $txt .= (string)($r->t ?? '');
                        }
                        $sharedStrings[] = $txt;
                    } else {
                        $sharedStrings[] = '';
                    }
                }
            }
        }

        // 2. Find first worksheet XML
        $sheetXmlRaw = $zip->getFromName('xl/worksheets/sheet1.xml');
        if ($sheetXmlRaw === false) {
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $name = $zip->getNameIndex($i);
                if (preg_match('#^xl/worksheets/sheet\d+\.xml$#i', $name)) {
                    $sheetXmlRaw = $zip->getFromName($name);
                    if ($sheetXmlRaw !== false) break;
                }
            }
        }
        $zip->close();

        if ($sheetXmlRaw === false) {
            return [];
        }

        $sheetXml = @simplexml_load_string($sheetXmlRaw);
        if (!$sheetXml || !isset($sheetXml->sheetData->row)) {
            return [];
        }

        $rows = [];
        foreach ($sheetXml->sheetData->row as $rowNode) {
            $rowArr = [];
            $maxCol = 0;
            foreach ($rowNode->c as $c) {
                $ref = (string)($c['r'] ?? '');
                $colIdx = self::colRefToIndex($ref, count($rowArr));
                if ($colIdx > $maxCol) $maxCol = $colIdx;

                $type = (string)($c['t'] ?? '');
                $val  = '';
                if ($type === 's') {
                    $ssIdx = (int)($c->v ?? 0);
                    $val = $sharedStrings[$ssIdx] ?? '';
                } elseif ($type === 'inlineStr') {
                    if (isset($c->is->t)) {
                        $val = (string)$c->is->t;
                    } elseif (isset($c->is->r)) {
                        foreach ($c->is->r as $r) {
                            $val .= (string)($r->t ?? '');
                        }
                    }
                } elseif ($type === 'str' || $type === 'b' || $type === 'e') {
                    $val = (string)($c->v ?? '');
                } else {
                    $val = (string)($c->v ?? '');
                }
                $rowArr[$colIdx] = trim($val);
            }
            if (!empty($rowArr)) {
                $fullRow = [];
                for ($i = 0; $i <= $maxCol; $i++) {
                    $fullRow[] = $rowArr[$i] ?? '';
                }
                if (count(array_filter($fullRow, function($v) { return $v !== ''; })) > 0) {
                    $rows[] = $fullRow;
                }
            }
        }
        return $rows;
    }

    /**
     * Convert Excel cell reference (e.g. 'AA12') to 0-based column index
     */
    private static function colRefToIndex(string $ref, int $fallback): int {
        if (!preg_match('/^([A-Z]+)\d+$/i', strtoupper(trim($ref)), $m)) {
            return $fallback;
        }
        $letters = $m[1];
        $idx = 0;
        $len = strlen($letters);
        for ($i = 0; $i < $len; $i++) {
            $idx = $idx * 26 + (ord($letters[$i]) - 64);
        }
        return $idx - 1;
    }

    /**
     * Parse XML-based .xls or HTML-table .xls
     */
    public static function parseXlsOrHtml(string $filePath): array {
        $raw = @file_get_contents($filePath);
        if (!$raw) return [];
        if (stripos($raw, '<table') !== false || stripos($raw, '<tr') !== false) {
            $dom = new DOMDocument();
            @$dom->loadHTML('<?xml encoding="UTF-8">' . $raw);
            $rows = [];
            foreach ($dom->getElementsByTagName('tr') as $tr) {
                $r = [];
                foreach ($tr->childNodes as $cell) {
                    if (in_array(strtolower($cell->nodeName), ['td', 'th'], true)) {
                        $r[] = trim($cell->textContent);
                    }
                }
                if (!empty($r)) $rows[] = $r;
            }
            if (!empty($rows)) return $rows;
        }
        return self::parseViaPython($filePath, 'xls');
    }

    /**
     * Parse PDF into 23-column product rows (uses Python pypdf/pdfplumber if available, with pure-PHP fallback)
     */
    public static function parsePdf(string $filePath): array {
        $pyRows = self::parseViaPython($filePath, 'pdf');
        if (!empty($pyRows)) {
            return $pyRows;
        }
        // Pure-PHP fallback: extract text streams and look for CSV-like or tabular lines
        $raw = @file_get_contents($filePath);
        if (!$raw) return [];
        $text = '';
        if (preg_match_all('/stream\r?\n(.*?)\r?\nendstream/s', $raw, $matches)) {
            foreach ($matches[1] as $stream) {
                $decoded = @gzuncompress($stream);
                if ($decoded === false) $decoded = $stream;
                if (preg_match_all('/\(([^()]*)\)\s*Tj/s', $decoded, $tj)) {
                    $text .= implode(' ', $tj[1]) . "\n";
                }
                if (preg_match_all('/\[(.*?)\]\s*TJ/s', $decoded, $tjs)) {
                    foreach ($tjs[1] as $arr) {
                        if (preg_match_all('/\(([^()]*)\)/s', $arr, $parts)) {
                            $text .= implode('', $parts[1]) . ' ';
                        }
                    }
                    $text .= "\n";
                }
            }
        }
        if (trim($text) === '') return [];
        $tmpCsv = tempnam(sys_get_temp_dir(), 'dcbd_pdf_');
        file_put_contents($tmpCsv, $text);
        $rows = self::parseCsv($tmpCsv, ',');
        @unlink($tmpCsv);
        return $rows;
    }

    /**
     * Invoke python_engine/bulk_file_parser.py if shell_exec is enabled on cPanel
     */
    private static function parseViaPython(string $filePath, string $ext): array {
        if (!function_exists('shell_exec')) {
            return [];
        }
        $script = dirname(__DIR__) . '/python_engine/bulk_file_parser.py';
        if (!is_file($script)) {
            return [];
        }
        $cmd = 'python3 ' . escapeshellarg($script) . ' ' . escapeshellarg($filePath) . ' ' . escapeshellarg($ext) . ' 2>/dev/null';
        $out = @shell_exec($cmd);
        if ($out) {
            $decoded = @json_decode($out, true);
            if (is_array($decoded) && !empty($decoded['rows']) && is_array($decoded['rows'])) {
                return $decoded['rows'];
            }
        }
        return [];
    }
}
