"""
IndusServiceFlow branded report styling for ReportLab-generated PDFs --
Employees module.

This file is intentionally self-contained and module-local (lives inside
the employees app, not a shared "common" module) so this module owns its own
copy and can be tweaked independently without touching the other apps.

Layout rules:
  - The navy header banner appears ONLY on page 1.
  - The full Orchasp footer block appears ONLY on the LAST page of the
    document (however many pages that ends up being) -- not on every
    page, and not omitted if the report happens to span several pages.
  - Every page reserves the same bottom margin (whether or not the
    footer actually gets drawn there) so the footer never overlaps
    table rows on whichever page turns out to be last.

This is pure ReportLab (Platypus + canvas). No HTML, no WeasyPrint.
"""

import os
from datetime import datetime

from django.conf import settings as django_settings

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    NextPageTemplate,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.graphics.shapes import Drawing, Circle, String

try:
    from reportlab.platypus import Image as RLImage
except ImportError:  # pragma: no cover
    RLImage = None


NAVY = colors.HexColor("#182a5c")
NAVY_DARK = colors.HexColor("#0f1c40")
TEAL = colors.HexColor("#16a394")
TEAL_DARK = colors.HexColor("#0f8f83")
GRAY_TEXT = colors.HexColor("#6b7280")
GRID_LINE = colors.HexColor("#dfe4ec")
ROW_ALT = colors.HexColor("#f4f7fb")
WHITE = colors.white


CARD_PALETTE = [
    ("#EAF0FE", "#1a2f6e"),
    ("#E6F8EF", "#0f7a4d"),
    ("#FDF3DF", "#9a6a12"),
    ("#EAF6FB", "#0b6e8f"),
    ("#F1ECFB", "#5b3aa6"),
    ("#FDEDED", "#b3261e"),
]

STATUS_COLORS = {
    "completed": ("#E6F8EF", "#0f7a4d"),
    "confirmed": ("#E6F8EF", "#0f7a4d"),
    "active": ("#E6F8EF", "#0f7a4d"),
    "available": ("#E6F8EF", "#0f7a4d"),
    "waiting": ("#FDF3DF", "#9a6a12"),
    "in progress": ("#FDF3DF", "#9a6a12"),
    "pending": ("#FDF3DF", "#9a6a12"),
    "cancelled": ("#F0F1F3", "#6b7280"),
    "inactive": ("#F0F1F3", "#6b7280"),
    "unassigned": ("#F0F1F3", "#6b7280"),
    "no show": ("#FDEDED", "#b3261e"),
    "left queue": ("#FDEDED", "#b3261e"),
    "rejected": ("#FDEDED", "#b3261e"),
}

PAGE_SIZE = A4
PAGE_W, PAGE_H = PAGE_SIZE

HEADER_HEIGHT = 30 * mm
FOOTER_HEIGHT = 26 * mm
SIDE_MARGIN = 8 * mm


CONT_TOP_MARGIN = 12 * mm

STATIC_DIR = os.path.join(django_settings.BASE_DIR, "statics")
ISF_LOGO = os.path.join(STATIC_DIR, "indusserviseflow logo.png")
ORCHASP_LOGO = os.path.join(STATIC_DIR, "orchasp logo.png")


_STYLES = {
    "section_title": ParagraphStyle(
        "section_title",
        fontName="Helvetica-Bold",
        fontSize=12.5,
        textColor=NAVY,
        leading=15,
    ),
    "meta": ParagraphStyle(
        "meta",
        fontName="Helvetica",
        fontSize=9,
        textColor=GRAY_TEXT,
        leading=13,
    ),
    "page_title": ParagraphStyle(
        "page_title",
        fontName="Helvetica-Bold",
        fontSize=19,
        textColor=NAVY,
        leading=22,
    ),
    "card_label": ParagraphStyle(
        "card_label",
        fontName="Helvetica-Bold",
        fontSize=7,
        textColor=GRAY_TEXT,
        leading=9,
    ),
    "card_sub": ParagraphStyle(
        "card_sub",
        fontName="Helvetica",
        fontSize=7,
        textColor=GRAY_TEXT,
        leading=9,
    ),
    "th": ParagraphStyle(
        "th",
        fontName="Helvetica-Bold",
        fontSize=8.5,
        textColor=WHITE,
        leading=10,
    ),
    "td": ParagraphStyle(
        "td",
        fontName="Helvetica",
        fontSize=8.3,
        textColor=colors.HexColor("#1f2937"),
        leading=10,
    ),
    "pill": ParagraphStyle(
        "pill",
        fontName="Helvetica-Bold",
        fontSize=7.5,
        alignment=TA_CENTER,
        leading=9,
    ),
    "empty": ParagraphStyle(
        "empty",
        fontName="Helvetica-Oblique",
        fontSize=10,
        textColor=GRAY_TEXT,
        alignment=TA_CENTER,
    ),
}


def card_value_style(color_hex):
    return ParagraphStyle(
        f"card_value_{color_hex}",
        fontName="Helvetica-Bold",
        fontSize=17,
        textColor=colors.HexColor(color_hex),
        leading=20,
    )


def section_heading(number, title, width):
    badge = Drawing(22, 20)
    badge.add(Circle(10, 9, 9.2, fillColor=NAVY, strokeColor=None))
    badge.add(
        String(
            10,
            5.3,
            str(number),
            fontSize=10.5,
            fillColor=WHITE,
            textAnchor="middle",
            fontName="Helvetica-Bold",
        )
    )
    title_para = Paragraph(title, _STYLES["section_title"])
    t = Table([[badge, title_para]], colWidths=[26, width - 26])
    t.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (0, 0), 0),
                ("LEFTPADDING", (1, 0), (1, 0), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ("LINEBELOW", (0, 0), (-1, 0), 1.4, TEAL),
            ]
        )
    )
    return t


SECTION_GAP = 4 * mm


SECTION_SPACER = 7 * mm


def kpi_card_grid(cards, total_width, columns=4):
    """cards: list of dicts {label, value, sublabel, color(optional 0-5 idx)}"""
    if not cards:
        return Spacer(1, 0)

    rows_of_cards = [cards[i : i + columns] for i in range(0, len(cards), columns)]
    gap = 6
    col_width = (total_width - gap * (columns - 1)) / columns

    grid_rows = []
    for row_cards in rows_of_cards:
        cells = []
        for idx, card in enumerate(row_cards):
            bg, fg = CARD_PALETTE[card.get("palette", idx) % len(CARD_PALETTE)]
            inner = Table(
                [
                    [Paragraph(card["label"].upper(), _STYLES["card_label"])],
                    [Paragraph(str(card["value"]), card_value_style(fg))],
                    [Paragraph(card.get("sublabel", ""), _STYLES["card_sub"])],
                ],
                colWidths=[col_width - 20],
            )
            inner.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(bg)),
                        ("LEFTPADDING", (0, 0), (-1, -1), 10),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                        ("TOPPADDING", (0, 0), (0, 0), 9),
                        ("BOTTOMPADDING", (-1, -1), (-1, -1), 9),
                        ("TOPPADDING", (1, 0), (1, 0), 1),
                        ("BOTTOMPADDING", (0, 0), (1, 0), 2),
                        ("ROUNDEDCORNERS", [7, 7, 7, 7]),
                    ]
                )
            )
            cells.append(inner)
        while len(cells) < columns:
            cells.append("")
        grid_rows.append(cells)

    grid = Table(
        grid_rows,
        colWidths=[col_width] * columns,
        spaceAfter=4,
        spaceBefore=SECTION_GAP,
    )
    style = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), gap),
    ]
    grid.setStyle(TableStyle(style))
    return grid


def _status_pill(value):
    text = "" if value is None else str(value)
    bg, fg = STATUS_COLORS.get(text.strip().lower(), ("#F0F1F3", "#374151"))
    style = ParagraphStyle(
        "pill_x", parent=_STYLES["pill"], textColor=colors.HexColor(fg)
    )
    p = Paragraph(text, style)
    t = Table([[p]])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(bg)),
                ("ROUNDEDCORNERS", [6, 6, 6, 6]),
                ("TOPPADDING", (0, 0), (-1, -1), 2.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return t


def data_table(headers, rows, col_widths=None, status_cols=None, total_width=None):
    """
    headers: list[str]
    rows: list[list] (raw values, will be stringified / paragraph-wrapped)
    status_cols: set of column indexes to render as colored status pills
    """
    status_cols = status_cols or set()

    if not rows:
        empty_row = [Paragraph("No records found for this report.", _STYLES["empty"])]
        t = Table(
            [empty_row],
            colWidths=[total_width] if total_width else None,
            spaceBefore=SECTION_GAP,
        )
        t.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f4f7fb")),
                    ("BOX", (0, 0), (-1, -1), 0.6, GRID_LINE),
                    ("TOPPADDING", (0, 0), (-1, -1), 18),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 18),
                ]
            )
        )
        return t

    header_row = [Paragraph(h, _STYLES["th"]) for h in headers]
    table_data = [header_row]
    for row in rows:
        cells = []
        for idx, val in enumerate(row):
            if idx in status_cols:
                cells.append(_status_pill(val))
            else:
                cells.append(Paragraph("" if val is None else str(val), _STYLES["td"]))
        table_data.append(cells)

    t = Table(table_data, colWidths=col_widths, repeatRows=1, spaceBefore=SECTION_GAP)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, ROW_ALT]),
                ("GRID", (0, 0), (-1, -1), 0.4, GRID_LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return t


def _fmt_status(status):
    if not status:
        return "N/A", "#6b7280"
    bg, fg = STATUS_COLORS.get(str(status).strip().lower(), ("#F0F1F3", "#374151"))
    return str(status).upper(), fg


def _draw_header(
    canvas, doc, report_title, report_subtitle, organization, generated_at
):
    """Navy banner -- drawn on page 1 only."""
    canvas.saveState()
    W, H = PAGE_SIZE

    canvas.setFillColor(NAVY)
    canvas.rect(0, H - HEADER_HEIGHT, W, HEADER_HEIGHT, fill=1, stroke=0)
    canvas.setFillColor(TEAL)
    canvas.rect(0, H - HEADER_HEIGHT - 3, W, 3, fill=1, stroke=0)

    banner_mid = H - HEADER_HEIGHT / 2

    logo_size = 15 * mm
    logo_x = SIDE_MARGIN
    logo_y = H - HEADER_HEIGHT / 2 - logo_size / 2
    canvas.setFillColor(WHITE)
    canvas.roundRect(logo_x, logo_y, logo_size, logo_size, 3, fill=1, stroke=0)
    if RLImage and os.path.exists(ISF_LOGO):
        try:
            pad = 2
            canvas.drawImage(
                ISF_LOGO,
                logo_x + pad,
                logo_y + pad,
                width=logo_size - 2 * pad,
                height=logo_size - 2 * pad,
                preserveAspectRatio=True,
                mask="auto",
            )
        except Exception:
            pass

    text_x = logo_x + logo_size + 8
    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 13)
    canvas.drawString(text_x, banner_mid + 4, "IndusServiceFlow")
    canvas.setFont("Helvetica", 7)
    canvas.drawString(text_x, banner_mid - 8, "Flowing Services, Building Trust")

    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 16)
    canvas.drawCentredString(W / 2, banner_mid + 3, report_title)
    canvas.setFont("Helvetica", 8)
    canvas.drawCentredString(W / 2, banner_mid - 11, report_subtitle)

    org_name = (organization or {}).get("name") or "All Organizations"
    canvas.setFont("Helvetica-Bold", 10)
    canvas.drawRightString(W - SIDE_MARGIN, banner_mid + 4, org_name)
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(W - SIDE_MARGIN, banner_mid - 9, generated_at)

    canvas.restoreState()


def _draw_footer_full(canvas, organization, generated_at):
    """Full company footer block (logo, address, org line) -- drawn on the
    LAST page only. The bottom strip (Printed On / Page N of Total /
    Confidential) is handled separately by _draw_footer_strip so it can
    run on every page."""
    canvas.saveState()
    W, H = PAGE_SIZE

    line_y = FOOTER_HEIGHT - 6
    canvas.setStrokeColor(GRID_LINE)
    canvas.setLineWidth(0.6)
    canvas.line(SIDE_MARGIN, line_y, W - SIDE_MARGIN, line_y)

    logo_size = 6 * mm
    lx = SIDE_MARGIN
    ly = line_y - logo_size - 3
    if RLImage and os.path.exists(ORCHASP_LOGO):
        try:
            canvas.drawImage(
                ORCHASP_LOGO,
                lx,
                ly,
                width=logo_size,
                height=logo_size,
                preserveAspectRatio=True,
                mask="auto",
            )
        except Exception:
            pass

    tx = lx + logo_size + 5
    canvas.setFillColor(NAVY_DARK)
    canvas.setFont("Helvetica-Bold", 8.3)
    canvas.drawString(tx, line_y - 8, "IndusServiceFlow")
    canvas.setFillColor(colors.HexColor("#2563eb"))
    canvas.setFont("Helvetica-Bold", 7)
    canvas.drawString(tx, line_y - 17, "Powered by Orchasp Limited")

    canvas.setFillColor(GRAY_TEXT)
    canvas.setFont("Helvetica", 6.6)
    canvas.drawString(SIDE_MARGIN, line_y - 26, "CIN: L72200TG1994PLC017485")
    canvas.drawString(
        SIDE_MARGIN,
        line_y - 34,
        "19 & 20, Moti Valley, Trimulgherry, Secunderabad - 500 015, Telangana, INDIA",
    )
    canvas.drawString(
        SIDE_MARGIN,
        line_y - 42,
        "Email: info@orchasp.com | Tel: +91-40-4776 6123 / 124",
    )

    org_name = (organization or {}).get("name") or "All Organizations"
    canvas.setFillColor(NAVY_DARK)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawRightString(
        W - SIDE_MARGIN, line_y - 8, f"{org_name}  |  {generated_at}"
    )

    canvas.restoreState()


def _draw_footer_strip(canvas, printed_on, page_num, total_pages):
    """Slim bottom line -- Printed On / Page N of Total / Confidential --
    drawn on EVERY page, regardless of whether the full footer block is
    also drawn on that page."""
    canvas.saveState()
    W, H = PAGE_SIZE

    canvas.setFillColor(GRAY_TEXT)
    canvas.setFont("Helvetica", 6.6)
    canvas.drawString(SIDE_MARGIN, 8, f"Printed On: {printed_on}")
    canvas.drawCentredString(W / 2, 8, f"Page {page_num} of {total_pages}")
    canvas.drawRightString(W - SIDE_MARGIN, 8, "Confidential - For Internal Use Only")

    canvas.restoreState()


class _LastPageFooterCanvas(Canvas):
    """
    Buffers every page instead of writing it immediately, so that by the
    time we call save() we know the true total page count. This lets us:
      - draw the slim "Printed On / Page N of Total / Confidential" strip
        on EVERY page (it needs the total count to say "of Total"), and
      - draw the full branded footer block (logo, address, org line) on
        the actual LAST page only, wherever that lands.
    """

    def __init__(self, *args, footer_args=None, **kwargs):
        Canvas.__init__(self, *args, **kwargs)
        self._saved_pages = []
        self._footer_args = footer_args or {}

    def showPage(self):
        self._saved_pages.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total_pages = len(self._saved_pages)
        organization = self._footer_args.get("organization")
        generated_at = self._footer_args.get("generated_at")
        printed_on = self._footer_args.get("printed_on")

        for i, state in enumerate(self._saved_pages):
            self.__dict__.update(state)
            page_num = i + 1
            if page_num == total_pages:
                _draw_footer_full(self, organization, generated_at)
            _draw_footer_strip(self, printed_on, page_num, total_pages)
            Canvas.showPage(self)
        Canvas.save(self)


def generate_module_report_pdf(
    buffer,
    report_title,
    report_subtitle,
    organization,
    sections,
    kpi_title=None,
    kpi_cards=None,
):
    """
    Build a branded PDF into `buffer` (a file-like object, e.g. BytesIO or
    the Django HttpResponse itself).

    organization: dict with keys name/category/city/state/status, or None.
    sections: list of dicts:
        {
            "title": "Employee Directory",
            "headers": [...],
            "rows": [[...], ...],
            "col_widths": [...] (optional),
            "status_cols": {5, 6} (optional, 0-indexed columns to render as pills),
        }
    kpi_cards: optional list of {"label", "value", "sublabel"} shown as a
               card grid section before the data table(s).
    """
    now = datetime.now()
    generated_at = now.strftime("%d %b %Y, %I:%M %p")
    printed_on = now.strftime("%d-%m-%Y %H:%M:%S")

    content_width = PAGE_W - 2 * SIDE_MARGIN

    def on_first_page(canvas, doc):
        _draw_header(
            canvas, doc, report_title, report_subtitle, organization, generated_at
        )

    def on_later_pages(canvas, doc):

        pass

    doc = BaseDocTemplate(
        buffer,
        pagesize=PAGE_SIZE,
        leftMargin=SIDE_MARGIN,
        rightMargin=SIDE_MARGIN,
        topMargin=HEADER_HEIGHT + 8,
        bottomMargin=FOOTER_HEIGHT + 4,
        title=report_title,
    )

    first_frame = Frame(
        SIDE_MARGIN,
        FOOTER_HEIGHT + 4,
        content_width,
        PAGE_H - HEADER_HEIGHT - FOOTER_HEIGHT - 12,
        id="content_first",
    )
    later_frame = Frame(
        SIDE_MARGIN,
        FOOTER_HEIGHT + 4,
        content_width,
        PAGE_H - CONT_TOP_MARGIN - FOOTER_HEIGHT - 4,
        id="content_later",
    )

    doc.addPageTemplates(
        [
            PageTemplate(id="first", frames=[first_frame], onPage=on_first_page),
            PageTemplate(id="later", frames=[later_frame], onPage=on_later_pages),
        ]
    )

    story = [NextPageTemplate("later")]

    org = organization or {}
    story.append(
        Paragraph(org.get("name") or "All Organizations", _STYLES["page_title"])
    )
    status_text, status_color = _fmt_status(org.get("status"))
    meta_html = (
        f'<font color="#6b7280">Category:</font> <b>{org.get("category") or "-"}</b>'
        f'&nbsp;&nbsp;&nbsp; <font color="#6b7280">City:</font> <b>{org.get("city") or "-"}</b>'
        f'&nbsp;&nbsp;&nbsp; <font color="#6b7280">State:</font> <b>{org.get("state") or "-"}</b>'
        f'&nbsp;&nbsp;&nbsp; <font color="#6b7280">Status:</font> '
        f'<font color="{status_color}"><b>{status_text}</b></font>'
        f'&nbsp;&nbsp;&nbsp; <font color="#6b7280">Generated:</font> <b>{generated_at}</b>'
    )
    story.append(Paragraph(meta_html, _STYLES["meta"]))
    story.append(Spacer(1, 6 * mm))

    section_no = 1

    if kpi_cards:
        story.append(section_heading(section_no, kpi_title or "Summary", content_width))
        story.append(kpi_card_grid(kpi_cards, content_width))
        story.append(Spacer(1, SECTION_SPACER))
        section_no += 1

    for section in sections:
        story.append(section_heading(section_no, section["title"], content_width))
        story.append(
            data_table(
                section["headers"],
                section["rows"],
                col_widths=section.get("col_widths"),
                status_cols=section.get("status_cols"),
                total_width=content_width,
            )
        )
        story.append(Spacer(1, SECTION_SPACER))
        section_no += 1

    def _canvasmaker(*args, **kwargs):
        return _LastPageFooterCanvas(
            *args,
            footer_args={
                "organization": organization,
                "generated_at": generated_at,
                "printed_on": printed_on,
            },
            **kwargs,
        )

    doc.build(story, canvasmaker=_canvasmaker)
    return buffer


def organization_context(org_id):
    """
    Resolve the small dict of organization fields the header/footer/meta
    line need, given an org id (or None for platform-wide exports).
    """
    if not org_id:
        return None
    from organizations.models import Organization

    org = Organization.objects.filter(pk=org_id).select_related("category").first()
    if not org:
        return None
    return {
        "name": org.organization_name,
        "category": org.category.category_name if org.category else None,
        "city": org.city,
        "state": org.state,
        "status": org.status,
    }
