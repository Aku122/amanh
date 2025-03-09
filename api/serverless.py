
from http.server import BaseHTTPRequestHandler
from io import BytesIO
import sys
import os

# Đảm bảo rằng đường dẫn gốc được thêm vào sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api.main import app

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Xử lý request GET
        self._handle_request()
    
    def do_POST(self):
        # Xử lý request POST
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length) if content_length > 0 else b''
        self._handle_request(post_data)
    
    def _handle_request(self, post_data=None):
        # Tạo môi trường WSGI cho Flask app
        environ = {
            'wsgi.input': BytesIO(post_data) if post_data else BytesIO(),
            'wsgi.errors': sys.stderr,
            'wsgi.version': (1, 0),
            'wsgi.multithread': False,
            'wsgi.multiprocess': False,
            'wsgi.run_once': False,
            'wsgi.url_scheme': 'https',
            'REQUEST_METHOD': self.command,
            'PATH_INFO': self.path,
            'QUERY_STRING': '',
            'SERVER_PROTOCOL': self.protocol_version,
            'SERVER_NAME': 'vercel',
            'SERVER_PORT': '443',
            'REMOTE_ADDR': self.client_address[0] if self.client_address else '127.0.0.1',
            'CONTENT_TYPE': self.headers.get('Content-Type', ''),
            'CONTENT_LENGTH': self.headers.get('Content-Length', ''),
        }
        
        # Thêm tất cả HTTP headers
        for key, value in self.headers.items():
            key = 'HTTP_' + key.replace('-', '_').upper()
            environ[key] = value
        
        # Xử lý response
        response_body = []
        
        def start_response(status, headers):
            status_code = int(status.split(' ')[0])
            self.send_response(status_code)
            for key, value in headers:
                self.send_header(key, value)
            self.end_headers()
        
        # Gọi Flask app với môi trường WSGI
        for data in app(environ, start_response):
            if isinstance(data, str):
                response_body.append(data.encode('utf-8'))
            else:
                response_body.append(data)
        
        # Gửi response trở lại
        for data in response_body:
            self.wfile.write(data)
