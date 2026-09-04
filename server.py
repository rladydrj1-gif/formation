# -*- coding: utf-8 -*-
"""
부산시청 축구회 전술 포메이션 매니저 - 실시간 협업 웹 서버 실행기
"""
import os
import sys
import webbrowser
import threading
import time
from app import app, socketio, get_local_ip

def open_browser():
    time.sleep(1.2)
    webbrowser.open('http://localhost:5000')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    local_ip = get_local_ip()

    print("=" * 68)
    print(" ⚽ 부산시청 축구회 전술 포메이션 매니저 [실시간 협업 웹 서버]")
    print("=" * 68)
    print(f" ▶ 현재 PC 접속 주소   : http://localhost:{port}")
    print(f" ▶ 동료(Wi-Fi) 접속 주소: http://{local_ip}:{port}")
    print("-" * 68)
    print(" 💡 안내:")
    print(f"  - 같은 사무실/운동장 Wi-Fi에 연결된 동료의 스마트폰, 태블릿,")
    print(f"    노트북 브라우저에 [ http://{local_ip}:{port} ]를 입력하면")
    print("    모든 접속자가 실시간으로 선수 점수와 포메이션을 함께 수정할 수 있습니다.")
    print("  - 서버를 종료하려면 이 창에서 [Ctrl + C]를 누르세요.")
    print("=" * 68)
    print("🚀 웹 브라우저를 자동으로 실행합니다...\n")

    # 브라우저 자동 오픈 스레드 (로컬 실행 시)
    if not os.environ.get('NO_BROWSER'):
        threading.Thread(target=open_browser, daemon=True).start()

    socketio.run(app, host='0.0.0.0', port=port, debug=False, allow_unsafe_werkzeug=True)
