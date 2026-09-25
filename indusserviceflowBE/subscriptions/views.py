from django.shortcuts import get_object_or_404
from django.core.mail import send_mail
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from users.models import User
from audit_logs.utils import log_action
from notifications.services import notify_org_admins
from .models import Subscription
from .serializers import SubscriptionSerializer, get_display_status

from django.core.paginator import Paginator
import csv
from django.http import HttpResponse
from django.db.models import Q, Sum, Count, OuterRef, Subquery
from django.utils import timezone
from datetime import timedelta
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


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_subscription(request):

    if request.user.role != "SUPER_ADMIN":
        return Response(
            {"success": False, "message": "Only Super Admin can add subscriptions."},
            status=status.HTTP_403_FORBIDDEN,
        )

    serializer = SubscriptionSerializer(data=request.data)

    if serializer.is_valid():

        serializer.save(created_by=request.user.username)

        subscription = serializer.instance

        notify_org_admins(
            organization=subscription.organization,
            title="Subscription Activated",
            message=f"A subscription has been activated for {subscription.organization.organization_name}. Plan: {subscription.plan.plan_name}, status: {subscription.status}.",
            notification_type="Organization Status Update",
            actor=request.user,
        )

        subject = "Subscription Activated"

        message = f"""
Hello,

Your subscription has been created successfully.

Organization : {subscription.organization.organization_name}
Plan         : {subscription.plan.plan_name}
Billing Cycle: {subscription.billing_cycle}
Start Date   : {subscription.start_date}
Status       : {subscription.status}

Thank you,
IndusServiceFlow Team
"""

        org_admin = User.objects.filter(
            organization=subscription.organization, role="ORG_ADMIN"
        ).first()

        if org_admin:

            print("=" * 50)
            print("Recipient :", org_admin.email)
            print("From      :", settings.DEFAULT_FROM_EMAIL)
            print("=" * 50)

            try:

                result = send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [org_admin.email],
                    fail_silently=False,
                )

                print("Mail Sent Successfully")
                print("send_mail() returned :", result)

            except Exception as e:
                print("Email Error :", str(e))

        else:
            print("Organization Admin not found.")

        log_action(request.user, "Create", "Subscriptions")

        return Response(
            {
                "success": True,
                "message": "Subscription created successfully.",
                "data": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )

    return Response(
        {"success": False, "errors": serializer.errors},
        status=status.HTTP_400_BAD_REQUEST,
    )


def _latest_subscription_per_org(base_queryset=None):
    """An organization that upgrades/downgrades (e.g. Free Trial -> Growth)
    gets a *new* Subscription row while its old one is kept around
    (Expired/Cancelled) for history — it is still only ONE plan from the
    org's point of view. Anywhere we list "subscriptions" (the table, CSV/
    PDF/Excel export) should show that single current row per organization,
    not every historical row. The full history remains available via the
    org-scoped lookup used by the "view details" panel.
    """
    queryset = (
        base_queryset
        if base_queryset is not None
        else Subscription.objects.select_related("organization", "plan")
    )

    latest_id_per_org = (
        Subscription.objects.filter(organization=OuterRef("organization"))
        .order_by("-created_on", "-id")
        .values("id")[:1]
    )

    return queryset.filter(id=Subquery(latest_id_per_org))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_subscriptions(request):

    # The "view details" panel re-uses this endpoint (filtered by org name)
    # to show an organization's full plan history — e.g. its old Free Trial
    # row alongside the Growth plan it upgraded to. That lookup passes
    # include_history=true to see every row; everyone else (the main table,
    # exports, KPI cards) only wants the org's single current plan.
    include_history = request.GET.get("include_history", "").lower() in (
        "1",
        "true",
        "yes",
    )

    # Rejected organizations are shown too — their subscription is now
    # cancelled by reject_organization() on rejection, and get_display_status()
    # forces the display to "Cancelled" defensively for any legacy row that
    # predates that fix. Pending organizations (still awaiting Super Admin
    # approval) show up here as well, displayed as "Pending".
    base_subscriptions = Subscription.objects.select_related("organization", "plan")

    subscriptions = base_subscriptions if include_history else _latest_subscription_per_org(base_subscriptions)

    SORT_FIELD_MAP = {
        "organization_name": "organization__organization_name",
        "employees": "employees",
        "monthly_revenue": "monthly_revenue",
        "next_payment": "next_payment_date",
        "customer_since": "created_on",
    }

    sort_by = request.GET.get("sort_by")
    sort_dir = request.GET.get("sort_dir", "asc")

    order_field = SORT_FIELD_MAP.get(sort_by, "id")

    if sort_dir == "desc":
        order_field = f"-{order_field}"

    subscriptions = subscriptions.order_by(order_field)

    search = request.GET.get("search")

    if search:

        subscriptions = subscriptions.filter(
            Q(organization__organization_name__icontains=search)
            | Q(plan__plan_name__icontains=search)
        )

    plan = request.GET.get("plan")

    if plan:

        subscriptions = subscriptions.filter(plan__plan_name=plan)

    status_filter = request.GET.get("status")

    if status_filter:

        # "Pending" and "Cancelled" are display-level statuses (see
        # get_display_status()) that don't map 1:1 onto a single stored
        # value, so they're matched the same way here.
        if status_filter == "Pending":
            subscriptions = subscriptions.filter(
                Q(organization__status="Pending")
                | Q(status__in=["Pending Payment", "Pending Activation"])
            )
        elif status_filter == "Cancelled":
            subscriptions = subscriptions.filter(
                Q(status="Cancelled") | Q(organization__status="Rejected")
            )
        else:
            subscriptions = subscriptions.filter(status=status_filter).exclude(
                organization__status__in=["Pending", "Rejected"]
            )

    billing_cycle = request.GET.get("billing_cycle")

    if billing_cycle:

        subscriptions = subscriptions.filter(billing_cycle=billing_cycle)

    page = request.GET.get("page", 1)

    page_size = request.GET.get("page_size", 10)

    paginator = Paginator(subscriptions, page_size)

    page_obj = paginator.get_page(page)

    serializer = SubscriptionSerializer(page_obj, many=True)

    all_subs = Subscription.objects.select_related("organization", "plan")

    # The table (and its status filter, e.g. "Pending") only ever shows one
    # row per org — its *latest* subscription (see _latest_subscription_per_org
    # above). Some KPI cards need to match that "current state" view exactly,
    # not "did this org *ever* have a row matching X" — an org can have an
    # old superseded row (e.g. a stale "Pending Payment" row left behind after
    # it later paid, or a stale "Pending" org-status row before it was later
    # approved) that still matches a filter even though its current row no
    # longer does. Deduping to "distinct organization" alone isn't enough for
    # that case, since the org is still counted via its stale row. Using the
    # same one-row-per-org queryset as the table keeps the cards and the table
    # in agreement.
    latest_subs = _latest_subscription_per_org(all_subs)

    # A Rejected org's subscription must never count as active/trialing, even
    # if a legacy row is still stuck at "Active" from before reject_organization()
    # cancelled subscriptions on rejection. This is what previously let a
    # rejected org's stale "Active" row inflate the Active/Plan-breakdown
    # counts by one above the real number of active organizations.
    active_subs = all_subs.filter(status="Active").exclude(
        organization__status="Rejected"
    )

    now = timezone.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    thirty_days_ago = now - timedelta(days=30)

    # Everything below used to be ~15 separate .count()/.aggregate() calls,
    # each its own DB round trip. Django can compute all of them in ONE query
    # using conditional Count/Sum(filter=...), which is what makes this slow
    # summary block fast even against a database with high per-query latency.
    not_rejected_active = Q(status="Active") & ~Q(organization__status="Rejected")

    agg = all_subs.aggregate(
        total_subscriptions=Count("id"),
        monthly_revenue=Sum("monthly_revenue", filter=not_rejected_active),
        total_employees=Sum("employees", filter=not_rejected_active),
        # Distinct organizations, not raw row count — an org should only ever
        # have one Active row, but count distinct orgs defensively so any
        # leftover duplicate-Active row (e.g. from data created before the
        # update_subscription fix) can't inflate this KPI above the real
        # number of subscribed organizations.
        active_organizations=Count(
            "organization", filter=not_rejected_active, distinct=True
        ),
        active_organizations_change=Count(
            "id", filter=not_rejected_active & Q(created_on__gte=month_start)
        ),
        # Only trial subscriptions that are still Active count here.
        # An org that upgraded from trial to a paid plan (e.g. Growth)
        # before the trial expired has its old trial row moved to
        # "Expired"/"Cancelled" by the upgrade flow, so it must drop out
        # of this KPI instead of still being counted as "on trial".
        # Distinct by organization for the same reason as active_organizations
        # above — one org should never count twice.
        on_trial=Count(
            "organization",
            filter=not_rejected_active & Q(billing_cycle="Free Trial"),
            distinct=True,
        ),
        # Includes Rejected orgs, whose subscription now displays (and, going
        # forward, is actually stored) as "Cancelled" — see get_display_status().
        cancelled=Count(
            "id", filter=Q(status="Cancelled") | Q(organization__status="Rejected")
        ),
        cancelled_30_days=Count(
            "id", filter=Q(status="Cancelled", updated_on__gte=thirty_days_ago)
        ),
        # past_due and expiring_soon_count were previously two separate
        # queries running the exact same filter — now computed once.
        expiring_soon=Count("id", filter=Q(status="Expiring Soon")),
        totals_employees=Sum("employees"),
        totals_monthly_revenue=Sum("monthly_revenue"),
        new_this_month=Count("id", filter=Q(created_on__gte=month_start)),
        cancelled_this_month=Count(
            "id", filter=Q(status="Cancelled", updated_on__gte=month_start)
        ),
        cancelled_this_year=Count(
            "id", filter=Q(status="Cancelled", updated_on__gte=year_start)
        ),
    )

    summary = {
        "total_subscriptions": agg["total_subscriptions"],
        "monthly_revenue": agg["monthly_revenue"] or 0,
        "monthly_revenue_change_pct": 0,
        "active_organizations": agg["active_organizations"],
        "active_organizations_change": agg["active_organizations_change"],
        "total_employees": agg["total_employees"] or 0,
        "total_employees_change": 0,
        "on_trial": agg["on_trial"],
        "on_trial_convert_this_week": 0,
        # Built from latest_subs (one row per org, same as the table) rather
        # than all_subs — see the comment on latest_subs above for why a plain
        # distinct-organization count over all historical rows still overcounts.
        # This is a different (subquery-based) queryset, so it stays a
        # separate query from the combined aggregate above.
        "pending": latest_subs.filter(
            Q(status__in=["Pending Payment", "Pending Activation"])
            | Q(organization__status="Pending")
        ).count(),
        "cancelled": agg["cancelled"],
        "cancelled_30_days": agg["cancelled_30_days"],
        "cancelled_30_days_change_pct": 0,
        "past_due": agg["expiring_soon"],
        "expiring_soon_count": agg["expiring_soon"],
        "totals": {
            "employees": agg["totals_employees"] or 0,
            "monthly_revenue": agg["totals_monthly_revenue"] or 0,
        },
    }

    plan_rows = (
        active_subs.values("plan__plan_name")
        .annotate(
            active_orgs=Count("organization", distinct=True),
            monthly_revenue=Sum("monthly_revenue"),
        )
        .order_by("-active_orgs")
    )
    active_total = summary["active_organizations"] or 1

    plan_breakdown = [
        {
            "plan": row["plan__plan_name"],
            "active_orgs": row["active_orgs"],
            "share_pct": round(row["active_orgs"] / active_total * 100),
            "monthly_revenue": row["monthly_revenue"] or 0,
        }
        for row in plan_rows
    ]

    plan_breakdown_totals = {
        "new_this_month": agg["new_this_month"],
        "cancelled_this_month": agg["cancelled_this_month"],
        "cancelled_this_year": agg["cancelled_this_year"],
    }

    return Response(
        {
            "success": True,
            "summary": summary,
            "plan_breakdown": plan_breakdown,
            "plan_breakdown_totals": plan_breakdown_totals,
            "pagination": {
                "current_page": page_obj.number,
                "total_pages": paginator.num_pages,
                "total_records": paginator.count,
                "page_size": int(page_size),
            },
            "data": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_subscription(request, id):

    subscription = get_object_or_404(Subscription, id=id)

    serializer = SubscriptionSerializer(subscription)

    return Response(
        {"success": True, "data": serializer.data}, status=status.HTTP_200_OK
    )


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def update_subscription(request, id):

    if request.user.role != "SUPER_ADMIN":
        return Response(
            {"success": False, "message": "Only Super Admin can update subscriptions."},
            status=status.HTTP_403_FORBIDDEN,
        )

    subscription = get_object_or_404(Subscription, id=id)

    serializer = SubscriptionSerializer(subscription, data=request.data)

    if serializer.is_valid():

        serializer.save(updated_by=request.user.username)
        subscription = serializer.instance

        # Keep the "one Active subscription per organization" invariant that
        # every other activation path (simulate_registration_payment,
        # force_activate_subscription) already enforces. Without this, an
        # edit that sets this row to "Active" while the org's previous plan
        # is still "Active" leaves two Active rows for the same org, which
        # silently inflates the Active KPI count beyond the true org count.
        if subscription.status == "Active":
            Subscription.objects.filter(
                organization=subscription.organization,
                status="Active",
            ).exclude(id=subscription.id).update(status="Expired")

        notify_org_admins(
            organization=subscription.organization,
            title="Subscription Updated",
            message=f"Your organization's subscription was updated. Plan: {subscription.plan.plan_name}, status: {subscription.status}.",
            notification_type="Organization Status Update",
            actor=request.user,
        )

        subject = "Subscription Updated"

        message = f"""
        Hello,

        Your subscription has been updated successfully.

        Organization : {subscription.organization.organization_name}
        Plan         : {subscription.plan.plan_name}
        Billing Cycle: {subscription.billing_cycle}
        Status       : {subscription.status}
        Next Payment : {subscription.next_payment_date}

        Regards,
        IndusServiceFlow Team
        """

        org_admin = User.objects.filter(
            organization=subscription.organization, role="ORG_ADMIN"
        ).first()

        if org_admin:

            try:

                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [org_admin.email],
                    fail_silently=False,
                )

                print("Subscription Update Mail Sent")

            except Exception as e:
                print("Email Error :", str(e))

        else:
            print("Organization Admin not found.")

        log_action(request.user, "Update", "Subscriptions")

        return Response(
            {
                "success": True,
                "message": "Subscription updated successfully.",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    return Response(
        {"success": False, "errors": serializer.errors},
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def force_activate_subscription(request, id):

    if request.user.role != "SUPER_ADMIN":
        return Response(
            {
                "success": False,
                "message": "Only Super Admin can activate subscriptions.",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    subscription = get_object_or_404(Subscription, id=id)

    if subscription.status == "Active":
        return Response(
            {"success": False, "message": "This subscription is already active."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    subscription.status = "Active"
    subscription.payment_status = "Paid"

    if subscription.billing_cycle == "Monthly":
        subscription.monthly_revenue = subscription.amount
    elif subscription.billing_cycle == "Annual":
        subscription.monthly_revenue = subscription.amount / 12
    else:
        subscription.monthly_revenue = 0

    subscription.updated_by = request.user.username
    subscription.save()

    Subscription.objects.filter(
        organization=subscription.organization,
        status="Active",
    ).exclude(id=subscription.id).update(status="Expired")

    notify_org_admins(
        organization=subscription.organization,
        title="Subscription Activated",
        message=(
            f"Your subscription ({subscription.plan.plan_name}, "
            f"{subscription.billing_cycle}) has been activated."
        ),
        notification_type="Organization Status Update",
        actor=request.user,
    )

    log_action(
        request.user,
        "Activate",
        "Subscriptions",
        target_info=f"{subscription.organization.organization_name} - {subscription.plan.plan_name}",
    )

    serializer = SubscriptionSerializer(subscription)

    return Response(
        {
            "success": True,
            "message": "Subscription activated successfully.",
            "data": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_subscription(request, id):

    if request.user.role != "SUPER_ADMIN":
        return Response(
            {"success": False, "message": "Only Super Admin can delete subscriptions."},
            status=status.HTTP_403_FORBIDDEN,
        )

    subscription = get_object_or_404(Subscription, id=id)

    if subscription.status == "Active":
        return Response(
            {
                "success": False,
                "message": (
                    "This subscription is active and can't be deleted. "
                    "Cancel or expire it first if it shouldn't be current."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    target_info = f"{subscription.organization.organization_name} - {subscription.plan.plan_name} ({subscription.status})"
    organization = subscription.organization

    subscription.delete()

    log_action(
        request.user,
        "Delete",
        "Subscriptions",
        target_info=target_info,
    )

    return Response(
        {"success": True, "message": "Subscription deleted successfully."},
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def export_subscriptions(request):

    subscriptions = _latest_subscription_per_org(
        Subscription.objects.select_related("organization", "plan").order_by("id")
    )

    search = request.GET.get("search")

    if search:

        subscriptions = subscriptions.filter(
            Q(organization__organization_name__icontains=search)
            | Q(plan__plan_name__icontains=search)
        )

    plan = request.GET.get("plan")

    if plan:

        subscriptions = subscriptions.filter(plan__plan_name=plan)

    status_filter = request.GET.get("status")

    if status_filter:

        if status_filter == "Pending":
            subscriptions = subscriptions.filter(
                Q(organization__status="Pending")
                | Q(status__in=["Pending Payment", "Pending Activation"])
            )
        elif status_filter == "Cancelled":
            subscriptions = subscriptions.filter(
                Q(status="Cancelled") | Q(organization__status="Rejected")
            )
        else:
            subscriptions = subscriptions.filter(status=status_filter).exclude(
                organization__status__in=["Pending", "Rejected"]
            )

    billing_cycle = request.GET.get("billing_cycle")

    if billing_cycle:

        subscriptions = subscriptions.filter(billing_cycle=billing_cycle)

    export_format = request.GET.get("export_format", "csv").lower()

    report_title = "SUBSCRIPTIONS REPORT"
    date_str = timezone.now().strftime("%Y-%m-%d")
    generated_by = f"Generated By: {request.user.username}"

    headers = [
        "ID",
        "Organization",
        "Plan",
        "Billing Cycle",
        "Employees",
        "Monthly Revenue",
        "Start Date",
        "Next Payment",
        "Status",
    ]

    if export_format == "csv":

        response = HttpResponse(content_type="text/csv")

        response["Content-Disposition"] = (
            f'attachment; filename="subscriptions_{date_str}.csv"'
        )

        writer = csv.writer(response)

        # ---- Heading ----
        writer.writerow([report_title])
        writer.writerow([generated_by])
        writer.writerow([])

        writer.writerow(headers)

        for sno, sub in enumerate(subscriptions, 1):

            writer.writerow(
                [
                    sno,
                    sub.organization.organization_name,
                    sub.plan.plan_name,
                    sub.billing_cycle,
                    sub.employees,
                    sub.monthly_revenue,
                    sub.start_date,
                    sub.next_payment_date,
                    get_display_status(sub),
                ]
            )
        log_action(request.user, "Export", "Subscriptions")
        return response

    elif export_format == "excel":

        workbook = Workbook()

        sheet = workbook.active
        sheet.title = "Subscriptions"

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

        row_num = header_row + 1

        for sno, sub in enumerate(subscriptions, 1):

            sheet.cell(row=row_num, column=1).value = sno
            sheet.cell(row=row_num, column=2).value = sub.organization.organization_name
            sheet.cell(row=row_num, column=3).value = sub.plan.plan_name
            sheet.cell(row=row_num, column=4).value = sub.billing_cycle
            sheet.cell(row=row_num, column=5).value = sub.employees
            sheet.cell(row=row_num, column=6).value = sub.monthly_revenue
            sheet.cell(row=row_num, column=7).value = sub.start_date
            sheet.cell(row=row_num, column=8).value = sub.next_payment_date
            sheet.cell(row=row_num, column=9).value = get_display_status(sub)

            row_num += 1

        response = HttpResponse(
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )

        response["Content-Disposition"] = (
            f'attachment; filename="subscriptions_{date_str}.xlsx"'
        )

        workbook.save(response)

        log_action(request.user, "Export", "Subscriptions")
        return response

    elif export_format == "pdf":

        subscriptions_list = list(subscriptions)

        total_subs = len(subscriptions_list)
        active_count = sum(
            1
            for s in subscriptions_list
            if (get_display_status(s) or "").strip().lower() == "active"
        )
        expiring_count = sum(
            1
            for s in subscriptions_list
            if (get_display_status(s) or "").strip().lower() == "expiring soon"
        )
        expired_cancelled_count = sum(
            1
            for s in subscriptions_list
            if (get_display_status(s) or "").strip().lower()
            in ("expired", "cancelled", "locked")
        )
        total_monthly_revenue = sum(
            (s.monthly_revenue or 0) for s in subscriptions_list
        )

        summary_cards = [
            {
                "label": "Total Subscriptions",
                "value": total_subs,
                "sub": "All subscriptions",
                "css": "card-blue",
            },
            {
                "label": "Active",
                "value": active_count,
                "sub": "Currently active",
                "css": "card-green",
            },
            {
                "label": "Expiring Soon",
                "value": expiring_count,
                "sub": "Renewal due soon",
                "css": "card-yellow",
            },
            {
                "label": "Expired / Cancelled",
                "value": expired_cancelled_count,
                "sub": "Expired, cancelled or locked",
                "css": "card-red",
            },
        ]

        rows = [
            [
                sno,
                sub.organization.organization_name,
                sub.plan.plan_name,
                sub.billing_cycle,
                sub.live_employee_count(),
                sub.monthly_revenue,
                sub.start_date,
                sub.next_payment_date,
                get_display_status(sub),
            ]
            for sno, sub in enumerate(subscriptions_list, 1)
        ]

        response = _build_list_report_pdf(
            report_title=report_title,
            report_subtitle="Operational Analytics & Performance Insights",
            summary_cards=summary_cards,
            table_section_title="Subscription Directory",
            headers=headers,
            rows=rows,
            status_col_index=8,
            total_count=total_subs,
            generated_by_username=request.user.username,
            filename=f"subscriptions_{date_str}.pdf",
            highlight={
                "label": "Total Monthly Revenue (Filtered Results)",
                "value": f"\u20b9{total_monthly_revenue:,.2f}",
            },
        )

        log_action(request.user, "Export", "Subscriptions")
        return response

    return Response(
        {
            "success": False,
            "message": "Invalid export format. Supported formats are csv, excel and pdf.",
        },
        status=status.HTTP_400_BAD_REQUEST,
    )