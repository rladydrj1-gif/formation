# -*- coding: utf-8 -*-
import os
import sys

# Vercel 서버리스 실행 환경을 위한 경로 설정
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from app import app

# Vercel WSGI entry point
app.debug = False
