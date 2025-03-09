from flask import Flask, render_template, send_from_directory, jsonify
import os
import sys
import io

# Ensure template and static paths work correctly by adjusting path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

app = Flask(__name__, 
            template_folder='../templates',
            static_folder='../static')
app.secret_key = os.environ.get("SESSION_SECRET", "dev_key")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/static/assets/<path:filename>')
def serve_asset(filename):
    script_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    assets_dir = os.path.join(script_dir, 'static', 'assets')
    return send_from_directory(assets_dir, filename)

@app.route('/static/assets/list')
def list_assets():
    # Đường dẫn tuyệt đối đến thư mục assets
    script_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    assets_dir = os.path.join(script_dir, 'static', 'assets')

    try:
        if not os.path.exists(assets_dir):
            print(f"Thư mục không tồn tại: {assets_dir}")
            return jsonify([])

        files = [f for f in os.listdir(assets_dir) if os.path.isfile(os.path.join(assets_dir, f))]
        print(f"Tìm thấy {len(files)} files trong {assets_dir}: {files}")
        return jsonify(files)
    except Exception as e:
        print(f"Lỗi khi liệt kê files: {str(e)}")
        return jsonify([])

# Không cần hàm handler ở đây, đã được xử lý trong api/index.py

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=False)