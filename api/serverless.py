
from flask import Flask, Request
from api.main import app

# Hàm handler cho Vercel Serverless Functions
def handler(request):
    """
    Hàm xử lý cho Vercel Functions.
    Nhận HTTP request và trả về HTTP response.
    """
    method = request.get('method', 'GET')
    path = request.get('path', '/')
    headers = request.get('headers', {})
    body = request.get('body', '')
    
    # Chuyển đổi WSGI request
    with app.test_client() as client:
        response = client.open(
            path,
            method=method,
            headers=headers,
            data=body
        )
        
        # Trả về response theo định dạng Vercel Functions
        return {
            'statusCode': response.status_code,
            'headers': dict(response.headers),
            'body': response.get_data(as_text=True)
        }
