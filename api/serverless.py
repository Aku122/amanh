
from flask import Flask
from api.main import app

def handler(request, context):
    """Handle a request to the API."""
    return app
