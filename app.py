# -*- coding: utf-8 -*-
import os
import sys
import json
import io
from flask import Flask, render_template, request, jsonify, send_file
import pandas as pd
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def get_base_dir():
    if getattr(sys, 'frozen', False):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))

def get_writable_dir():
    if getattr(sys, 'frozen', False):
        exe_dir = os.path.dirname(sys.executable)
        return exe_dir
    return os.path.dirname(os.path.abspath(__file__))

BASE_DIR = get_base_dir()
WRITABLE_DIR = get_writable_dir()
DATA_DIR = os.path.join(WRITABLE_DIR, 'data')
os.makedirs(DATA_DIR, exist_ok=True)

PLAYERS_FILE = os.path.join(DATA_DIR, 'players.json')
TACTICS_FILE = os.path.join(DATA_DIR, 'tactics.json')
DEFAULT_PLAYERS_FILE = os.path.join(BASE_DIR, 'data', 'default_players.json')
DEFAULT_TACTICS_FILE = os.path.join(BASE_DIR, 'data', 'tactics.json')

def init_files():
    if not os.path.exists(PLAYERS_FILE):
        if os.path.exists(DEFAULT_PLAYERS_FILE):
            with open(DEFAULT_PLAYERS_FILE, 'r', encoding='utf-8') as sf:
                content = sf.read()
            with open(PLAYERS_FILE, 'w', encoding='utf-8') as df:
                df.write(content)
        else:
            with open(PLAYERS_FILE, 'w', encoding='utf-8') as df:
                json.dump([], df, ensure_ascii=False)

    if not os.path.exists(TACTICS_FILE):
        if os.path.exists(DEFAULT_TACTICS_FILE):
            with open(DEFAULT_TACTICS_FILE, 'r', encoding='utf-8') as sf:
                content = sf.read()
            with open(TACTICS_FILE, 'w', encoding='utf-8') as df:
                df.write(content)

init_files()

app = Flask(__name__,
            template_folder=os.path.join(BASE_DIR, 'templates'),
            static_folder=os.path.join(BASE_DIR, 'static'))

def calculate_ovr(pos, stats):
    pac = stats.get('pac', 70)
    sho = stats.get('sho', 70)
    pas = stats.get('pas', 70)
    dri = stats.get('dri', 70)
    def_ = stats.get('def', 70)
    phy = stats.get('phy', 70)

    pos = (pos or 'CM').upper()
    if pos in ['ST', 'CF']:
        ovr = sho * 0.35 + pac * 0.25 + phy * 0.15 + dri * 0.15 + pas * 0.10
    elif pos in ['LW', 'RW', 'LM', 'RM']:
        ovr = pac * 0.30 + dri * 0.25 + pas * 0.20 + sho * 0.15 + phy * 0.10
    elif pos in ['CAM', 'AM']:
        ovr = pas * 0.30 + dri * 0.25 + sho * 0.20 + pac * 0.15 + phy * 0.10
    elif pos in ['CM']:
        ovr = pas * 0.25 + dri * 0.20 + phy * 0.20 + def_ * 0.15 + sho * 0.10 + pac * 0.10
    elif pos in ['CDM', 'DM']:
        ovr = def_ * 0.30 + phy * 0.25 + pas * 0.20 + dri * 0.10 + pac * 0.10 + sho * 0.05
    elif pos in ['CB']:
        ovr = def_ * 0.40 + phy * 0.30 + pac * 0.15 + pas * 0.10 + dri * 0.05
    elif pos in ['LB', 'RB', 'LWB', 'RWB']:
        ovr = pac * 0.25 + def_ * 0.25 + phy * 0.20 + pas * 0.15 + dri * 0.15
    elif pos in ['GK']:
        ovr = def_ * 0.35 + phy * 0.25 + pac * 0.15 + pas * 0.15 + dri * 0.10
    else:
        ovr = (pac + sho + pas + dri + def_ + phy) / 6.0
    return int(round(ovr))

def load_players():
    if not os.path.exists(PLAYERS_FILE):
        init_files()
    try:
        with open(PLAYERS_FILE, 'r', encoding='utf-8') as f:
            players = json.load(f)
            # Ensure each player has total_score and ovr
            for p in players:
                s = p.get('stats', {})
                if 'total_score' not in p:
                    p['total_score'] = sum([s.get('pac', 70), s.get('sho', 70), s.get('pas', 70), s.get('dri', 70), s.get('def', 70), s.get('phy', 70)])
            return players
    except Exception:
        return []

def save_players(players):
    with open(PLAYERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(players, f, ensure_ascii=False, indent=2)

def load_tactics():
    if not os.path.exists(TACTICS_FILE):
        init_files()
    try:
        with open(TACTICS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}

def save_tactics(tactics):
    with open(TACTICS_FILE, 'w', encoding='utf-8') as f:
        json.dump(tactics, f, ensure_ascii=False, indent=2)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/players', methods=['GET'])
def get_players():
    return jsonify(load_players())

@app.route('/api/players', methods=['POST'])
def save_player():
    data = request.json
    players = load_players()
    
    player_id = data.get('id')
    stats = data.get('stats', {'pac': 70, 'sho': 70, 'pas': 70, 'dri': 70, 'def': 70, 'phy': 70})
    pos = data.get('position', 'CM')
    ovr = calculate_ovr(pos, stats)
    total_score = sum([stats.get('pac', 70), stats.get('sho', 70), stats.get('pas', 70), stats.get('dri', 70), stats.get('def', 70), stats.get('phy', 70)])

    data['ovr'] = ovr
    data['total_score'] = total_score

    if not player_id:
        new_id = f'p_{len(players) + 1}_{int(os.times().system*1000)}'
        data['id'] = new_id
        players.append(data)
    else:
        found = False
        for idx, p in enumerate(players):
            if p.get('id') == player_id:
                players[idx] = data
                found = True
                break
        if not found:
            players.append(data)

    save_players(players)
    return jsonify({'success': True, 'player': data})

@app.route('/api/players/<player_id>', methods=['DELETE'])
def delete_player(player_id):
    players = load_players()
    players = [p for p in players if p.get('id') != player_id]
    save_players(players)

    tactics = load_tactics()
    starting11 = tactics.get('starting11', {})
    for slot, pid in list(starting11.items()):
        if pid == player_id:
            starting11[slot] = None
    subs = tactics.get('substitutes', [])
    tactics['substitutes'] = [pid for pid in subs if pid != player_id]
    save_tactics(tactics)

    return jsonify({'success': True})

@app.route('/api/tactics', methods=['GET'])
def get_tactics():
    return jsonify(load_tactics())

@app.route('/api/tactics', methods=['POST'])
def update_tactics():
    data = request.json
    save_tactics(data)
    return jsonify({'success': True})

@app.route('/api/reset-default', methods=['POST'])
def reset_default():
    if os.path.exists(DEFAULT_PLAYERS_FILE):
        with open(DEFAULT_PLAYERS_FILE, 'r', encoding='utf-8') as sf:
            p_data = json.load(sf)
        save_players(p_data)
    if os.path.exists(DEFAULT_TACTICS_FILE):
        with open(DEFAULT_TACTICS_FILE, 'r', encoding='utf-8') as sf:
            t_data = json.load(sf)
        save_tactics(t_data)
    return jsonify({'success': True})

@app.route('/api/export-excel', methods=['GET'])
def export_excel():
    players = load_players()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = '선수단_명단_및_능력치'

    headers = [
        '선수ID', '등번호', '이름', '소속부서', '나이', '주포지션', '주발',
        'PAC(주력)', 'SHO(슈팅)', 'PAS(패스)', 'DRI(드리블)', 'DEF(수비)', 'PHY(피지컬)',
        '총점(6개합계)', '종합평점(OVR)', '선수특징/메모'
    ]
    ws.append(headers)

    # Styles
    header_font = Font(name='맑은 고딕', size=11, bold=True, color='FFFFFF')
    header_fill = PatternFill(start_color='1F4E79', end_color='1F4E79', fill_type='solid')
    total_hdr_fill = PatternFill(start_color='C65911', end_color='C65911', fill_type='solid')

    data_font = Font(name='맑은 고딕', size=10)
    bold_font = Font(name='맑은 고딕', size=10, bold=True)
    total_cell_fill = PatternFill(start_color='FFF2CC', end_color='FFF2CC', fill_type='solid')
    center_align = Alignment(horizontal='center', vertical='center')
    left_align = Alignment(horizontal='left', vertical='center')
    thin_border = Border(
        left=Side(style='thin', color='D9D9D9'),
        right=Side(style='thin', color='D9D9D9'),
        top=Side(style='thin', color='D9D9D9'),
        bottom=Side(style='thin', color='D9D9D9')
    )

    # Apply Header Styles
    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.font = header_font
        cell.fill = total_hdr_fill if col_idx in [14, 15] else header_fill
        cell.alignment = center_align

    # Add Player Rows
    for idx, p in enumerate(players):
        row_num = idx + 2
        stats = p.get('stats', {})
        row = [
            p.get('id', f'p{idx+1}'),
            p.get('back_number', idx + 1),
            p.get('name', ''),
            p.get('department', ''),
            p.get('age', 30),
            p.get('position', 'CM'),
            p.get('foot', '오른발'),
            stats.get('pac', 70),
            stats.get('sho', 70),
            stats.get('pas', 70),
            stats.get('dri', 70),
            stats.get('def', 70),
            stats.get('phy', 70),
            f'=SUM(H{row_num}:M{row_num})',
            f'=ROUND(AVERAGE(H{row_num}:M{row_num}), 0)',
            p.get('notes', '')
        ]
        ws.append(row)

        for col_idx in range(1, len(headers) + 1):
            cell = ws.cell(row=row_num, column=col_idx)
            cell.font = bold_font if col_idx in [2, 3, 14, 15] else data_font
            cell.border = thin_border
            if col_idx in [14, 15]:
                cell.fill = total_cell_fill
            cell.alignment = left_align if col_idx in [3, 4, 16] else center_align

    # Auto-adjust column widths
    column_widths = {
        'A': 10, 'B': 8, 'C': 12, 'D': 16, 'E': 8, 'F': 10, 'G': 10,
        'H': 12, 'I': 12, 'J': 12, 'K': 12, 'L': 12, 'M': 12,
        'N': 15, 'O': 14, 'P': 40
    }
    for col_letter, width in column_widths.items():
        ws.column_dimensions[col_letter].width = width

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name='부산시청_축구회_선수명단_및_능력치.xlsx'
    )

@app.route('/api/import-excel', methods=['POST'])
def import_excel():
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': '파일이 전송되지 않았습니다.'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': '선택된 파일이 없습니다.'}), 400

    try:
        df = pd.read_excel(file)
        new_players = []
        for idx, row in df.iterrows():
            name = str(row.get('이름', '')).strip()
            if not name or name == 'nan':
                continue

            pos = str(row.get('주포지션', 'CM')).strip().upper()
            pac = int(row.get('PAC(주력)', 70)) if pd.notna(row.get('PAC(주력)')) else 70
            sho = int(row.get('SHO(슈팅)', 70)) if pd.notna(row.get('SHO(슈팅)')) else 70
            pas = int(row.get('PAS(패스)', 70)) if pd.notna(row.get('PAS(패스)')) else 70
            dri = int(row.get('DRI(드리블)', 70)) if pd.notna(row.get('DRI(드리블)')) else 70
            def_ = int(row.get('DEF(수비)', 70)) if pd.notna(row.get('DEF(수비)')) else 70
            phy = int(row.get('PHY(피지컬)', 70)) if pd.notna(row.get('PHY(피지컬)')) else 70

            stats = {
                'pac': pac,
                'sho': sho,
                'pas': pas,
                'dri': dri,
                'def': def_,
                'phy': phy
            }
            total_score = pac + sho + pas + dri + def_ + phy
            ovr = calculate_ovr(pos, stats)

            pid = str(row.get('선수ID', '')).strip()
            if not pid or pid == 'nan':
                pid = f'p_imp_{idx+1}_{int(os.times().system*1000)}'

            p = {
                'id': pid,
                'back_number': int(row.get('등번호', idx + 1)) if pd.notna(row.get('등번호')) else idx + 1,
                'name': name,
                'department': str(row.get('소속부서', '부산시청')).strip() if pd.notna(row.get('소속부서')) else '부산시청',
                'age': int(row.get('나이', 30)) if pd.notna(row.get('나이')) else 30,
                'position': pos,
                'secondary_positions': [],
                'foot': str(row.get('주발', '오른발')).strip() if pd.notna(row.get('주발')) else '오른발',
                'stats': stats,
                'total_score': total_score,
                'ovr': ovr,
                'notes': str(row.get('선수특징/메모', '')).strip() if pd.notna(row.get('선수특징/메모')) else ''
            }
            new_players.append(p)

        if not new_players:
            return jsonify({'success': False, 'error': '엑셀에서 유효한 선수 데이터를 찾을 수 없습니다.'}), 400

        save_players(new_players)
        return jsonify({'success': True, 'count': len(new_players)})
    except Exception as e:
        return jsonify({'success': False, 'error': f'엑셀 처리 중 오류 발생: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
