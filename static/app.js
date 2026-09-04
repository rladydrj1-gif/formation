// 부산시청 축구회 포메이션 매니저 JavaScript
let players = [];
let tactics = {
    currentFormation: '4-3-3',
    formations: {},
    starting11: {},
    substitutes: []
};
let aiRecommendedLineup = {};
let currentViewMode = 'single'; // 'single' or 'dual'
let selectedPlayer = null;
let selectedSlotId = null;
let radarChart = null;

// DOM 요소 참조
const btnViewSingle = document.getElementById('btnViewSingle');
const btnViewDual = document.getElementById('btnViewDual');
const singleViewLayout = document.getElementById('singleViewLayout');
const dualCompareLayout = document.getElementById('dualCompareLayout');
const singleMetricsBar = document.getElementById('singleMetricsBar');

const formationSelect = document.getElementById('formationSelect');
const currentFormationLabel = document.getElementById('currentFormationLabel');
const watermarkFormation = document.getElementById('watermarkFormation');
const slotsLayer = document.getElementById('slotsLayer');
const benchPlayersList = document.getElementById('benchPlayersList');
const benchCountBadge = document.getElementById('benchCountBadge');

// 듀얼 비교 뷰 DOM
const userDualSlotsLayer = document.getElementById('userDualSlotsLayer');
const aiDualSlotsLayer = document.getElementById('aiDualSlotsLayer');
const dualUserOvr = document.getElementById('dualUserOvr');
const dualUserTotal = document.getElementById('dualUserTotal');
const dualAiOvr = document.getElementById('dualAiOvr');
const dualAiTotal = document.getElementById('dualAiTotal');
const vsStatsDiff = document.getElementById('vsStatsDiff');
const btnApplyAiToUser = document.getElementById('btnApplyAiToUser');
const colUserStats = document.getElementById('colUserStats');
const colAiStats = document.getElementById('colAiStats');

// 메트릭 바
const teamOvrEl = document.getElementById('teamOvr');
const teamTotalScoreEl = document.getElementById('teamTotalScore');
const teamPacEl = document.getElementById('teamPac');
const teamShoEl = document.getElementById('teamSho');
const teamPasEl = document.getElementById('teamPas');
const teamDriEl = document.getElementById('teamDri');
const teamDefEl = document.getElementById('teamDef');
const teamPhyEl = document.getElementById('teamPhy');
const teamAgeEl = document.getElementById('teamAge');

// 인스펙터 & FIFA 카드
const cardOvr = document.getElementById('cardOvr');
const cardPos = document.getElementById('cardPos');
const cardMultiPos = document.getElementById('cardMultiPos');
const cardName = document.getElementById('cardName');
const cardNumber = document.getElementById('cardNumber');
const cardTotalScore = document.getElementById('cardTotalScore');
const cStatPac = document.getElementById('cStatPac');
const cStatDri = document.getElementById('cStatDri');
const cStatSho = document.getElementById('cStatSho');
const cStatDef = document.getElementById('cStatDef');
const cStatPas = document.getElementById('cStatPas');
const cStatPhy = document.getElementById('cStatPhy');
const playerStyleTag = document.getElementById('playerStyleTag');
const detailTotalScore = document.getElementById('detailTotalScore');
const detailOvr = document.getElementById('detailOvr');
const detailPositions = document.getElementById('detailPositions');
const detailFoot = document.getElementById('detailFoot');
const detailAge = document.getElementById('detailAge');
const detailNotes = document.getElementById('detailNotes');

// 탭 및 스쿼드 리스트
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const squadListContainer = document.getElementById('squadListContainer');
const totalPlayerCount = document.getElementById('totalPlayerCount');
const playerSearchInput = document.getElementById('playerSearchInput');
const pillBtns = document.querySelectorAll('.pill-btn');

// 모달
const playerModal = document.getElementById('playerModal');
const playerForm = document.getElementById('playerForm');
const modalTitle = document.getElementById('modalTitle');
const btnClosePlayerModal = document.getElementById('btnClosePlayerModal');
const btnCancelPlayerModal = document.getElementById('btnCancelPlayerModal');
const btnAddNewPlayer = document.getElementById('btnAddNewPlayer');
const btnEditCurrentPlayer = document.getElementById('btnEditCurrentPlayer');
const slotSelectModal = document.getElementById('slotSelectModal');
const btnCloseSlotModal = document.getElementById('btnCloseSlotModal');
const btnCloseSlotModal2 = document.getElementById('btnCloseSlotModal2');
const btnRemoveSlotPlayer = document.getElementById('btnRemoveSlotPlayer');
const slotTargetInfo = document.getElementById('slotTargetInfo');
const slotCandidateList = document.getElementById('slotCandidateList');

// 버튼들
const btnExportImage = document.getElementById('btnExportImage');
const btnExportExcel = document.getElementById('btnExportExcel');
const btnImportExcel = document.getElementById('btnImportExcel');
const excelFileInput = document.getElementById('excelFileInput');
const btnResetDefault = document.getElementById('btnResetDefault');
const btnClearLineup = document.getElementById('btnClearLineup');

// 실시간 협업 요소
const liveStatusPill = document.getElementById('liveStatusPill');
const liveStatusText = document.getElementById('liveStatusText');
const currentNicknameEl = document.getElementById('currentNickname');
const btnSetNickname = document.getElementById('btnSetNickname');
const btnShareLink = document.getElementById('btnShareLink');
const shareModal = document.getElementById('shareModal');
const btnCloseShareModal = document.getElementById('btnCloseShareModal');
const btnCloseShareModal2 = document.getElementById('btnCloseShareModal2');
const shareNetworkUrl = document.getElementById('shareNetworkUrl');
const shareLocalUrl = document.getElementById('shareLocalUrl');
const btnCopyNetworkUrl = document.getElementById('btnCopyNetworkUrl');
const btnCopyLocalUrl = document.getElementById('btnCopyLocalUrl');
const toastContainer = document.getElementById('toastContainer');

let coachNickname = localStorage.getItem('fc_coach_nickname') || '감독';
let socket = null;

function showToast(message, type = 'info') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast-item ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function initSocket() {
    if (typeof io === 'undefined') {
        console.warn('Socket.IO 라이브러리가 로드되지 않아 오프라인 모드로 동작합니다.');
        return;
    }

    try {
        socket = io();

        socket.on('connect', () => {
            const dot = liveStatusPill?.querySelector('.status-dot');
            if (dot) dot.className = 'status-dot online';
            if (liveStatusText) liveStatusText.textContent = '실시간 연결됨 (온라인)';
        });

        socket.on('disconnect', () => {
            const dot = liveStatusPill?.querySelector('.status-dot');
            if (dot) dot.className = 'status-dot offline';
            if (liveStatusText) liveStatusText.textContent = '연결 끊김 (재접속 중)';
        });

        socket.on('users_count', (data) => {
            if (liveStatusText) liveStatusText.textContent = `실시간 동기화 (${data.count}명 접속)`;
        });

        socket.on('sync_state', (data) => {
            if (data.players) players = data.players;
            if (data.tactics) tactics = data.tactics;
            if (data.users_count && liveStatusText) {
                liveStatusText.textContent = `실시간 동기화 (${data.users_count}명 접속)`;
            }
            if (!selectedPlayer && players.length > 0) {
                selectedPlayer = players[0];
            }
            renderAll();
        });

        socket.on('player_updated', (data) => {
            const p = data.player;
            if (!p) return;
            const idx = players.findIndex(item => item.id === p.id);
            if (idx !== -1) {
                players[idx] = p;
            } else {
                players.push(p);
            }

            if (selectedPlayer && selectedPlayer.id === p.id) {
                selectedPlayer = p;
            }

            renderAll();

            const editor = data.editor || '동료 코치';
            if (editor !== coachNickname) {
                showToast(`⚡ [${editor}]님이 <strong>${p.name}</strong> 선수의 점수를 실시간 수정했습니다!`, 'info');
            }
        });

        socket.on('player_deleted', (data) => {
            const pId = data.player_id;
            players = players.filter(p => p.id !== pId);
            if (selectedPlayer && selectedPlayer.id === pId) {
                selectedPlayer = players[0] || null;
            }
            renderAll();

            const editor = data.editor || '동료 코치';
            if (editor !== coachNickname) {
                showToast(`🗑️ [${editor}]님이 <strong>${data.player_name || '선수'}</strong>를 명단에서 삭제했습니다.`, 'warning');
            }
        });

        socket.on('tactics_updated', (data) => {
            if (data.tactics) {
                tactics = data.tactics;
                if (formationSelect) formationSelect.value = tactics.currentFormation || '4-3-3';
                if (currentFormationLabel) currentFormationLabel.textContent = tactics.currentFormation || '4-3-3';
                renderAll();

                const editor = data.editor || '동료 코치';
                if (editor !== coachNickname) {
                    showToast(`📋 [${editor}]님이 라인업/포메이션을 변경했습니다.`, 'info');
                }
            }
        });

        socket.on('players_imported', (data) => {
            if (data.players) players = data.players;
            if (data.tactics) tactics = data.tactics;
            if (players.length > 0) selectedPlayer = players[0];
            renderAll();

            const editor = data.editor || '동료 코치';
            if (editor !== coachNickname) {
                showToast(`📥 [${editor}]님이 엑셀 명단을 일괄 업데이트했습니다 (${data.count || players.length}명).`, 'info');
            }
        });
    } catch (e) {
        console.error('Socket init error:', e);
    }
}

// 슬라이더 및 포지션 요소
const formPos1 = document.getElementById('formPos1');
const formPos2 = document.getElementById('formPos2');
const formPos3 = document.getElementById('formPos3');
const sliderPac = document.getElementById('sliderPac');
const sliderSho = document.getElementById('sliderSho');
const sliderPas = document.getElementById('sliderPas');
const sliderDri = document.getElementById('sliderDri');
const sliderDef = document.getElementById('sliderDef');
const sliderPhy = document.getElementById('sliderPhy');
const valPac = document.getElementById('valPac');
const valSho = document.getElementById('valSho');
const valPas = document.getElementById('valPas');
const valDri = document.getElementById('valDri');
const valDef = document.getElementById('valDef');
const valPhy = document.getElementById('valPhy');
const formPreviewTotal = document.getElementById('formPreviewTotal');
const formPreviewOvr = document.getElementById('formPreviewOvr');

function getPosCategory(pos) {
    pos = (pos || '').toUpperCase();
    if (['ST', 'CF', 'LW', 'RW'].includes(pos)) return 'pos-fw';
    if (['CAM', 'CM', 'CDM', 'LM', 'RM'].includes(pos)) return 'pos-mf';
    if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(pos)) return 'pos-df';
    if (pos === 'GK') return 'pos-gk';
    return 'pos-mf';
}

function calcPlayerTotal(p) {
    if (p.total_score) return p.total_score;
    const s = p.stats || {};
    return (s.pac || 70) + (s.sho || 70) + (s.pas || 70) + (s.dri || 70) + (s.def || 70) + (s.phy || 70);
}

function calculatePlaystyle(player) {
    const s = player.stats || {};
    const pos = (player.position || '').toUpperCase();
    const statsList = [
        { key: 'PAC', val: s.pac || 70 },
        { key: 'SHO', val: s.sho || 70 },
        { key: 'PAS', val: s.pas || 70 },
        { key: 'DRI', val: s.dri || 70 },
        { key: 'DEF', val: s.def || 70 },
        { key: 'PHY', val: s.phy || 70 }
    ];
    statsList.sort((a, b) => b.val - a.val);

    const minStat = Math.min(...statsList.map(item => item.val));
    const avgStat = statsList.reduce((acc, cur) => acc + cur.val, 0) / 6.0;

    if (minStat >= 74 && avgStat >= 79) {
        return '⭐ 완전체 완성형 육각형';
    }
    if (pos === 'GK') {
        return (s.def >= 85) ? '🧤 통곡의 슈퍼 세이브 GK' : '🧤 든든한 안정형 GK';
    }
    if (statsList[0].key === 'PAC' && statsList[1].key === 'DRI') {
        return '⚡ 폭발적인 스피드 크랙';
    }
    if (statsList[0].key === 'SHO' && statsList[1].key === 'PHY') {
        return '💥 강력한 박스 타깃 폭격수';
    }
    if (statsList[0].key === 'PAS' && (statsList[1].key === 'DRI' || statsList[1].key === 'SHO')) {
        return '🎯 중원 사령관 플레이메이커';
    }
    if (statsList[0].key === 'DEF' && statsList[1].key === 'PHY') {
        return '🛡️ 통곡의 벽 파이터 수비수';
    }
    if (statsList[0].key === 'PAC' && statsList[1].key === 'DEF') {
        return '🚀 기동력 만점 윙백 스피드스터';
    }
    return '⚽ 밸런스형 전술 핵심 자원';
}

let lastStateHash = '';

function checkRemoteChanges() {
    if (document.hidden) return;

    Promise.all([
        fetch('/api/players').then(r => r.json()),
        fetch('/api/tactics').then(r => r.json())
    ]).then(([latestPlayers, latestTactics]) => {
        const newHash = JSON.stringify({
            p: latestPlayers.map(p => ({ id: p.id, ovr: p.ovr, tot: p.total_score, s: p.stats })),
            t: latestTactics.starting11,
            f: latestTactics.currentFormation
        });

        if (lastStateHash && lastStateHash !== newHash) {
            players = latestPlayers;
            tactics = latestTactics;
            if (formationSelect) formationSelect.value = tactics.currentFormation || '4-3-3';
            if (currentFormationLabel) currentFormationLabel.textContent = tactics.currentFormation || '4-3-3';
            if (selectedPlayer) {
                const found = players.find(p => p.id === selectedPlayer.id);
                if (found) selectedPlayer = found;
            }
            renderAll();
            showToast('⚡ 동료 코치의 최신 전술/점수 변경사항이 실시간 동기화되었습니다.', 'info');
        }
        lastStateHash = newHash;
    }).catch(() => {});
}

async function initApp() {
    initRadarChart();
    await loadData();
    setupEventListeners();
    initSocket();
    // Vercel 서버리스 환경 등에서도 끊김 없는 실시간 동기화를 위한 3.5초 스마트 폴링
    setInterval(checkRemoteChanges, 3500);
}

async function loadData() {
    try {
        const [pRes, tRes] = await Promise.all([
            fetch('/api/players'),
            fetch('/api/tactics')
        ]);
        players = await pRes.json();
        tactics = await tRes.json();

        if (!selectedPlayer && players.length > 0) {
            selectedPlayer = players.find(p => p.id === 'p1') || players[0];
        }

        await fetchAiRecommendation();
        renderAll();
    } catch (err) {
        console.error('데이터 로드 실패:', err);
    }
}

async function fetchAiRecommendation() {
    try {
        const formation = tactics.currentFormation || '4-3-3';
        const res = await fetch(`/api/tactics/recommend?formation=${formation}`);
        const data = await res.json();
        if (data.success) {
            aiRecommendedLineup = data.recommended11 || {};
        }
    } catch (err) {
        console.error('AI 추천 로드 실패:', err);
    }
}

function renderAll() {
    renderPitch();
    renderBench();
    renderInspector();
    renderSquadList();
    updateTeamMetrics();
    renderDualView();
}

function initRadarChart() {
    const ctx = document.getElementById('radarChartCanvas').getContext('2d');
    radarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['스피드(PAC)', '슈팅(SHO)', '패스(PAS)', '드리블(DRI)', '수비(DEF)', '피지컬(PHY)'],
            datasets: [{
                label: '능력치',
                data: [75, 75, 75, 75, 75, 75],
                backgroundColor: 'rgba(245, 176, 38, 0.35)',
                borderColor: '#f5b026',
                borderWidth: 2,
                pointBackgroundColor: '#ffd56b',
                pointBorderColor: '#fff',
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: 'rgba(255, 255, 255, 0.15)' },
                    grid: { color: 'rgba(255, 255, 255, 0.12)' },
                    pointLabels: {
                        color: '#d1dcfa',
                        font: { size: 9.5, weight: 'bold' }
                    },
                    suggestedMin: 30,
                    suggestedMax: 100,
                    ticks: {
                        stepSize: 20,
                        color: 'rgba(255, 255, 255, 0.4)',
                        backdropColor: 'transparent',
                        font: { size: 8 }
                    }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function renderPitch() {
    const curFormationKey = tactics.currentFormation || '4-3-3';
    formationSelect.value = curFormationKey;
    const formConfig = tactics.formations[curFormationKey];
    if (!formConfig) return;

    currentFormationLabel.textContent = formConfig.name;
    watermarkFormation.textContent = `${formConfig.name.toUpperCase()} FORMATION`;

    slotsLayer.innerHTML = '';
    const startingMap = tactics.starting11 || {};

    formConfig.slots.forEach(slot => {
        const slotEl = document.createElement('div');
        slotEl.className = 'pitch-slot';
        slotEl.style.left = `${slot.x}%`;
        slotEl.style.top = `${slot.y}%`;
        slotEl.setAttribute('data-slot-id', slot.slotId);

        slotEl.draggable = true;
        slotEl.addEventListener('dragstart', handleDragStart);
        slotEl.addEventListener('dragover', handleDragOver);
        slotEl.addEventListener('drop', handleDrop);

        const assignedPlayerId = startingMap[slot.slotId];
        const player = players.find(p => p.id === assignedPlayerId);
        const posClass = getPosCategory(slot.role);

        if (player) {
            slotEl.innerHTML = `
                <div class="slot-token">
                    <span class="slot-role-badge ${posClass}">${slot.label}</span>
                    <span class="slot-ovr-badge">${player.ovr || 75}</span>
                    <span class="slot-number">${player.back_number || ''}</span>
                </div>
                <div class="slot-name-plate">${player.name}</div>
            `;
            slotEl.onclick = () => {
                selectPlayer(player);
                openSlotSelectModal(slot);
            };
        } else {
            slotEl.innerHTML = `
                <div class="slot-token empty">
                    <span class="slot-role-badge ${posClass}">${slot.label}</span>
                    <span class="slot-empty-icon">+</span>
                </div>
                <div class="slot-name-plate">선수 배치</div>
            `;
            slotEl.onclick = () => openSlotSelectModal(slot);
        }

        slotsLayer.appendChild(slotEl);
    });
}

function renderBench() {
    benchPlayersList.innerHTML = '';
    const startingMap = tactics.starting11 || {};
    const startingIds = new Set(Object.values(startingMap).filter(Boolean));

    const benchList = players.filter(p => !startingIds.has(p.id));
    tactics.substitutes = benchList.map(p => p.id);
    benchCountBadge.textContent = `${benchList.length}명`;

    if (benchList.length === 0) {
        benchPlayersList.innerHTML = '<span style="font-size:11px;color:var(--text-muted);padding:4px;">대기 선수가 없습니다.</span>';
        return;
    }

    benchList.forEach(p => {
        const chip = document.createElement('div');
        chip.className = 'bench-chip';
        chip.draggable = true;
        chip.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'bench', playerId: p.id }));
        });

        const posClass = getPosCategory(p.position);
        const tot = calcPlayerTotal(p);
        chip.innerHTML = `
            <span class="pos ${posClass}">${p.position || 'SUB'}</span>
            <span class="name">#${p.back_number} ${p.name}</span>
            <span class="tot">${tot}점</span>
            <span class="ovr">${p.ovr || 75}</span>
        `;
        chip.onclick = () => selectPlayer(p);
        benchPlayersList.appendChild(chip);
    });
}

// 듀얼 동시 비교 뷰 렌더링
function renderDualView() {
    const curFormationKey = tactics.currentFormation || '4-3-3';
    const formConfig = tactics.formations[curFormationKey];
    if (!formConfig) return;

    userDualSlotsLayer.innerHTML = '';
    aiDualSlotsLayer.innerHTML = '';

    const userMap = tactics.starting11 || {};
    const aiMap = aiRecommendedLineup || {};

    // 1. 감독 직접 배치 구장
    formConfig.slots.forEach(slot => {
        const el = document.createElement('div');
        el.className = 'pitch-slot';
        el.style.left = `${slot.x}%`;
        el.style.top = `${slot.y}%`;
        el.dataset.slotId = slot.slotId;
        el.draggable = true;
        el.addEventListener('dragstart', handleDragStart);
        el.addEventListener('dragover', handleDragOver);
        el.addEventListener('drop', handleDrop);

        const p = players.find(item => item.id === userMap[slot.slotId]);
        const posClass = getPosCategory(slot.role);
        if (p) {
            el.innerHTML = `
                <div class="slot-token">
                    <span class="slot-role-badge ${posClass}">${slot.label}</span>
                    <span class="slot-ovr-badge">${p.ovr}</span>
                    <span class="slot-number">${p.back_number}</span>
                </div>
                <div class="slot-name-plate">${p.name}</div>
            `;
            el.onclick = () => openSlotSelectModal(slot);
        } else {
            el.innerHTML = `
                <div class="slot-token empty">
                    <span class="slot-role-badge ${posClass}">${slot.label}</span>
                    <span class="slot-empty-icon">+</span>
                </div>
                <div class="slot-name-plate">선수 배치</div>
            `;
            el.onclick = () => openSlotSelectModal(slot);
        }
        userDualSlotsLayer.appendChild(el);
    });

    // 2. AI 최적 추천 구장
    formConfig.slots.forEach(slot => {
        const el = document.createElement('div');
        el.className = 'pitch-slot';
        el.style.left = `${slot.x}%`;
        el.style.top = `${slot.y}%`;

        const p = players.find(item => item.id === aiMap[slot.slotId]);
        const posClass = getPosCategory(slot.role);
        if (p) {
            const isNatural = (p.positions || []).includes(slot.role);
            el.innerHTML = `
                <div class="slot-token" style="${isNatural ? 'border-color:#ffd56b;' : ''}">
                    <span class="slot-role-badge ${posClass}">${slot.label}</span>
                    <span class="slot-ovr-badge">${p.ovr}</span>
                    <span class="slot-number">${p.back_number}</span>
                </div>
                <div class="slot-name-plate">${p.name}</div>
            `;
            el.onclick = () => selectPlayer(p);
        } else {
            el.innerHTML = `
                <div class="slot-token empty">
                    <span class="slot-role-badge ${posClass}">${slot.label}</span>
                </div>
                <div class="slot-name-plate">-</div>
            `;
        }
        aiDualSlotsLayer.appendChild(el);
    });

    // 전력 비교 계산
    const getStatsSummary = (map) => {
        const list = formConfig.slots.map(s => players.find(p => p.id === map[s.slotId])).filter(Boolean);
        if (list.length === 0) return { ovr: 0, total: 0, pac: 0, phy: 0, count: 0 };
        const n = list.length;
        return {
            ovr: Math.round(list.reduce((acc, p) => acc + (p.ovr || 70), 0) / n),
            total: list.reduce((acc, p) => acc + calcPlayerTotal(p), 0),
            pac: Math.round(list.reduce((acc, p) => acc + ((p.stats && p.stats.pac) || 70), 0) / n),
            phy: Math.round(list.reduce((acc, p) => acc + ((p.stats && p.stats.phy) || 70), 0) / n),
            count: n
        };
    };

    const userStats = getStatsSummary(userMap);
    const aiStats = getStatsSummary(aiMap);

    dualUserOvr.textContent = `OVR ${userStats.ovr}`;
    dualUserTotal.textContent = `총점 ${userStats.total.toLocaleString()}점 (${userStats.count}/11명)`;
    colUserStats.textContent = `평균 주력: ${userStats.pac} | 평균 체력: ${userStats.phy}`;

    dualAiOvr.textContent = `OVR ${aiStats.ovr}`;
    dualAiTotal.textContent = `총점 ${aiStats.total.toLocaleString()}점 (${aiStats.count}/11명)`;
    colAiStats.textContent = `평균 주력: ${aiStats.pac} | 평균 체력: ${aiStats.phy}`;

    const diffOvr = aiStats.ovr - userStats.ovr;
    const diffTot = aiStats.total - userStats.total;
    if (diffOvr > 0) {
        vsStatsDiff.innerHTML = `AI 라인업이 팀 OVR <b>+${diffOvr}</b> (총점 +${diffTot}점) 더 높습니다`;
    } else if (diffOvr === 0) {
        vsStatsDiff.innerHTML = `감독님 배치와 AI 추천의 종합 OVR이 <b>동일(${userStats.ovr})</b>합니다!`;
    } else {
        vsStatsDiff.innerHTML = `감독님 배치가 AI 추천보다 팀 OVR <b>+${Math.abs(diffOvr)}</b> 더 우수합니다!`;
    }
}

function renderInspector() {
    if (!selectedPlayer) return;

    cardOvr.textContent = selectedPlayer.ovr || 75;
    cardPos.textContent = selectedPlayer.position || 'CM';

    const posList = selectedPlayer.positions || [selectedPlayer.position || 'CM'];
    const subPositions = posList.slice(1);
    cardMultiPos.textContent = subPositions.length > 0 ? subPositions.join(' / ') : '단일 포지션';

    cardName.textContent = selectedPlayer.name || '선수';
    cardNumber.textContent = `#${selectedPlayer.back_number || 0}`;

    const total = calcPlayerTotal(selectedPlayer);
    cardTotalScore.textContent = total;

    const s = selectedPlayer.stats || { pac: 70, sho: 70, pas: 70, dri: 70, def: 70, phy: 70 };
    cStatPac.textContent = s.pac;
    cStatDri.textContent = s.dri;
    cStatSho.textContent = s.sho;
    cStatDef.textContent = s.def;
    cStatPas.textContent = s.pas;
    cStatPhy.textContent = s.phy;

    detailTotalScore.textContent = `${total}점`;
    detailOvr.textContent = selectedPlayer.ovr || 75;
    detailPositions.textContent = posList.join(', ');
    detailFoot.textContent = selectedPlayer.foot || '오른발';
    detailAge.textContent = `${selectedPlayer.age || 30}세`;
    detailNotes.textContent = selectedPlayer.notes || '등록된 감독 메모가 없습니다.';

    playerStyleTag.textContent = calculatePlaystyle(selectedPlayer);

    if (radarChart) {
        radarChart.data.datasets[0].data = [s.pac, s.sho, s.pas, s.dri, s.def, s.phy];
        radarChart.update();
    }
}

function selectPlayer(player) {
    selectedPlayer = player;
    renderInspector();
    highlightSquadItem(player.id);
}

function renderSquadList() {
    totalPlayerCount.textContent = players.length;
    const query = (playerSearchInput.value || '').trim().toLowerCase();
    const activeFilter = document.querySelector('.pill-btn.active')?.dataset.filter || 'ALL';

    squadListContainer.innerHTML = '';

    const filtered = players.filter(p => {
        const matchesQuery = !query || p.name.toLowerCase().includes(query) || (p.back_number && String(p.back_number).includes(query));
        let matchesFilter = true;
        const posArr = p.positions || [p.position];
        if (activeFilter === 'FW') matchesFilter = posArr.some(pos => ['ST', 'CF', 'LW', 'RW'].includes(pos));
        else if (activeFilter === 'MF') matchesFilter = posArr.some(pos => ['CAM', 'CM', 'CDM', 'LM', 'RM'].includes(pos));
        else if (activeFilter === 'DF') matchesFilter = posArr.some(pos => ['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(pos));
        else if (activeFilter === 'GK') matchesFilter = posArr.includes('GK');
        return matchesQuery && matchesFilter;
    });

    if (filtered.length === 0) {
        squadListContainer.innerHTML = '<div style="padding:15px;text-align:center;color:var(--text-muted);font-size:11px;">해당 조건의 선수가 없습니다.</div>';
        return;
    }

    filtered.forEach(p => {
        const item = document.createElement('div');
        item.className = `squad-item ${selectedPlayer && selectedPlayer.id === p.id ? 'selected' : ''}`;
        item.dataset.id = p.id;
        const posClass = getPosCategory(p.position);
        const tot = calcPlayerTotal(p);
        const posDisplay = (p.positions || [p.position]).join('/');

        item.innerHTML = `
            <div class="squad-item-left">
                <span class="squad-item-num">#${p.back_number}</span>
                <div class="squad-item-info">
                    <span class="squad-item-name">${p.name}</span>
                    <span class="squad-item-dept">${p.age}세 · ${p.foot} (${posDisplay})</span>
                </div>
            </div>
            <div class="squad-item-right">
                <span class="squad-item-pos ${posClass}">${p.position}</span>
                <div class="squad-item-scores">
                    <span class="squad-item-tot">${tot}점</span>
                    <span class="squad-item-ovr">${p.ovr}</span>
                </div>
            </div>
        `;
        item.onclick = () => selectPlayer(p);
        squadListContainer.appendChild(item);
    });
}

function highlightSquadItem(playerId) {
    document.querySelectorAll('.squad-item').forEach(el => {
        el.classList.toggle('selected', el.dataset.id === playerId);
    });
}

function updateTeamMetrics() {
    const curFormationKey = tactics.currentFormation || '4-3-3';
    const formConfig = tactics.formations[curFormationKey];
    if (!formConfig) return;

    const startingMap = tactics.starting11 || {};
    const startingPlayers = formConfig.slots
        .map(slot => players.find(p => p.id === startingMap[slot.slotId]))
        .filter(Boolean);

    if (startingPlayers.length === 0) {
        teamOvrEl.textContent = '--';
        teamTotalScoreEl.textContent = '--점';
        teamPacEl.textContent = '--';
        teamShoEl.textContent = '--';
        teamPasEl.textContent = '--';
        teamDriEl.textContent = '--';
        teamDefEl.textContent = '--';
        teamPhyEl.textContent = '--';
        teamAgeEl.textContent = '--세';
        return;
    }

    const n = startingPlayers.length;
    const avg = (fn) => Math.round(startingPlayers.reduce((acc, p) => acc + fn(p), 0) / n);
    const sum = (fn) => startingPlayers.reduce((acc, p) => acc + fn(p), 0);

    teamOvrEl.textContent = avg(p => p.ovr || 70);
    const totalStartingSum = sum(p => calcPlayerTotal(p));
    teamTotalScoreEl.textContent = `${totalStartingSum.toLocaleString()}점`;

    teamPacEl.textContent = avg(p => (p.stats && p.stats.pac) || 70);
    teamShoEl.textContent = avg(p => (p.stats && p.stats.sho) || 70);
    teamPasEl.textContent = avg(p => (p.stats && p.stats.pas) || 70);
    teamDriEl.textContent = avg(p => (p.stats && p.stats.dri) || 70);
    teamDefEl.textContent = avg(p => (p.stats && p.stats.def) || 70);
    teamPhyEl.textContent = avg(p => (p.stats && p.stats.phy) || 70);
    teamAgeEl.textContent = `${avg(p => p.age || 30)}세`;
}

// 드래그 앤 드롭
let draggedData = null;
function handleDragStart(e) {
    const slotId = this.dataset.slotId;
    const playerId = tactics.starting11[slotId];
    if (!playerId) {
        e.preventDefault();
        return;
    }
    draggedData = { type: 'slot', slotId, playerId };
    e.dataTransfer.setData('text/plain', JSON.stringify(draggedData));
}

function handleDragOver(e) {
    e.preventDefault();
}

async function handleDrop(e) {
    e.preventDefault();
    const targetSlotId = this.dataset.slotId;
    try {
        const raw = e.dataTransfer.getData('text/plain');
        if (!raw) return;
        const data = JSON.parse(raw);

        if (data.type === 'slot') {
            const sourceSlotId = data.slotId;
            if (sourceSlotId === targetSlotId) return;

            const sourcePlayer = tactics.starting11[sourceSlotId];
            const targetPlayer = tactics.starting11[targetSlotId];
            tactics.starting11[sourceSlotId] = targetPlayer;
            tactics.starting11[targetSlotId] = sourcePlayer;
        } else if (data.type === 'bench') {
            const benchPlayerId = data.playerId;
            for (const [sId, pId] of Object.entries(tactics.starting11)) {
                if (pId === benchPlayerId) tactics.starting11[sId] = null;
            }
            tactics.starting11[targetSlotId] = benchPlayerId;
        }

        await saveTacticsToServer();
        renderAll();
    } catch (err) {
        console.error('드롭 처리 실패:', err);
    }
}

function openSlotSelectModal(slot) {
    selectedSlotId = slot.slotId;
    slotTargetInfo.textContent = `선택한 위치: [${slot.label}] (${slot.role} 역할)`;

    const startingMap = tactics.starting11 || {};
    const currentAssignedId = startingMap[slot.slotId];

    slotCandidateList.innerHTML = '';

    const sorted = [...players].sort((a, b) => {
        const aPositions = a.positions || [a.position];
        const bPositions = b.positions || [b.position];
        const aMatch = aPositions.includes(slot.role) ? 1 : 0;
        const bMatch = bPositions.includes(slot.role) ? 1 : 0;
        if (aMatch !== bMatch) return bMatch - aMatch;
        return (calcPlayerTotal(b)) - (calcPlayerTotal(a));
    });

    sorted.forEach(p => {
        const item = document.createElement('div');
        const isCurrent = p.id === currentAssignedId;
        const isAlreadyStarting = Object.values(startingMap).includes(p.id) && !isCurrent;
        const isNatural = (p.positions || [p.position]).includes(slot.role);

        item.className = `slot-candidate-item ${isAlreadyStarting ? 'already-starting' : ''}`;
        const posClass = getPosCategory(p.position);
        const tot = calcPlayerTotal(p);
        const posDisplay = (p.positions || [p.position]).join('/');

        item.innerHTML = `
            <div>
                <span class="badge ${posClass}" style="padding:2px 5px;border-radius:3px;font-size:9px;color:#fff;">${posDisplay}</span>
                <strong style="margin-left:5px;font-size:12px;color:#fff;">#${p.back_number} ${p.name}</strong>
                <span style="font-size:10px;color:var(--text-muted);margin-left:4px;">(${p.age}세, ${p.foot})</span>
                ${isNatural ? '<span style="color:#2ecc71;font-size:10px;font-weight:bold;margin-left:4px;">[포지션 일치]</span>' : ''}
                ${isCurrent ? '<span style="color:var(--accent-gold);font-size:10px;font-weight:bold;margin-left:4px;">[현재 배치됨]</span>' : ''}
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;">
                <span style="font-size:10px;font-weight:700;color:var(--accent-gold-light);">${tot}점</span>
                <span style="font-size:13px;font-weight:900;color:var(--accent-gold);">${p.ovr}</span>
            </div>
        `;

        item.onclick = async () => {
            for (const [sId, pId] of Object.entries(tactics.starting11)) {
                if (pId === p.id && sId !== selectedSlotId) {
                    tactics.starting11[sId] = currentAssignedId;
                }
            }
            tactics.starting11[selectedSlotId] = p.id;
            await saveTacticsToServer();
            slotSelectModal.style.display = 'none';
            selectPlayer(p);
            renderAll();
        };

        slotCandidateList.appendChild(item);
    });

    slotSelectModal.style.display = 'flex';
}

async function saveTacticsToServer() {
    try {
        await fetch('/api/tactics', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Editor-Name': encodeURIComponent(coachNickname)
            },
            body: JSON.stringify(tactics)
        });
    } catch (err) {
        console.error('전술 저장 실패:', err);
    }
}

function updateFormOvrPreview() {
    const pac = parseInt(sliderPac.value);
    const sho = parseInt(sliderSho.value);
    const pas = parseInt(sliderPas.value);
    const dri = parseInt(sliderDri.value);
    const def = parseInt(sliderDef.value);
    const phy = parseInt(sliderPhy.value);
    const pos = formPos1.value;

    valPac.textContent = pac;
    valSho.textContent = sho;
    valPas.textContent = pas;
    valDri.textContent = dri;
    valDef.textContent = def;
    valPhy.textContent = phy;

    const total = pac + sho + pas + dri + def + phy;
    formPreviewTotal.textContent = total;

    let ovr = 75;
    if (['ST', 'CF'].includes(pos)) {
        ovr = sho * 0.35 + pac * 0.25 + phy * 0.15 + dri * 0.15 + pas * 0.10;
    } else if (['LW', 'RW'].includes(pos)) {
        ovr = pac * 0.30 + dri * 0.25 + pas * 0.20 + sho * 0.15 + phy * 0.10;
    } else if (['CAM'].includes(pos)) {
        ovr = pas * 0.30 + dri * 0.25 + sho * 0.20 + pac * 0.15 + phy * 0.10;
    } else if (['CM'].includes(pos)) {
        ovr = pas * 0.25 + dri * 0.20 + phy * 0.20 + def * 0.15 + sho * 0.10 + pac * 0.10;
    } else if (['CDM'].includes(pos)) {
        ovr = def * 0.30 + phy * 0.25 + pas * 0.20 + dri * 0.10 + pac * 0.10 + sho * 0.05;
    } else if (['CB'].includes(pos)) {
        ovr = def * 0.40 + phy * 0.30 + pac * 0.15 + pas * 0.10 + dri * 0.05;
    } else if (['LB', 'RB'].includes(pos)) {
        ovr = pac * 0.25 + def * 0.25 + phy * 0.20 + pas * 0.15 + dri * 0.15;
    } else if (pos === 'GK') {
        ovr = def * 0.35 + phy * 0.25 + pac * 0.15 + pas * 0.15 + dri * 0.10;
    } else {
        ovr = total / 6.0;
    }
    formPreviewOvr.textContent = Math.round(ovr);
}

function openPlayerModal(playerToEdit = null) {
    playerForm.reset();
    if (playerToEdit) {
        modalTitle.textContent = '선수 정보 & 능력치 (포지션 최대 3개)';
        document.getElementById('formPlayerId').value = playerToEdit.id;
        document.getElementById('formBackNumber').value = playerToEdit.back_number;
        document.getElementById('formName').value = playerToEdit.name;
        document.getElementById('formAge').value = playerToEdit.age || 30;
        document.getElementById('formFoot').value = playerToEdit.foot || '오른발';
        document.getElementById('formNotes').value = playerToEdit.notes || '';

        const posList = playerToEdit.positions || [playerToEdit.position || 'CM'];
        formPos1.value = posList[0] || 'CM';
        formPos2.value = posList[1] || '';
        formPos3.value = posList[2] || '';

        const s = playerToEdit.stats || {};
        sliderPac.value = s.pac || 75;
        sliderSho.value = s.sho || 75;
        sliderPas.value = s.pas || 75;
        sliderDri.value = s.dri || 75;
        sliderDef.value = s.def || 75;
        sliderPhy.value = s.phy || 75;
    } else {
        modalTitle.textContent = '신규 선수 등록 & 육각형 설정 (포지션 최대 3개)';
        document.getElementById('formPlayerId').value = '';
        document.getElementById('formBackNumber').value = players.length + 1;
        document.getElementById('formAge').value = 32;
        formPos1.value = 'CM';
        formPos2.value = '';
        formPos3.value = '';
        sliderPac.value = 75;
        sliderSho.value = 75;
        sliderPas.value = 75;
        sliderDri.value = 75;
        sliderDef.value = 75;
        sliderPhy.value = 75;
    }
    updateFormOvrPreview();
    playerModal.style.display = 'flex';
}

function setupEventListeners() {
    // 뷰 모드 전환 (단일 상세 뷰 vs 감독-AI 동시 비교 뷰)
    btnViewSingle.addEventListener('click', () => {
        currentViewMode = 'single';
        btnViewSingle.classList.add('active');
        btnViewDual.classList.remove('active');
        singleViewLayout.style.display = 'grid';
        singleMetricsBar.style.display = 'flex';
        dualCompareLayout.style.display = 'none';
        renderAll();
    });

    btnViewDual.addEventListener('click', () => {
        currentViewMode = 'dual';
        btnViewDual.classList.add('active');
        btnViewSingle.classList.remove('active');
        singleViewLayout.style.display = 'none';
        singleMetricsBar.style.display = 'none';
        dualCompareLayout.style.display = 'flex';
        renderDualView();
    });

    // AI 추천을 감독 라인업으로 복사 적용
    btnApplyAiToUser.addEventListener('click', async () => {
        if (!aiRecommendedLineup || Object.keys(aiRecommendedLineup).length === 0) {
            alert('AI 추천 라인업이 아직 생성되지 않았습니다.');
            return;
        }
        if (confirm('AI가 추천한 최적 라인업을 감독님의 라인업으로 그대로 적용하시겠습니까?')) {
            tactics.starting11 = { ...aiRecommendedLineup };
            await saveTacticsToServer();
            renderAll();
            alert('AI 추천 라인업이 감독님 라인업으로 완벽하게 적용되었습니다!');
        }
    });

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });

    formationSelect.addEventListener('change', async (e) => {
        tactics.currentFormation = e.target.value;
        await saveTacticsToServer();
        await fetchAiRecommendation();
        renderAll();
    });

    playerSearchInput.addEventListener('input', renderSquadList);
    pillBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            pillBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderSquadList();
        });
    });

    [sliderPac, sliderSho, sliderPas, sliderDri, sliderDef, sliderPhy, formPos1].forEach(el => {
        el.addEventListener('input', updateFormOvrPreview);
    });

    btnAddNewPlayer.addEventListener('click', () => openPlayerModal());
    btnEditCurrentPlayer.addEventListener('click', () => {
        if (selectedPlayer) openPlayerModal(selectedPlayer);
    });
    btnClosePlayerModal.addEventListener('click', () => playerModal.style.display = 'none');
    btnCancelPlayerModal.addEventListener('click', () => playerModal.style.display = 'none');

    btnCloseSlotModal.addEventListener('click', () => slotSelectModal.style.display = 'none');
    btnCloseSlotModal2.addEventListener('click', () => slotSelectModal.style.display = 'none');
    btnRemoveSlotPlayer.addEventListener('click', async () => {
        if (selectedSlotId) {
            tactics.starting11[selectedSlotId] = null;
            await saveTacticsToServer();
            slotSelectModal.style.display = 'none';
            renderAll();
        }
    });

    btnClearLineup.addEventListener('click', async () => {
        if (confirm('현재 선발 11명 라인업을 모두 비우시겠습니까?')) {
            tactics.starting11 = {};
            await saveTacticsToServer();
            renderAll();
        }
    });

    playerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const playerId = document.getElementById('formPlayerId').value;
        const pac = parseInt(sliderPac.value);
        const sho = parseInt(sliderSho.value);
        const pas = parseInt(sliderPas.value);
        const dri = parseInt(sliderDri.value);
        const def = parseInt(sliderDef.value);
        const phy = parseInt(sliderPhy.value);

        const positions = [formPos1.value, formPos2.value, formPos3.value].filter(Boolean);

        const payload = {
            id: playerId || null,
            back_number: parseInt(document.getElementById('formBackNumber').value),
            name: document.getElementById('formName').value.trim(),
            age: parseInt(document.getElementById('formAge').value),
            positions: positions,
            position: positions[0] || 'CM',
            foot: document.getElementById('formFoot').value,
            notes: document.getElementById('formNotes').value.trim(),
            stats: { pac, sho, pas, dri, def, phy },
            total_score: pac + sho + pas + dri + def + phy
        };

        try {
            const res = await fetch('/api/players', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Editor-Name': encodeURIComponent(coachNickname)
                },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.success) {
                playerModal.style.display = 'none';
                await loadData();
                selectPlayer(result.player);
            }
        } catch (err) {
            alert('선수 저장 중 오류가 발생했습니다.');
        }
    });

    btnExportImage.addEventListener('click', async () => {
        const captureTarget = currentViewMode === 'dual' ? dualCompareLayout : document.getElementById('captureArea');
        const watermark = captureTarget.querySelector?.('.capture-watermark');
        if (watermark) watermark.style.display = 'flex';

        btnExportImage.disabled = true;
        btnExportImage.textContent = '📸 생성 중...';

        try {
            const canvas = await html2canvas(captureTarget, {
                backgroundColor: '#0f1626',
                scale: 2,
                logging: false
            });
            const link = document.createElement('a');
            link.download = `부산시청_축구회_${tactics.currentFormation}_${currentViewMode === 'dual' ? '동시비교' : '라인업'}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error('이미지 저장 오류:', err);
            alert('이미지 생성에 실패했습니다.');
        } finally {
            if (watermark) watermark.style.display = 'none';
            btnExportImage.disabled = false;
            btnExportImage.textContent = '📸 이미지 저장';
        }
    });

    btnExportExcel.addEventListener('click', () => {
        window.location.href = '/api/export-excel';
    });

    btnImportExcel.addEventListener('click', () => {
        excelFileInput.click();
    });

    excelFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/import-excel', {
                method: 'POST',
                headers: {
                    'X-Editor-Name': encodeURIComponent(coachNickname)
                },
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                alert(`총 ${data.count}명의 선수(최대 3개 포지션)와 점수가 성공적으로 등록되었습니다!`);
                await loadData();
            } else {
                alert('엑셀 가져오기 실패: ' + (data.error || '알 수 없는 오류'));
            }
        } catch (err) {
            alert('업로드 중 통신 오류가 발생했습니다.');
        } finally {
            excelFileInput.value = '';
        }
    });

    btnResetDefault.addEventListener('click', async () => {
        if (confirm('초기 부산시청 선수단 18명 및 기본 포메이션으로 복원하시겠습니까?\\n(현재 수정한 데이터가 기본값으로 덮어씌워집니다)')) {
            try {
                const res = await fetch('/api/reset-default', {
                    method: 'POST',
                    headers: {
                        'X-Editor-Name': encodeURIComponent(coachNickname)
                    }
                });
                const data = await res.json();
                if (data.success) {
                    await loadData();
                    alert('초기 데이터로 복원되었습니다.');
                }
            } catch (err) {
                alert('초기화 실패');
            }
        }
    });

    // 실시간 협업 닉네임 & 접속 공유 이벤트
    if (currentNicknameEl) currentNicknameEl.textContent = coachNickname;

    btnSetNickname?.addEventListener('click', () => {
        const name = prompt('실시간 협업 시 표시할 내 호칭/닉네임을 입력하세요:', coachNickname);
        if (name && name.trim()) {
            coachNickname = name.trim();
            localStorage.setItem('fc_coach_nickname', coachNickname);
            if (currentNicknameEl) currentNicknameEl.textContent = coachNickname;
            showToast(`내 호칭이 [${coachNickname}]으로 변경되었습니다.`, 'info');
        }
    });

    btnShareLink?.addEventListener('click', async () => {
        try {
            const res = await fetch('/api/server-info');
            const data = await res.json();
            if (shareNetworkUrl) shareNetworkUrl.value = data.network_url;
            if (shareLocalUrl) shareLocalUrl.value = data.local_url;
        } catch (e) {
            if (shareNetworkUrl) shareNetworkUrl.value = window.location.href;
            if (shareLocalUrl) shareLocalUrl.value = window.location.origin;
        }
        if (shareModal) shareModal.style.display = 'flex';
    });

    btnCloseShareModal?.addEventListener('click', () => { if (shareModal) shareModal.style.display = 'none'; });
    btnCloseShareModal2?.addEventListener('click', () => { if (shareModal) shareModal.style.display = 'none'; });

    btnCopyNetworkUrl?.addEventListener('click', () => {
        if (shareNetworkUrl && shareNetworkUrl.value) {
            navigator.clipboard.writeText(shareNetworkUrl.value).then(() => {
                showToast('📋 동료 접속 네트워크 주소가 복사되었습니다! 카톡이나 메신저로 전달하세요.', 'info');
            });
        }
    });

    btnCopyLocalUrl?.addEventListener('click', () => {
        if (shareLocalUrl && shareLocalUrl.value) {
            navigator.clipboard.writeText(shareLocalUrl.value).then(() => {
                showToast('📋 로컬 주소가 복사되었습니다!', 'info');
            });
        }
    });
}

window.addEventListener('DOMContentLoaded', initApp);
