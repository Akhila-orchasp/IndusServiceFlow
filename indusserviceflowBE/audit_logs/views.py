from django.core.paginator import Paginator
from django.db.models import Q, Count
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from .utils import log_action
from rest_framework.response import Response
from rest_framework import status

from .models import AuditLog
import csv

from django.http import HttpResponse
from django.utils import timezone

from openpyxl import Workbook
from openpyxl.styles import Font, Alignment

import os
import html
from datetime import datetime
from urllib.request import pathname2url
from django.conf import settings as django_settings

_BADGE_CLASS_MAP = {
    "active": "badge-active",
    "approved": "badge-active",
    "completed": "badge-completed",
    "confirmed": "badge-active",
    "create": "badge-active",
    "assign": "badge-completed",
    "update": "badge-completed",
    "status change": "badge-pending",
    "export": "badge-pending",
    "pending": "badge-pending",
    "pending payment": "badge-pending",
    "pending activation": "badge-pending",
    "expiring soon": "badge-pending",
    "waiting": "badge-pending",
    "in progress": "badge-pending",
    "inactive": "badge-inactive",
    "login": "badge-inactive",
    "logout": "badge-inactive",
    "view": "badge-inactive",
    "cancelled": "badge-cancelled",
    "locked": "badge-rejected",
    "rejected": "badge-rejected",
    "reject": "badge-rejected",
    "delete": "badge-rejected",
    "expired": "badge-expired",
    "no show": "badge-rejected",
    "left queue": "badge-rejected",
}


def _status_badge_class(value):
    key = (str(value) if value is not None else "").strip().lower()
    return _BADGE_CLASS_MAP.get(key, "badge-inactive")


def _kpi_cards_html(cards):
    """cards: list of dicts {label, value, sub, css}. Renders in rows of 4."""
    if not cards:
        return ""
    rows_html = ""
    for i in range(0, len(cards), 4):
        chunk = cards[i : i + 4]
        cells = "".join(f"""<div class="metric-card {c["css"]}">
                  <div class="card-label">{html.escape(str(c["label"]))}</div>
                  <div class="card-value">{html.escape(str(c["value"]))}</div>
                  <div class="card-sub">{html.escape(str(c.get("sub", "")))}</div>
                </div>""" for c in chunk)
        rows_html += f'<div class="cards-grid cards-grid-4 mt-2">{cells}</div>'
    return rows_html


def _data_table_rows_html(headers, rows, status_col_index=None):
    header_cells = "".join(f"<th>{html.escape(str(h))}</th>" for h in headers)

    body_rows = ""
    for row in rows:
        cells = ""
        for idx, val in enumerate(row):
            text = "" if val is None else str(val)
            if status_col_index is not None and idx == status_col_index:
                css_class = _status_badge_class(text)
                cells += f'<td><span class="badge {css_class}">{html.escape(text)}</span></td>'
            else:
                cells += f"<td>{html.escape(text)}</td>"
        body_rows += f"<tr>{cells}</tr>"

    if not rows:
        body_rows = (
            f'<tr><td colspan="{len(headers)}" '
            'style="text-align:center;color:#94A3B8;padding:10mm 0;">'
            "No records found</td></tr>"
        )

    return header_cells, body_rows


def _build_list_report_pdf(
    report_title,
    report_subtitle,
    summary_cards,
    table_section_title,
    headers,
    rows,
    status_col_index,
    total_count,
    generated_by_username,
    filename,
    highlight=None,
):
    """
    Builds a PDF export styled like the IndusServiceFlow Organization Report
    (navy header banner, teal accent, numbered sections, KPI summary cards,
    striped status-badge table, Orchasp footer) using WeasyPrint -- no
    separate template file needed.

    summary_cards: list of dicts {"label", "value", "sub", "css"} where css
        is one of card-blue / card-teal / card-orange / card-red /
        card-grey / card-green / card-yellow.
    status_col_index: index (0-based) into `headers`/`rows` to render as a
        colored status badge, or None to render every column as plain text.
    highlight: optional dict {"label", "value"} shown as a teal callout box
        above the table (e.g. a total-revenue figure).
    """

    static_dir = os.path.join(django_settings.BASE_DIR, "statics")
    isf_logo = "file:///" + pathname2url(
        os.path.join(static_dir, "indusserviseflow logo.png")
    ).lstrip("/")
    orchasp_logo = "file:///" + pathname2url(
        os.path.join(static_dir, "orchasp logo.png")
    ).lstrip("/")

    generated_at = datetime.now().strftime("%d %b %Y, %I:%M %p")
    printed_on = datetime.now().strftime("%d-%m-%Y %H:%M:%S")

    header_cells, body_rows = _data_table_rows_html(headers, rows, status_col_index)
    cards_html = _kpi_cards_html(summary_cards)

    highlight_html = ""
    if highlight:
        highlight_html = f"""
        <div class="recommendation-box mb-4">
          <div class="rec-label">{html.escape(str(highlight["label"]))}</div>
          <div class="rec-text" style="font-size:14pt;">{html.escape(str(highlight["value"]))}</div>
        </div>
        """

    html_string = f"""
    <!DOCTYPE html>
    <html>
    <head>
    <meta charset="UTF-8"/>
    <style>
      * {{ box-sizing: border-box; margin: 0; padding: 0; }}
      :root {{
        --navy:#1B2A6B; --blue:#1565C0; --light-blue:#E8F0FE; --teal:#0d9488;
        --light-teal:#E6F7F5; --orange:#f97316; --light-orange:#FFF3E0;
        --red-light:#FCE4EC; --grey-bg:#F5F7FA; --grey-line:#CBD5E1;
        --white:#FFFFFF; --dark-text:#0F172A; --mid-text:#475569;
        --light-text:#94A3B8; --green:#16a34a; --green-light:#DCFCE7;
        --yellow-light:#FFFBEB;
      }}
      html {{ font-size: 10pt; }}
      body {{ font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:var(--dark-text); }}
      .page-content {{ padding: 8mm 18mm 0 18mm; }}
      .report-header {{
        background: var(--navy); padding: 5mm 18mm; display: flex;
        align-items: center; justify-content: space-between;
        border-bottom: 2.5px solid var(--teal);
      }}
      .header-logo-block {{ display: flex; align-items: center; gap: 10px; }}
      .header-logo {{ height: 14mm; width: auto; object-fit: contain; }}
      .header-brand {{ color: #fff; }}
      .header-brand .brand-name {{ font-size: 13pt; font-weight: 700; }}
      .header-brand .brand-tagline {{ font-size: 7.5pt; color: rgba(255,255,255,0.72); margin-top: 1px; }}
      .header-center {{ text-align: center; color: #fff; }}
      .header-center .report-type {{ font-size: 13pt; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }}
      .header-center .report-subtitle {{ font-size: 7.5pt; color: rgba(255,255,255,0.72); margin-top: 2px; }}
      .header-meta {{ text-align: right; color: rgba(255,255,255,0.85); font-size: 7.5pt; line-height: 1.7; }}
      .header-meta strong {{ display: block; font-size: 8.5pt; color: #fff; }}
      .report-title-block {{ padding: 6mm 0 4mm 0; border-bottom: 1px solid var(--grey-line); margin-bottom: 6mm; }}
      .report-title-block h1 {{ font-size: 16pt; font-weight: 700; color: var(--navy); margin-bottom: 2px; }}
      .report-meta-row {{ display: flex; gap: 20px; flex-wrap: wrap; font-size: 8pt; color: var(--mid-text); margin-top: 4px; }}
      .report-meta-row strong {{ color: var(--dark-text); }}
      .section {{ margin-bottom: 7mm; }}
      .section-title {{
        font-size: 10.5pt; font-weight: 700; color: var(--navy);
        padding: 3mm 0 2mm 0; border-bottom: 2px solid var(--teal);
        margin-bottom: 4mm; display: flex; align-items: center; gap: 6px;
      }}
      .section-title .section-num {{
        background: var(--navy); color: #fff; font-size: 8pt; font-weight: 700;
        width: 18px; height: 18px; border-radius: 50%; display: inline-flex;
        align-items: center; justify-content: center; flex-shrink: 0;
      }}
      .cards-grid {{ display: grid; gap: 4mm; margin-bottom: 2mm; }}
      .cards-grid-4 {{ grid-template-columns: repeat(4, 1fr); }}
      .cards-grid-2 {{ grid-template-columns: repeat(2, 1fr); }}
      .metric-card {{ border-radius: 6px; padding: 4mm 5mm; display: flex; flex-direction: column; gap: 3px; }}
      .metric-card .card-label {{ font-size: 7.5pt; font-weight: 600; color: var(--mid-text); text-transform: uppercase; letter-spacing: 0.4px; }}
      .metric-card .card-value {{ font-size: 16pt; font-weight: 700; color: var(--navy); line-height: 1.1; }}
      .metric-card .card-sub {{ font-size: 7pt; color: var(--mid-text); margin-top: 1px; }}
      .card-blue   {{ background: var(--light-blue); }}
      .card-teal   {{ background: var(--light-teal); }}
      .card-orange {{ background: var(--light-orange); }}
      .card-red    {{ background: var(--red-light); }}
      .card-grey   {{ background: var(--grey-bg); }}
      .card-green  {{ background: var(--green-light); }}
      .card-yellow {{ background: var(--yellow-light); }}
      .data-table {{ width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-bottom: 2mm; }}
      .data-table thead tr {{ background: var(--navy); color: #fff; }}
      .data-table thead th {{ padding: 3mm 4mm; text-align: left; font-weight: 700; font-size: 8pt; letter-spacing: 0.3px; border-bottom: 2px solid var(--teal); }}
      .data-table tbody tr:nth-child(even) {{ background: var(--grey-bg); }}
      .data-table tbody tr:nth-child(odd) {{ background: #fff; }}
      .data-table tbody td {{ padding: 2.5mm 4mm; border-bottom: 0.5px solid var(--grey-line); color: var(--dark-text); vertical-align: middle; }}
      .badge {{
        display: inline-block; padding: 1px 7px; border-radius: 20px;
        font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px;
      }}
      .badge-active    {{ background: var(--green-light);  color: var(--green); }}
      .badge-pending   {{ background: var(--yellow-light); color: #92400e; }}
      .badge-inactive  {{ background: var(--grey-bg);      color: var(--mid-text); }}
      .badge-rejected  {{ background: var(--red-light);    color: #9f1239; }}
      .badge-completed {{ background: var(--light-teal);   color: var(--teal); }}
      .badge-expired   {{ background: var(--red-light);    color: #9f1239; }}
      .badge-cancelled {{ background: var(--grey-bg);      color: var(--mid-text); }}
      .recommendation-box {{
        border-left: 4px solid var(--teal); background: var(--light-teal);
        border-radius: 0 6px 6px 0; padding: 3.5mm 5mm; margin-bottom: 4mm;
      }}
      .recommendation-box .rec-label {{ font-size: 7.5pt; font-weight: 700; color: var(--teal); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }}
      .recommendation-box .rec-text {{ font-size: 9.5pt; font-weight: 600; color: var(--dark-text); }}
      .report-footer {{ position: running(reportFooter); background: var(--white); border-top: 1px solid var(--grey-line); padding: 3mm 18mm 2mm 18mm; }}
      .footer-main {{ display: flex; align-items: flex-start; justify-content: space-between; gap: 10mm; padding-bottom: 2mm; border-bottom: 0.5px solid var(--grey-line); }}
      .footer-logo-block {{ display: flex; align-items: center; gap: 6px; }}
      .footer-logo {{ height: 10mm; width: auto; object-fit: contain; }}
      .footer-company {{ font-size: 7.5pt; line-height: 1.6; }}
      .footer-company .company-name {{ font-weight: 700; color: var(--dark-text); font-size: 8.5pt; }}
      .footer-company .powered-by {{ color: #1565C0; font-weight: 700; font-size: 7.5pt; }}
      .footer-company .company-detail {{ color: var(--mid-text); font-size: 7pt; }}
      .footer-bottom {{ display: flex; justify-content: space-between; padding-top: 1.5mm; font-size: 7pt; color: var(--mid-text); }}
      .mt-2 {{ margin-top: 2mm; }}
      .mb-4 {{ margin-bottom: 4mm; }}
      @page {{
        size: A4 portrait; margin: 0 0 34mm 0;
        @bottom-center {{
          content: element(reportFooter);
          width: 100%;
          height: 34mm;
          margin: 0;
          padding: 0;
        }}
      }}
      tr {{ page-break-inside: avoid; }}
    </style>
    </head>
    <body>
      <header class="report-header">
        <div class="header-logo-block">
          <img src="{isf_logo}" class="header-logo" onerror="this.style.display='none'"/>
          <div class="header-brand">
            <div class="brand-name">IndusServiceFlow</div>
            <div class="brand-tagline">Flowing Services, Building Trust</div>
          </div>
        </div>
        <div class="header-center">
          <div class="report-type">REPORT</div>
          <div class="report-subtitle">{html.escape(report_subtitle)}</div>
        </div>
        <div class="header-meta">
          <strong>IndusServiceFlow</strong>
          {generated_at}
        </div>
      </header>
      <main class="page-content">
        <div class="report-title-block">
          <h1>{html.escape(report_title)}</h1>
          <div class="report-meta-row">
            <span>Total Records: <strong>{total_count}</strong></span>
            <span>Generated By: <strong>{html.escape(str(generated_by_username))}</strong></span>
            <span>Generated: <strong>{generated_at}</strong></span>
          </div>
        </div>

        <div class="section">
          <div class="section-title"><span class="section-num">1</span> Summary</div>
          {cards_html}
        </div>

        <div class="section">
          <div class="section-title"><span class="section-num">2</span> {html.escape(table_section_title)}</div>
          {highlight_html}
          <table class="data-table">
            <thead><tr>{header_cells}</tr></thead>
            <tbody>{body_rows}</tbody>
          </table>
        </div>
      </main>
      <footer class="report-footer">
        <div class="footer-main">
          <div class="footer-logo-block">
            <img src="{orchasp_logo}" class="footer-logo" onerror="this.style.display='none'"/>
            <div class="footer-company">
              <div class="company-name">IndusServiceFlow</div>
              <div class="powered-by">Powered by Orchasp Limited</div>
              <div class="company-detail">CIN: L72200TG1994PLC017485</div>
              <div class="company-detail">19 &amp; 20, Moti Valley, Trimulgherry, Secunderabad – 500 015, Telangana, INDIA</div>
              <div class="company-detail">Email: info@orchasp.com &nbsp;|&nbsp; Tel: +91-40-4776 6123 / 124</div>
            </div>
          </div>
        </div>
        <div class="footer-bottom">
          <span>Printed On: {printed_on}</span>
          <span>Confidential – For Internal Use Only</span>
        </div>
      </footer>
    </body>
    </html>
    """

    try:
        from weasyprint import HTML

        pdf_bytes = HTML(string=html_string).write_pdf()
    except ImportError:
        return Response(
            {
                "success": False,
                "message": "PDF export is unavailable because WeasyPrint is not installed.",
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except Exception as exc:
        import traceback

        traceback.print_exc()
        return Response(
            {
                "success": False,
                "message": "PDF generation failed.",
                "error_type": type(exc).__name__,
                "error_detail": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


def _scoped_queryset(request):
    """Enforces who is allowed to see what:
    - Super Admin: their own full action history + Org Admins' Login/Logout only
    - Organization Admin: their own org's Organization Admin (and, once the
      Employee role exists, Employee) history — all actions, own org only
    - anyone else: nothing
    """
    role = request.user.role

    if role == "SUPER_ADMIN":
        return AuditLog.objects.filter(
            Q(role="Super Admin")
            | Q(role="Organization Admin", action_name__in=["Login", "Logout"])
        )

    if role == "ORG_ADMIN":
        return AuditLog.objects.filter(
            organization=request.user.organization,
            role__in=["Organization Admin", "Employee"],
        )

    return AuditLog.objects.none()


def _apply_filters(logs, request):
    search = request.GET.get("search", "")
    action = request.GET.get("action_name", "")
    module = request.GET.get("action_screen", "")

    if search:
        logs = logs.filter(
            Q(username__icontains=search)
            | Q(role__icontains=search)
            | Q(action_name__icontains=search)
            | Q(action_screen__icontains=search)
        )

    if module:
        logs = logs.filter(action_screen__iexact=module)

    if action:
        logs = logs.filter(action_name__iexact=action)

    return logs


def _user_history_queryset(request, username):
    """All-time audit trail for one specific user, filtered on top of the
    same role-based scope _scoped_queryset already enforces for the main
    listing -- so a Super Admin can only pull Super Admin / Login-Logout
    rows and an Org Admin can only pull their own org's rows, the same as
    everywhere else on this page. Guessing a username outside that scope
    just returns an empty queryset, not another org's/role's history.
    """
    return _scoped_queryset(request).filter(username__iexact=username)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_audit_logs(request):

    logs = _scoped_queryset(request).select_related("organization").order_by(
        "-audit_date"
    )
    logs = _apply_filters(logs, request)

    page = int(request.GET.get("page", 1))
    page_size = int(request.GET.get("page_size", 10))

    # One combined query instead of 4 separate .count() calls.
    counts = logs.aggregate(
        approves=Count("id", filter=Q(action_name__iexact="Approve")),
        updates=Count("id", filter=Q(action_name__iexact="Update")),
        deletes=Count("id", filter=Q(action_name__iexact="Delete")),
    )
    approve_logs = counts["approves"]
    update_logs = counts["updates"]
    delete_logs = counts["deletes"]

    paginator = Paginator(logs, page_size)
    page_obj = paginator.get_page(page)
    # paginator.count already runs (and caches) the total count of `logs`,
    # so re-running logs.count() separately would just be a duplicate query.
    total_logs = paginator.count

    data = []
    for log in page_obj:
        data.append(
            {
                "audit_id": log.id,
                "audit_date": log.audit_date,
                "username": log.username,
                "role": log.role,
                "organization": (
                    log.organization.organization_name if log.organization else None
                ),
                "action_name": log.action_name,
                "action_screen": log.action_screen,
                "target_info": log.target_info,
            }
        )

    return Response(
        {
            "success": True,
            "message": "Audit logs retrieved successfully.",
            "summary": {
                "total_logs": total_logs,
                "approves": approve_logs,
                "updates": update_logs,
                "deletes": delete_logs,
            },
            "pagination": {
                "current_page": page,
                "total_pages": paginator.num_pages,
                "total_records": paginator.count,
                "page_size": page_size,
            },
            "data": data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user_audit_history(request, username):
    """Full audit trail for one specific user -- every row this viewer is
    allowed to see for that username, oldest to newest activity, no
    pagination. Backs the "view history" action on the Audit Logs table
    (same pattern as the Customers page's per-customer history modal).
    """

    logs = _user_history_queryset(request, username).order_by("-audit_date")

    if not logs.exists():
        return Response(
            {"success": False, "message": "No audit history found for this user."},
            status=status.HTTP_404_NOT_FOUND,
        )

    total_actions = logs.count()
    create_count = logs.filter(action_name__iexact="Create").count()
    update_count = logs.filter(action_name__iexact="Update").count()
    delete_count = logs.filter(action_name__iexact="Delete").count()
    login_count = logs.filter(action_name__iexact="Login").count()

    first_activity = logs.order_by("audit_date").first()
    last_activity = logs.order_by("-audit_date").first()

    data = []
    for log in logs:
        data.append(
            {
                "audit_id": log.id,
                "audit_date": log.audit_date,
                "username": log.username,
                "role": log.role,
                "organization": (
                    log.organization.organization_name if log.organization else None
                ),
                "action_name": log.action_name,
                "action_screen": log.action_screen,
                "target_info": log.target_info,
            }
        )

    return Response(
        {
            "success": True,
            "message": "User audit history retrieved successfully.",
            "username": username,
            "stats": {
                "total_actions": total_actions,
                "creates": create_count,
                "updates": update_count,
                "deletes": delete_count,
                "logins": login_count,
                "first_activity": first_activity.audit_date if first_activity else None,
                "last_activity": last_activity.audit_date if last_activity else None,
            },
            "data": data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def export_audit_logs(request):

    export_format = request.GET.get("export_format", "").lower()

    logs = _scoped_queryset(request).order_by("-id")
    logs = _apply_filters(logs, request)

    report_title = "AUDIT LOGS REPORT"
    date_str = timezone.now().strftime("%Y-%m-%d")
    generated_by = f"Generated By: {request.user.username}"

    headers = [
        "Audit Date",
        "Username",
        "Role",
        "Organization",
        "Action",
        "Module",
        "Details",
    ]

    if export_format == "csv":

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = (
            f'attachment; filename="audit_logs_{date_str}.csv"'
        )

        writer = csv.writer(response)

        writer.writerow([report_title])
        writer.writerow([generated_by])
        writer.writerow([])

        writer.writerow(headers)

        for log in logs:
            writer.writerow(
                [
                    log.audit_date,
                    log.username,
                    log.role,
                    log.organization.organization_name if log.organization else "",
                    log.action_name,
                    log.action_screen,
                    log.target_info or "",
                ]
            )

        log_action(request.user, "Export", "Audit Logs")
        return response

    elif export_format == "excel":

        workbook = Workbook()
        sheet = workbook.active
        sheet.title = "Audit Logs"

        last_col = len(headers)

        sheet.merge_cells(start_row=1, start_column=1, end_row=1, end_column=last_col)
        title_cell = sheet.cell(row=1, column=1)
        title_cell.value = report_title
        title_cell.font = Font(bold=True, size=14)
        title_cell.alignment = Alignment(horizontal="center")

        sheet.merge_cells(start_row=2, start_column=1, end_row=2, end_column=last_col)
        sub_cell = sheet.cell(row=2, column=1)
        sub_cell.value = generated_by
        sub_cell.font = Font(italic=True, size=10)
        sub_cell.alignment = Alignment(horizontal="center")

        header_row = 4
        for col_num, header in enumerate(headers, 1):
            cell = sheet.cell(row=header_row, column=col_num)
            cell.value = header
            cell.font = Font(bold=True)

        row = header_row + 1
        for log in logs:
            sheet.cell(row=row, column=1).value = str(log.audit_date)
            sheet.cell(row=row, column=2).value = log.username
            sheet.cell(row=row, column=3).value = log.role
            sheet.cell(row=row, column=4).value = (
                log.organization.organization_name if log.organization else ""
            )
            sheet.cell(row=row, column=5).value = log.action_name
            sheet.cell(row=row, column=6).value = log.action_screen
            sheet.cell(row=row, column=7).value = log.target_info or ""
            row += 1

        response = HttpResponse(
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response["Content-Disposition"] = (
            f'attachment; filename="audit_logs_{date_str}.xlsx"'
        )
        workbook.save(response)
        log_action(request.user, "Export", "Audit Logs")
        return response

    elif export_format == "pdf":

        logs_list = list(logs)

        total_logs = len(logs_list)
        create_count = sum(1 for l in logs_list if l.action_name == "Create")
        update_count = sum(1 for l in logs_list if l.action_name == "Update")
        delete_count = sum(1 for l in logs_list if l.action_name == "Delete")
        export_count = sum(1 for l in logs_list if l.action_name == "Export")
        other_count = (
            total_logs - create_count - update_count - delete_count - export_count
        )

        summary_cards = [
            {
                "label": "Total Logs",
                "value": total_logs,
                "sub": "All recorded activity",
                "css": "card-blue",
            },
            {
                "label": "Create",
                "value": create_count,
                "sub": "Create actions",
                "css": "card-green",
            },
            {
                "label": "Update",
                "value": update_count,
                "sub": "Update actions",
                "css": "card-teal",
            },
            {
                "label": "Delete",
                "value": delete_count,
                "sub": "Delete actions",
                "css": "card-red",
            },
            {
                "label": "Export",
                "value": export_count,
                "sub": "Export actions",
                "css": "card-orange",
            },
            {
                "label": "Other",
                "value": other_count,
                "sub": "Login, approve, assign, etc.",
                "css": "card-grey",
            },
        ]

        pdf_headers = [
            "Audit Date",
            "Username",
            "Role",
            "Organization",
            "Action",
            "Module",
        ]

        rows = [
            [
                log.audit_date,
                log.username,
                log.role,
                log.organization.organization_name if log.organization else "",
                log.action_name,
                log.action_screen,
            ]
            for log in logs_list
        ]

        response = _build_list_report_pdf(
            report_title=report_title,
            report_subtitle="Operational Analytics & Performance Insights",
            summary_cards=summary_cards,
            table_section_title="Audit Trail",
            headers=pdf_headers,
            rows=rows,
            status_col_index=4,
            total_count=total_logs,
            generated_by_username=request.user.username,
            filename=f"audit_logs_{date_str}.pdf",
        )

        log_action(request.user, "Export", "Audit Logs")
        return response

    else:
        return Response(
            {
                "success": False,
                "message": "Invalid export format. Use csv, excel or pdf.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def export_user_audit_history(request, username):
    """Same csv/excel/pdf builders as export_audit_logs, but scoped to one
    user's full history instead of the filtered page-wide listing -- backs
    the export button inside the per-user history modal.
    """

    export_format = request.GET.get("export_format", "").lower()

    logs = _user_history_queryset(request, username).order_by("-id")

    if not logs.exists():
        return Response(
            {"success": False, "message": "No audit history found for this user."},
            status=status.HTTP_404_NOT_FOUND,
        )

    report_title = "USER AUDIT HISTORY REPORT"
    date_str = timezone.now().strftime("%Y-%m-%d")
    generated_by = f"Generated By: {request.user.username}"
    safe_username = (
        "".join(c for c in username if c.isalnum() or c in ("_", "-")) or "user"
    )

    headers = [
        "Audit Date",
        "Username",
        "Role",
        "Organization",
        "Action",
        "Module",
        "Details",
    ]

    if export_format == "csv":

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = (
            f'attachment; filename="{safe_username}_audit_history_{date_str}.csv"'
        )

        writer = csv.writer(response)

        writer.writerow([report_title])
        writer.writerow([f"User: {username}"])
        writer.writerow([generated_by])
        writer.writerow([])

        writer.writerow(headers)

        for log in logs:
            writer.writerow(
                [
                    log.audit_date,
                    log.username,
                    log.role,
                    log.organization.organization_name if log.organization else "",
                    log.action_name,
                    log.action_screen,
                    log.target_info or "",
                ]
            )

        log_action(request.user, "Export", "Audit Logs")
        return response

    elif export_format == "excel":

        workbook = Workbook()
        sheet = workbook.active
        sheet.title = "User Audit History"

        last_col = len(headers)

        sheet.merge_cells(start_row=1, start_column=1, end_row=1, end_column=last_col)
        title_cell = sheet.cell(row=1, column=1)
        title_cell.value = report_title
        title_cell.font = Font(bold=True, size=14)
        title_cell.alignment = Alignment(horizontal="center")

        sheet.merge_cells(start_row=2, start_column=1, end_row=2, end_column=last_col)
        user_cell = sheet.cell(row=2, column=1)
        user_cell.value = f"User: {username}"
        user_cell.font = Font(italic=True, size=10)
        user_cell.alignment = Alignment(horizontal="center")

        sheet.merge_cells(start_row=3, start_column=1, end_row=3, end_column=last_col)
        sub_cell = sheet.cell(row=3, column=1)
        sub_cell.value = generated_by
        sub_cell.font = Font(italic=True, size=10)
        sub_cell.alignment = Alignment(horizontal="center")

        header_row = 5
        for col_num, header in enumerate(headers, 1):
            cell = sheet.cell(row=header_row, column=col_num)
            cell.value = header
            cell.font = Font(bold=True)

        row = header_row + 1
        for log in logs:
            sheet.cell(row=row, column=1).value = str(log.audit_date)
            sheet.cell(row=row, column=2).value = log.username
            sheet.cell(row=row, column=3).value = log.role
            sheet.cell(row=row, column=4).value = (
                log.organization.organization_name if log.organization else ""
            )
            sheet.cell(row=row, column=5).value = log.action_name
            sheet.cell(row=row, column=6).value = log.action_screen
            sheet.cell(row=row, column=7).value = log.target_info or ""
            row += 1

        response = HttpResponse(
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response["Content-Disposition"] = (
            f'attachment; filename="{safe_username}_audit_history_{date_str}.xlsx"'
        )
        workbook.save(response)
        log_action(request.user, "Export", "Audit Logs")
        return response

    elif export_format == "pdf":

        logs_list = list(logs)

        total_logs = len(logs_list)
        create_count = sum(1 for l in logs_list if l.action_name == "Create")
        update_count = sum(1 for l in logs_list if l.action_name == "Update")
        delete_count = sum(1 for l in logs_list if l.action_name == "Delete")
        login_count = sum(1 for l in logs_list if l.action_name == "Login")
        other_count = (
            total_logs - create_count - update_count - delete_count - login_count
        )

        summary_cards = [
            {
                "label": "Total Actions",
                "value": total_logs,
                "sub": "All recorded activity",
                "css": "card-blue",
            },
            {
                "label": "Create",
                "value": create_count,
                "sub": "Create actions",
                "css": "card-green",
            },
            {
                "label": "Update",
                "value": update_count,
                "sub": "Update actions",
                "css": "card-teal",
            },
            {
                "label": "Delete",
                "value": delete_count,
                "sub": "Delete actions",
                "css": "card-red",
            },
            {
                "label": "Login",
                "value": login_count,
                "sub": "Login events",
                "css": "card-orange",
            },
            {
                "label": "Other",
                "value": other_count,
                "sub": "Logout, approve, assign, etc.",
                "css": "card-grey",
            },
        ]

        pdf_headers = [
            "Audit Date",
            "Username",
            "Role",
            "Organization",
            "Action",
            "Module",
        ]

        rows = [
            [
                log.audit_date,
                log.username,
                log.role,
                log.organization.organization_name if log.organization else "",
                log.action_name,
                log.action_screen,
            ]
            for log in logs_list
        ]

        response = _build_list_report_pdf(
            report_title=report_title,
            report_subtitle=f"Complete Activity History \u2014 {username}",
            summary_cards=summary_cards,
            table_section_title="Audit Trail",
            headers=pdf_headers,
            rows=rows,
            status_col_index=4,
            total_count=total_logs,
            generated_by_username=request.user.username,
            filename=f"{safe_username}_audit_history_{date_str}.pdf",
        )

        log_action(request.user, "Export", "Audit Logs")
        return response

    else:
        return Response(
            {
                "success": False,
                "message": "Invalid export format. Use csv, excel or pdf.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )