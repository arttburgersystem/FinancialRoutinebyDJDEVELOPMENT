// ── IMPORTAR EXTRATO COM IA (Claude Vision) ───────────────────────────────────

var _importarPasteHandler = null;

function _importarRemovePaste() {
  if (_importarPasteHandler) {
    document.removeEventListener('paste', _importarPasteHandler);
    _importarPasteHandler = null;
  }
}

function _importarAbrir() {
  setState({ importarExtratoModal: { step: 'upload', imagemBase64: null, imagemType: null, transacoes: [], erro: null } });
}

function renderImportarExtratoModal() {
  if (!state.importarExtratoModal) { _importarRemovePaste(); return null; }
  var m = state.importarExtratoModal;
  var pf = state.profile;

  function fechar() { _importarRemovePaste(); setState({ importarExtratoModal: null }); }
  function setM(patch) { Object.assign(state.importarExtratoModal, patch); render(); }

  function analisarImagem() {
    var apiKey = lsGet('anthropicApiKey', '');
    if (!apiKey) { setM({ erro: 'Informe a chave de API Anthropic acima.' }); return; }
    setM({ step: 'analisando', erro: null });

    var prompt = 'Este é um print de extrato bancário ou lista de transações financeiras. ' +
      'Extraia TODAS as transações visíveis na imagem. ' +
      'Retorne SOMENTE um JSON array sem markdown, sem texto adicional, exatamente neste formato: ' +
      '[{"nome":"descrição limpa sem valores","valor":38.54,"tipo":"debito","categoria":"Empréstimo","data":"2026-07-01"}] ' +
      'Regras: valor sempre positivo com ponto decimal; tipo="debito" para saídas/despesas (-), "credito" para entradas (+); ' +
      'data formato YYYY-MM-DD (se não visível use ' + today() + '); ' +
      'nome: texto limpo sem símbolos monetários; categoria sugerida em português.';

    fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: m.imagemType, data: m.imagemBase64 } },
          { type: 'text', text: prompt },
        ]}],
      }),
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.error) throw new Error(data.error.message || 'Erro na API');
      var texto = (data.content[0].text || '').trim()
        .replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      var transacoes = JSON.parse(texto).map(function(t, i) {
        return Object.assign({ incluir: true, _idx: i }, t);
      });
      setM({ step: 'confirmar', transacoes: transacoes, erro: null });
    })
    .catch(function(e) {
      setM({ step: 'upload', erro: 'Erro ao analisar: ' + (e.message || 'tente novamente') });
    });
  }

  function salvarTransacoes() {
    var sel = (m.transacoes || []).filter(function(t) { return t.incluir; });
    if (!sel.length) return;
    var novas = sel.map(function(t) {
      return {
        id: uid(), profile: pf,
        tipo: t.tipo === 'credito' ? 'receber' : 'pagar',
        descricao: t.nome,
        valor: Math.abs(parseFloat(String(t.valor || 0).replace(',', '.')) || 0),
        vencimento: t.data || today(),
        status: 'pendente',
        categoria: t.categoria || '',
        recorrente: false, recorrencia_id: '',
        obs: 'Importado via extrato · ' + new Date().toLocaleDateString('pt-BR'),
        criadoEm: new Date().toISOString(),
      };
    });
    var contas = (state.contas || []).concat(novas);
    lsSet('contas', contas);
    _importarRemovePaste();
    setState({ contas: contas, importarExtratoModal: null });
    scheduleSave();
    showToast(novas.length + ' lançamento' + (novas.length > 1 ? 's' : '') + ' importado' + (novas.length > 1 ? 's' : '') + '!', 'success');
  }

  var overlay = div('modal-overlay', []);
  overlay.onclick = function(e) { if (e.target === overlay) fechar(); };

  var modal = el('div', { class: 'modal', style: { maxWidth: '600px', maxHeight: '88vh', overflowY: 'auto' } });

  modal.appendChild(div('modal-title', [
    el('span', {}, '📸 Importar Extrato com IA'),
    btn('modal-close', '×', fechar),
  ]));

  var body = el('div', { style: { padding: '0 24px 24px' } });

  // ── Chave de API ──────────────────────────────────────────────────────────────
  var savedKey = lsGet('anthropicApiKey', '');
  var apiRow = el('div', { style: { marginBottom: '16px' } });
  var apiLbl = el('label', { style: {
    fontSize: '11px', color: 'var(--text3)', fontWeight: '700',
    display: 'block', marginBottom: '4px', letterSpacing: '.3px', textTransform: 'uppercase',
  }}, '🔑 Chave de API Anthropic');
  var apiHint = el('div', { style: { fontSize: '11px', color: 'var(--text3)', marginBottom: '6px' } },
    'Salva localmente no navegador. Obtenha em console.anthropic.com/settings/keys');
  var apiInp = el('input', { class: 'form-input', type: 'password', placeholder: 'sk-ant-api03-...' });
  apiInp.value = savedKey;
  apiInp.style.fontFamily = 'monospace';
  apiInp.style.fontSize = '12px';
  apiInp.oninput = function() { lsSet('anthropicApiKey', apiInp.value.trim()); };
  apiRow.appendChild(apiLbl);
  apiRow.appendChild(apiHint);
  apiRow.appendChild(apiInp);
  body.appendChild(apiRow);

  // ── Erro ──────────────────────────────────────────────────────────────────────
  if (m.erro) {
    body.appendChild(el('div', { style: {
      background: 'rgba(224,82,82,.1)', border: '1px solid var(--red)', borderRadius: '8px',
      padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: 'var(--red)',
    }}, '✕ ' + m.erro));
  }

  // ── Step: upload ──────────────────────────────────────────────────────────────
  if (m.step === 'upload') {
    if (m.imagemBase64) {
      // Preview da imagem capturada
      var prevImg = el('img', {});
      prevImg.src = 'data:' + m.imagemType + ';base64,' + m.imagemBase64;
      prevImg.style.cssText = 'width:100%;border-radius:8px;margin-bottom:12px;border:1px solid var(--border);max-height:220px;object-fit:contain;background:var(--bg3);';
      body.appendChild(prevImg);
      body.appendChild(el('div', { style: { display: 'flex', gap: '8px', marginBottom: '16px' } }, [
        btn('btn-primary', '🤖 Analisar com IA', analisarImagem),
        btn('btn-ghost', '✕ Trocar imagem', function() { setM({ imagemBase64: null, imagemType: null }); }),
      ]));
    } else {
      // Drop zone
      var dz = el('div', {});
      dz.style.cssText = [
        'border:2px dashed var(--border2);border-radius:12px;padding:48px 24px;text-align:center;',
        'background:var(--bg3);margin-bottom:16px;cursor:pointer;transition:border-color .2s,background .2s;',
      ].join('');
      dz.innerHTML =
        '<div style="font-size:44px;margin-bottom:12px">📋</div>' +
        '<div style="font-weight:700;font-size:15px;color:var(--text);margin-bottom:6px">Cole o print aqui (Ctrl+V)</div>' +
        '<div style="font-size:12px;color:var(--text3)">ou clique para fazer upload da imagem</div>';
      dz.onmouseenter = function() { dz.style.borderColor = 'var(--gold)'; dz.style.background = 'var(--gold-dim)'; };
      dz.onmouseleave = function() { dz.style.borderColor = 'var(--border2)'; dz.style.background = 'var(--bg3)'; };

      var fi = el('input', { type: 'file', accept: 'image/*' });
      fi.style.display = 'none';
      fi.onchange = function() {
        var f = fi.files[0]; if (!f) return;
        var r = new FileReader();
        r.onload = function(ev) {
          setM({ imagemBase64: ev.target.result.split(',')[1], imagemType: f.type || 'image/png' });
        };
        r.readAsDataURL(f);
      };
      dz.onclick = function() { fi.click(); };
      body.appendChild(dz);
      body.appendChild(fi);

      // Listener de paste (Ctrl+V)
      _importarRemovePaste();
      _importarPasteHandler = function(e) {
        if (!state.importarExtratoModal) { _importarRemovePaste(); return; }
        var items = e.clipboardData && e.clipboardData.items;
        if (!items) return;
        for (var i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            var blob = items[i].getAsFile();
            var rd = new FileReader();
            rd.onload = function(ev) {
              setM({ imagemBase64: ev.target.result.split(',')[1], imagemType: blob.type || 'image/png' });
            };
            rd.readAsDataURL(blob);
            e.preventDefault();
            break;
          }
        }
      };
      document.addEventListener('paste', _importarPasteHandler);
    }

  // ── Step: analisando ──────────────────────────────────────────────────────────
  } else if (m.step === 'analisando') {
    body.appendChild(el('div', { style: { textAlign: 'center', padding: '52px 24px' } }, [
      el('div', { style: { fontSize: '40px', marginBottom: '14px' } }, '🤖'),
      el('div', { style: { fontWeight: '700', fontSize: '15px', color: 'var(--text)', marginBottom: '6px' } }, 'Analisando com Claude IA...'),
      el('div', { style: { fontSize: '12px', color: 'var(--text3)' } }, 'Identificando lançamentos no extrato, aguarde alguns segundos'),
    ]));

  // ── Step: confirmar ───────────────────────────────────────────────────────────
  } else if (m.step === 'confirmar') {
    var trans = m.transacoes || [];
    var nSel = trans.filter(function(t) { return t.incluir; }).length;

    // Resumo
    var nDeb = trans.filter(function(t){ return t.tipo !== 'credito'; }).length;
    var nCred = trans.filter(function(t){ return t.tipo === 'credito'; }).length;
    body.appendChild(el('div', { style: {
      display: 'flex', gap: '12px', marginBottom: '14px', padding: '12px 14px',
      background: 'var(--bg3)', borderRadius: '8px', border: '1px solid var(--border)',
    }}, [
      el('div', { style: { flex: '1', textAlign: 'center' } }, [
        el('div', { style: { fontWeight: '800', fontSize: '18px', color: 'var(--text)' } }, String(trans.length)),
        el('div', { style: { fontSize: '11px', color: 'var(--text3)' } }, 'Detectadas'),
      ]),
      el('div', { style: { flex: '1', textAlign: 'center' } }, [
        el('div', { style: { fontWeight: '800', fontSize: '18px', color: 'var(--red)' } }, String(nDeb)),
        el('div', { style: { fontSize: '11px', color: 'var(--text3)' } }, 'Saídas'),
      ]),
      el('div', { style: { flex: '1', textAlign: 'center' } }, [
        el('div', { style: { fontWeight: '800', fontSize: '18px', color: 'var(--green)' } }, String(nCred)),
        el('div', { style: { fontSize: '11px', color: 'var(--text3)' } }, 'Entradas'),
      ]),
    ]));

    body.appendChild(el('div', { style: { fontSize: '12px', color: 'var(--text3)', marginBottom: '10px' } },
      'Revise os lançamentos detectados. Desmarque os que não deseja importar:'));

    trans.forEach(function(t, idx) {
      var tipoColor = t.tipo === 'credito' ? 'var(--green)' : 'var(--red)';
      var vStr = parseFloat(String(t.valor || 0).replace(',', '.')).toFixed(2).replace('.', ',');
      var row = el('div', { style: {
        display: 'flex', alignItems: 'center', gap: '10px',
        background: 'var(--bg3)', borderRadius: '8px', padding: '10px 12px', marginBottom: '6px',
        border: '1px solid ' + (t.incluir ? 'var(--border2)' : 'transparent'),
        opacity: t.incluir ? '1' : '.35', transition: 'opacity .2s',
      }});
      var chk = el('input', { type: 'checkbox' });
      chk.checked = t.incluir;
      chk.style.cursor = 'pointer';
      chk.onchange = function() { m.transacoes[idx].incluir = chk.checked; render(); };
      row.appendChild(chk);
      row.appendChild(el('div', { style: { flex: '1', minWidth: '0' } }, [
        el('div', { style: { fontWeight: '600', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, t.nome || '—'),
        el('div', { style: { fontSize: '11px', color: 'var(--text3)' } },
          [t.categoria, t.data, t.tipo === 'credito' ? 'Entrada' : 'Saída'].filter(Boolean).join(' · ')),
      ]));
      row.appendChild(el('div', { style: { fontWeight: '700', color: tipoColor, fontSize: '14px', whiteSpace: 'nowrap' } },
        (t.tipo === 'credito' ? '+' : '−') + ' R$ ' + vStr));
      body.appendChild(row);
    });

    body.appendChild(el('div', { style: { display: 'flex', gap: '8px', marginTop: '16px' } }, [
      btn('btn-ghost', '← Novo extrato', function() {
        setM({ step: 'upload', imagemBase64: null, imagemType: null, transacoes: [], erro: null });
      }),
      btn('btn-primary', '💾 Importar ' + nSel + ' lançamento' + (nSel !== 1 ? 's' : ''), salvarTransacoes),
    ]));
  }

  modal.appendChild(body);
  overlay.appendChild(modal);
  return overlay;
}
