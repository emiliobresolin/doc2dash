import secrets


def generate_upload_id() -> str:
    token = secrets.token_urlsafe(9).rstrip("_-")
    return f"upl_{token}"

