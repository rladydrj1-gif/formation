# -*- coding: utf-8 -*-
import os
import sys
import threading
import time
import socket
import webbrowser
from app import app

def get_free_port():
    for p in [5000, 5001, 5050, 8080]:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            s.bind(('127.0.0.1', p))
            s.close()
            return p
        except OSError:
            continue
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(('127.0.0.1', 0))
    port = s.getsockname()[1]
    s.close()
    return port

def start_server(port):
    import logging
    log = logging.getLogger('werkzeug')
    log.setLevel(logging.ERROR)
    app.run(host='127.0.0.1', port=port, debug=False, use_reloader=False)

def main():
    port = get_free_port()
    server_thread = threading.Thread(target=start_server, args=(port,))
    server_thread.daemon = True
    server_thread.start()

    time.sleep(0.8)
    url = f"http://127.0.0.1:{port}"
    title = "부산시청 축구회 - FIFA 스타일 선수 육각형 분석 & 포메이션 매니저"

    try:
        import webview
        webview.create_window(title, url=url, width=1440, height=920, min_size=(1050, 700))
        webview.start()
    except Exception as e:
        print(f"WebView launch note ({e}), opening in default browser...")
        webbrowser.open(url)
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass

if __name__ == '__main__':
    main()
