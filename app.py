# -*- coding: utf-8 -*-
import os
import sys
import json
import io
from flask import Flask, render_template, request, jsonify, send_file
import pandas as pd

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
            return json.load(f)
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
    data['ovr'] = ovr

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
    rows = []
    for p in players:
        stats = p.get('stats', {})
        rows.append({
            '선수ID': p.get('id'),
            '등번호': p.get('back_number', 0),
            '이름': p.get('name', ''),
            '소속부서': p.get('department', ''),
            '나이': p.get('age', 30),
            '주포지션': p.get('position', 'CM'),
            '주발': p.get('foot', '오른발'),
            'OVR(종합)': p.get('ovr', 75),
            'PAC(주력)': stats.get('pac', 70),
            'SHO(슈팅)': stats.get('sho', 70),
            'PAS(패스)': stats.get('pas', 70),
            'DRI(드리블)': stats.get('dri', 70),
            'DEF(수비)': stats.get('def', 70),
            'PHY(피지컬)': stats.get('phy', 70),
            '선수특징/메모': p.get('notes', '')
        })
    df = pd.DataFrame(rows)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='부산시청_선수단')
    output.seek(0)
    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name='부산시청_축구회_선수명단.xlsx'
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
            pos = str(row.get('주포지션', 'CM')).strip().upper()
            stats = {
                'pac': int(row.get('PAC(주력)', 70)),
                'sho': int(row.get('SHO(슈팅)', 70)),
                'pas': int(row.get('PAS(패스)', 70)),
                'dri': int(row.get('DRI(드리블)', 70)),
                'def': int(row.get('DEF(수비)', 70)),
                'phy': int(row.get('PHY(피지컬)', 70)),
            }
            pid = str(row.get('선수ID', '')).strip()
            if not pid or pid == 'nan':
                pid = f'p_imp_{idx}_{int(os.times().system*1000)}'
            
            p = {
                'id': pid,
                'back_number': int(row.get('등번호', idx + 1)) if pd.notna(row.get('등번호')) else idx + 1,
                'name': str(row.get('이름', f'선수{idx+1}')).strip(),
                'department': str(row.get('소속부서', '부산시청')).strip(),
                'age': int(row.get('나이', 30)) if pd.notna(row.get('나이')) else 30,
                'position': pos,
                'secondary_positions': [],
                'foot': str(row.get('주발', '오른발')).strip(),
                'stats': stats,
                'ovr': calculate_ovr(pos, stats),
                'notes': str(row.get('선수특징/메모', '')).strip() if pd.notna(row.get('선수특징/메모')) else ''
            }
            new_players.append(p)
        
        save_players(new_players)
        return jsonify({'success': True, 'count': len(new_players)})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
