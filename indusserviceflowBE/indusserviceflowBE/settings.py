from decouple import config
from pathlib import Path
import pymysql
from datetime import timedelta

pymysql.install_as_MySQLdb()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config("SECRET_KEY")
DEBUG = config("DEBUG", default=False, cast=bool)


_env_allowed_hosts = config("ALLOWED_HOSTS", default="10.168.130.27")

ALLOWED_HOSTS = [host.strip() for host in _env_allowed_hosts.split(",") if host.strip()]


for _host in ("127.0.0.1", "localhost"):
    if _host not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(_host)


INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "django_extensions",
    "corsheaders",
    "common",
    "simulation",
    "authentication",
    "organizations",
    "subscriptions",
    "plans",
    "users",
    "audit_logs",
    "categories",
    "profiles",
    "dashboard",
    "employees",
    "customers",
    "appointments",
    "queues",
    "notifications",
    "services",
    "report",
    "feedback",
]


MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


ROOT_URLCONF = "indusserviceflowBE.urls"


TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


WSGI_APPLICATION = "indusserviceflowBE.wsgi.application"


DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": config("DB_NAME", default="indusserviceflow"),
        "USER": config("DB_USER", default="root"),
        "PASSWORD": config("DB_PASSWORD"),
        "HOST": config("DB_HOST", default="localhost"),
        "PORT": config("DB_PORT", default="3306"),
    }
}


REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "employees.authentication.EmployeeAwareJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_THROTTLE_RATES": {
        "otp_request": "5/hour",
        "otp_verify": "10/hour",
    },
    # By default DRF serializes every DecimalField (Plan.monthly_price,
    # Plan.annual_price, Subscription.amount, etc.) as a JSON STRING
    # (e.g. "0.00") to avoid floating-point rounding in transit. The
    # frontend, however, treats these as JS numbers everywhere (PublicPlan
    # types them as `number`, and does strict `=== 0` checks such as
    # `isFullyFreePlan = plan.monthly_price === 0 && plan.annual_price === 0`
    # in BillingCycleStep.tsx). A string "0.00" never strictly equals the
    # number 0, so those checks silently fail — e.g. a genuinely free plan
    # still renders the full Monthly/Annual/Trial billing-cycle picker
    # (showing "₹0.00" instead of "Free") instead of the simplified
    # single-confirmation screen. Turning this off makes DRF emit real
    # JSON numbers for every decimal field project-wide, matching what the
    # frontend already assumes.
    "COERCE_DECIMAL_TO_STRING": False,
}


SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(days=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
}


AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

LANGUAGE_CODE = "en-us"

TIME_ZONE = "Asia/Kolkata"

USE_I18N = True
USE_TZ = True


EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = config("EMAIL_HOST", default="smtp.gmail.com")
EMAIL_PORT = config("EMAIL_PORT", default=587, cast=int)
EMAIL_USE_TLS = config("EMAIL_USE_TLS", default=True, cast=bool)
EMAIL_HOST_USER = config("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD")

EMAIL_TIMEOUT = config("EMAIL_TIMEOUT", default=10, cast=int)

DEFAULT_FROM_EMAIL = EMAIL_HOST_USER

# Where landing-page contact form submissions are emailed.
# Optional: defaults to the SMTP account itself (EMAIL_HOST_USER).
CONTACT_NOTIFICATION_EMAIL = config(
    "CONTACT_NOTIFICATION_EMAIL", default=EMAIL_HOST_USER
)


FRONTEND_URL = config("FRONTEND_URL", default="http://localhost:5173")


FEEDBACK_LINK_VALID_DAYS = config("FEEDBACK_LINK_VALID_DAYS", default=7, cast=int)

STATIC_URL = "static/"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_USER_MODEL = "users.User"


# CORS
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://10.168.130.27:5173",
    "https://indus-service-flow.vercel.app",3
]

CORS_ALLOW_CREDENTIALS = True