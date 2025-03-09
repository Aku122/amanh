
from flask import Flask
from api.main import app

# Handler cho serverless function của Vercel
def handler(event, context):
    """
    Hàm xử lý cho Vercel Functions.
    
    Trả về response từ Flask app dưới dạng Lambda response.
    """
    # Lấy đường dẫn từ event
    path = event.get('path', '/')
    
    # Giả lập request đến Flask app
    with app.test_client() as client:
        response = client.get(path)
        
        # Trả về response theo định dạng Vercel functions
        return {
            'statusCode': response.status_code,
            'headers': dict(response.headers),
            'body': response.data.decode('utf-8')
        }
