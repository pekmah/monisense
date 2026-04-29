Create these files before running Docker Compose:

- `secrets/postgres_superuser_password.txt`
- `secrets/app_db_password.txt`
- `secrets/database_url.txt`
- `secrets/database_admin_url.txt`
- `secrets/api_secret.txt`

Recommended contents:

- `database_url.txt`
  `postgres://app_user:<strong-app-password>@db:5432/finance_ai`
- `database_admin_url.txt`
  `postgres://postgres:<strong-admin-password>@db:5432/finance_ai`

Do not commit the `.txt` secret files.
