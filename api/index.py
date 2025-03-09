
from http.server import BaseHTTPRequestHandler
from main import app

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/plain')
        self.end_headers()
        
        # Sử dụng WSGI app của Flask
        environ = {
            'wsgi.input': self.rfile,
            'wsgi.errors': self.wfile,
            'wsgi.version': (1, 0),
            'wsgi.multithread': False,
            'wsgi.multiprocess': False,
            'wsgi.run_once': False,
            'wsgi.url_scheme': 'http',
            'REQUEST_METHOD': self.command,
            'PATH_INFO': self.path,
            'SERVER_PROTOCOL': self.protocol_version,
            'REMOTE_ADDR': self.client_address[0],
        }
        
        # Trả về phản hồi từ Flask app
        def start_response(status, headers):
            self.send_response(int(status.split(' ')[0]))
            for key, value in headers:
                self.send_header(key, value)
            self.end_headers()
            
        result = app(environ, start_response)
        for data in result:
            if data:
                self.wfile.write(data)
