"""
Management command: extract_policy_pdfs

Usage examples
--------------
# Process all PDFs in a folder (creates + updates DB records):
  python manage.py extract_policy_pdfs --scan-dir "C:/path/to/JKG PROJECT"

# Reprocess every existing DB record that lacks extracted_rules:
  python manage.py extract_policy_pdfs --reprocess

# Reprocess a single DB record by ID:
  python manage.py extract_policy_pdfs --reprocess --id 3

# Do both in one run:
  python manage.py extract_policy_pdfs --scan-dir "..." --reprocess
"""

import os
from datetime import date

from django.core.files import File
from django.core.management.base import BaseCommand

from users.models import PolicyRuleDocument
from users.utils.pdf_policy_extractor import extract_policy_rules_from_pdf


class Command(BaseCommand):
    help = (
        "Extract insurance policy rules from PDF files and store them in "
        "PolicyRuleDocument records."
    )

    # ------------------------------------------------------------------
    # CLI arguments
    # ------------------------------------------------------------------
    def add_arguments(self, parser):
        parser.add_argument(
            "--scan-dir",
            type=str,
            default=None,
            help="Path to a directory that will be scanned for *.pdf files. "
                 "A new PolicyRuleDocument record is created for each PDF that "
                 "does not already have one (matched by filename).",
        )
        parser.add_argument(
            "--reprocess",
            action="store_true",
            default=False,
            help="Also reprocess all existing DB records that do NOT yet have "
                 "extracted_rules (i.e. extraction_status != 'success').",
        )
        parser.add_argument(
            "--id",
            type=int,
            default=None,
            help="When combined with --reprocess, process only the record with "
                 "this primary key.",
        )

    # ------------------------------------------------------------------
    # Entry point
    # ------------------------------------------------------------------
    def handle(self, *args, **options):
        scan_dir = options.get("scan_dir")
        reprocess = options.get("reprocess")
        specific_id = options.get("id")

        processed = 0
        failed = 0

        # 1. Scan a directory and create / update records for each PDF found
        if scan_dir:
            processed_dir, failed_dir = self._scan_directory(scan_dir)
            processed += processed_dir
            failed += failed_dir

        # 2. Reprocess existing DB records that still lack extracted_rules
        if reprocess:
            processed_db, failed_db = self._reprocess_existing(specific_id)
            processed += processed_db
            failed += failed_db

        if not scan_dir and not reprocess:
            self.stdout.write(
                self.style.WARNING(
                    "Nothing to do.  Use --scan-dir and/or --reprocess.  "
                    "Run with --help for usage examples."
                )
            )
            return

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"Finished — {processed} succeeded, {failed} failed."
            )
        )
        if processed:
            self.stdout.write(
                "RAG engine will load the new rules automatically on the next "
                "request (or restart the server)."
            )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _scan_directory(self, directory: str):
        """Walk *directory*, find every .pdf, and process it."""
        if not os.path.isdir(directory):
            self.stdout.write(
                self.style.ERROR(f"Directory not found: {directory}")
            )
            return 0, 0

        pdf_paths = []
        for root, _dirs, files in os.walk(directory):
            for fname in files:
                if fname.lower().endswith(".pdf"):
                    pdf_paths.append(os.path.join(root, fname))

        self.stdout.write(
            f"Found {len(pdf_paths)} PDF(s) in {directory}"
        )

        ok = 0
        fail = 0
        for pdf_path in pdf_paths:
            result = self._process_one_pdf(pdf_path)
            if result:
                ok += 1
            else:
                fail += 1
        return ok, fail

    def _reprocess_existing(self, specific_id=None):
        """Reprocess DB records that are missing extracted_rules."""
        if specific_id:
            qs = PolicyRuleDocument.objects.filter(pk=specific_id)
        else:
            qs = PolicyRuleDocument.objects.exclude(extraction_status="success")

        count = qs.count()
        self.stdout.write(
            f"Reprocessing {count} existing DB record(s) without extracted_rules …"
        )

        ok = 0
        fail = 0
        for doc in qs:
            pdf_path = None
            if doc.original_pdf:
                try:
                    pdf_path = doc.original_pdf.path
                except Exception:
                    pass

            if not pdf_path or not os.path.exists(pdf_path):
                self.stdout.write(
                    self.style.ERROR(
                        f"  [#{doc.id}] PDF file not on disk — skipping "
                        f"({doc.original_pdf.name if doc.original_pdf else 'no file'})"
                    )
                )
                doc.extraction_status = "failed"
                doc.extraction_error = "PDF file not found on disk"
                doc.save(update_fields=["extraction_status", "extraction_error"])
                fail += 1
                continue

            success = self._extract_and_save(doc, pdf_path)
            if success:
                ok += 1
            else:
                fail += 1

        return ok, fail

    def _process_one_pdf(self, pdf_path: str):
        """
        Given an absolute path to a PDF:
         - If a PolicyRuleDocument already references it (same filename),
           reprocess it only if extraction hasn't succeeded yet.
         - Otherwise create a new record, save the file, then extract.

        Returns True on success, False on failure.
        """
        filename = os.path.basename(pdf_path)

        # Look for an existing record by matching the stored filename
        existing = PolicyRuleDocument.objects.filter(
            original_pdf__endswith=filename
        ).first()

        if existing:
            if existing.extraction_status == "success":
                self.stdout.write(
                    f"  [#{existing.id}] Already extracted — skipping: {filename}"
                )
                return True
            self.stdout.write(
                f"  [#{existing.id}] Re-extracting (status={existing.extraction_status}): "
                f"{filename}"
            )
            return self._extract_and_save(existing, pdf_path)

        # Create a new DB record and copy the file into MEDIA_ROOT
        self.stdout.write(f"  [NEW] Creating record for: {filename}")
        doc = PolicyRuleDocument(
            extraction_status="pending",
            is_active=False,
        )
        with open(pdf_path, "rb") as fh:
            doc.original_pdf.save(filename, File(fh), save=True)

        return self._extract_and_save(doc, doc.original_pdf.path)

    def _extract_and_save(self, doc: PolicyRuleDocument, pdf_path: str) -> bool:
        """Call Gemini, fill in doc fields, save.  Returns True on success."""
        self.stdout.write(
            f"    Sending to Gemini: {os.path.basename(pdf_path)} …"
        )
        try:
            doc.extraction_status = "processing"
            doc.save(update_fields=["extraction_status"])

            extracted = extract_policy_rules_from_pdf(pdf_path)

            if not extracted:
                raise ValueError("Gemini returned no parseable JSON")

            # Map extracted fields onto the model
            doc.policy_number = extracted.get("policy_number") or ""
            doc.holder_name = extracted.get("holder_name") or ""

            raw_type = (extracted.get("policy_type") or "").strip()
            valid_types = {
                "Individual Health",
                "Family Floater",
                "Corporate",
                "Senior Citizen",
            }
            doc.policy_type = raw_type if raw_type in valid_types else "Corporate"

            for field, key in (("cover_start", "cover_start"), ("cover_end", "cover_end")):
                raw = extracted.get(key)
                if raw:
                    try:
                        setattr(doc, field, date.fromisoformat(str(raw)))
                    except (ValueError, TypeError):
                        pass  # leave as null

            doc.extracted_rules = extracted
            doc.extraction_status = "success"
            doc.is_active = True
            doc.extraction_error = ""

            doc.save()

            self.stdout.write(
                self.style.SUCCESS(
                    f"    OK — policy_number={doc.policy_number!r}  "
                    f"holder={doc.holder_name!r}  type={doc.policy_type}"
                )
            )
            return True

        except Exception as exc:
            doc.extraction_status = "failed"
            doc.extraction_error = str(exc)
            try:
                doc.save(update_fields=["extraction_status", "extraction_error"])
            except Exception:
                pass
            self.stdout.write(self.style.ERROR(f"    FAILED: {exc}"))
            return False
