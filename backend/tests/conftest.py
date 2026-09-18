"""Use an ephemeral signing secret for tests, never the developer's local JWT key."""

import os
import secrets

os.environ["JWT_SECRET_KEY"] = secrets.token_urlsafe(48)
