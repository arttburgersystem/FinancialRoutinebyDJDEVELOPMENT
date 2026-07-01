// ── IMPORTAR EXTRATO — OCR LOCAL com Tesseract.js (gratuito, sem API) ─────────

var _importarPasteHandler = null;

function _importarRemovePaste() {
  if (_importarPasteHandler) {
    document.removeEventListener('paste', _importarPasteHandler);
    _importarPasteHandler = null;
  }
}

// Carrega Tesseract.js do CDN apenas quando o módulo for aberto pela 1ª vez
function _importarCarregarTesseract(cb) {
  if (window.Tesseract) { cb(); return; }
  if (window._tessLoading) { var t=setInterval(function(){if(window.Tesseract){clearInterval(t);cb();}},200); return; }
  window._tessLoading = true;
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
  s.onload = function() { window._tessLoading = false; cb(); };
  s.onerror = function() { window._tessLoading = false; showToast('Erro ao carregar OCR', 'error'); };
  document.head.appendChild(s);
}

function _importarAbrir() {
  setState({ importarExtratoModal: { step: 'upload', imagemBase64: null, imagemType: null, transacoes: [], textoOcr: '', erro: null } });
  _importarCarregarTesseract(function() {});
}

// ── Parser: extrai transações do texto bruto do OCR ──────────────────────────
function _importarParseTexto(texto) {
  var linhas = texto.split('\n').map(function(l) { return l.trim(); }).filter(Boolean);
  var transacoes = [];

  // Detecta linha contendo valor monetário: -R$ 1.234,56 ou R$ 38,54 etc.
  var reMonet = /[-+]?\s*R?\$?\s*\d{1,3}(?:[.\s]\d{3})*[,]\d{2}/;

  function extrairValor(txt) {
    var m = txt.match(/([-+])?\s*R?\$?\s*([\d.]+)[,](\d{2})/);
    if (!m) return null;
    var val = parseFloat(m[2].replace(/\./g, '') + '.' + m[3]);
    return { valor: val, negativo: m[1] === '-' };
  }

  for (var i = 0; i < linhas.length; i++) {
    var linha = linhas[i];
    if (!reMonet.test(linha)) continue;

    var pv = extrairValor(linha);
    if (!pv || pv.valor <= 0 || pv.valor > 500000) continue;

    // Descrição: texto na mesma linha antes do valor
    var nome = linha.replace(reMonet, '').replace(/^[|\-\s•·]+/, '').trim();

    // Se a descrição ficou vazia, busca na linha anterior (valor estava sozinho)
    if (nome.length < 3) {
      for (var j = i - 1; j >= Math.max(0, i - 2); j--) {
        if (!reMonet.test(linhas[j]) && linhas[j].length >= 3) {
          nome = linhas[j]; break;
        }
      }
    }
    if (nome.length < 2) nome = 'Transação';

    // Categoria: linha seguinte sem valor monetário
    var categoria = '';
    if (i + 1 < linhas.length && !reMonet.test(linhas[i + 1])) {
      var prox = linhas[i + 1];
      if (prox.length >= 3 && prox.length <= 80) categoria = prox;
    }

    transacoes.push({
      nome: nome.substring(0, 80),
      valor: Math.round(pv.valor * 100) / 100,
      tipo: pv.negativo ? 'debito' : 'credito',
      categoria: categoria,
      data: today(),
      incluir: true,
      _idx: transacoes.length,
    });
  }

  return transacoes;
}

// ── Modal principal ───────────────────────────────────────────────────────────
function renderImportarExtratoModal() {
  if (!state.importarExtratoModal) { _importarRemovePaste(); return null; }
  var m = state.importarExtratoModal;
  var pf = state.profile;

  function fechar() { _importarRemovePaste(); setState({ importarExtratoModal: null }); }
  function setM(patch) { Object.assign(state.importarExtratoModal, patch); render(); }

  function analisarImagem() {
    if (!window.Tesseract) {
      setM({ erro: 'OCR ainda carregando, aguarde alguns segundos e tente novamente.' }); return;
    }
    setM({ step: 'analisando', erro: null });

    var dataUrl = 'data:' + m.imagemType + ';base64,' + m.imagemBase64;

    Tesseract.recognize(dataUrl, 'por+eng', {
      logger: function(info) {
        if (info.status === 'recognizing text' && state.importarExtratoModal) {
          state.importarExtratoModal._pct = Math.round((info.progress || 0) * 100);
        }
      },
    }).then(function(result) {
      var texto = result.data.text;
      var transacoes = _importarParseTexto(texto);
      if (!transacoes.length) {
        setM({ step: 'upload', textoOcr: texto, erro: 'Nenhum valor encontrado. Tente uma imagem mais nítida ou com contraste maior.' });
      } else {
        setM({ step: 'confirmar', transacoes: transacoes, textoOcr: texto, erro: null });
      }
    }).catch(function(e) {
      setM({ step: 'upload', erro: 'Erro no OCR: ' + (e.message || 'tente com imagem mais nítida') });
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
        valor: t.valor,
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

  function capturarImagem(blob) {
    var rd = new FileReader();
    rd.onload = function(ev) {
      setM({ imagemBase64: ev.target.result.split(',')[1], imagemType: blob.type || 'image/png' });
    };
    rd.readAsDataURL(blob);
  }

  // ── Layout ────────────────────────────────────────────────────────────────────
  var overlay = div('modal-overlay', []);
  overlay.onclick = function(e) { if (e.target === overlay) fechar(); };

  var modal = el('div', { class: 'modal', style: { maxWidth: '600px', maxHeight: '88vh', overflowY: 'auto' } });

  modal.appendChild(div('modal-title', [
    el('span', {}, '📸 Importar Extrato'),
    el('span', { style: { fontSize: '11px', color: 'var(--text3)', fontWeight: '400', marginLeft: '8px' } }, 'OCR local · gratuito · sem API'),
    btn('modal-close', '×', fechar),
  ]));

  var body = el('div', { style: { padding: '0 24px 24px' } });

  if (m.erro) {
    body.appendChild(el('div', { style: {
      background: 'rgba(224,82,82,.1)', border: '1px solid var(--red)', borderRadius: '8px',
      padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: 'var(--red)',
    }}, '✕ ' + m.erro));
  }

  // ── Step: upload ──────────────────────────────────────────────────────────────
  if (m.step === 'upload') {
    if (m.imagemBase64) {
      var prevImg = el('img', {});
      prevImg.src = 'data:' + m.imagemType + ';base64,' + m.imagemBase64;
      prevImg.style.cssText = 'width:100%;border-radius:8px;margin-bottom:12px;border:1px solid var(--border);max-height:240px;object-fit:contain;background:var(--bg3);';
      body.appendChild(prevImg);
      body.appendChild(el('div', { style: { display: 'flex', gap: '8px' } }, [
        btn('btn-primary', '🔍 Ler texto e importar', analisarImagem),
        btn('btn-ghost', '✕ Trocar imagem', function() { setM({ imagemBase64: null, imagemType: null }); }),
      ]));
    } else {
      var dz = el('div', {});
      dz.style.cssText = [
        'border:2px dashed var(--border2);border-radius:12px;',
        'padding:48px 24px;text-align:center;background:var(--bg3);cursor:pointer;',
        'transition:border-color .2s,background .2s;',
      ].join('');
      dz.innerHTML =
        '<div style="font-size:44px;margin-bottom:12px">📋</div>' +
        '<div style="font-weight:700;font-size:15px;color:var(--text);margin-bottom:6px">Cole o print aqui com Ctrl+V</div>' +
        '<div style="font-size:12px;color:var(--text3);margin-bottom:4px">ou clique para fazer upload da imagem</div>' +
        '<div style="font-size:11px;color:var(--text3);margin-top:8px;opacity:.7">O texto é lido localmente no seu navegador — gratuito, sem envio de dados</div>';
      dz.onmouseenter = function() { dz.style.borderColor='var(--gold)'; dz.style.background='var(--gold-dim)'; };
      dz.onmouseleave = function() { dz.style.borderColor='var(--border2)'; dz.style.background='var(--bg3)'; };

      var fi = el('input', { type: 'file', accept: 'image/*' });
      fi.style.display = 'none';
      fi.onchange = function() { if (fi.files[0]) capturarImagem(fi.files[0]); };
      dz.onclick = function() { fi.click(); };

      _importarRemovePaste();
      _importarPasteHandler = function(e) {
        if (!state.importarExtratoModal) { _importarRemovePaste(); return; }
        var items = e.clipboardData && e.clipboardData.items;
        if (!items) return;
        for (var i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            capturarImagem(items[i].getAsFile());
            e.preventDefault(); break;
          }
        }
      };
      document.addEventListener('paste', _importarPasteHandler);

      body.appendChild(dz);
      body.appendChild(fi);

      // Dica de uso
      body.appendChild(el('div', { style: {
        marginTop: '14px', padding: '12px 14px', background: 'var(--bg3)',
        borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text3)',
      }}, [
        el('div', { style: { fontWeight: '700', color: 'var(--text)', marginBottom: '6px' } }, '💡 Como usar'),
        el('div', {}, '1. Tire um print da tela do extrato bancário (tecla Print Screen ou Snip)'),
        el('div', {}, '2. Cole aqui com Ctrl+V ou clique para selecionar o arquivo'),
        el('div', {}, '3. O sistema lê os valores e nomes automaticamente'),
        el('div', {}, '4. Confirme quais lançamentos importar'),
      ]));
    }

  // ── Step: analisando ──────────────────────────────────────────────────────────
  } else if (m.step === 'analisando') {
    var pct = m._pct || 0;
    body.appendChild(el('div', { style: { textAlign: 'center', padding: '48px 24px' } }, [
      el('div', { style: { fontSize: '40px', marginBottom: '14px' } }, '🔍'),
      el('div', { style: { fontWeight: '700', fontSize: '15px', color: 'var(--text)', marginBottom: '6px' } }, 'Lendo texto da imagem...'),
      el('div', { style: { fontSize: '12px', color: 'var(--text3)', marginBottom: '16px' } }, 'OCR local em andamento — pode levar até 30 segundos'),
      el('div', { style: { background: 'var(--bg3)', borderRadius: '8px', height: '8px', overflow: 'hidden' } }, [
        el('div', { style: {
          width: (pct || 5) + '%', height: '100%', borderRadius: '8px',
          background: 'var(--gold)', transition: 'width .5s',
        }}),
      ]),
      pct ? el('div', { style: { fontSize: '11px', color: 'var(--text3)', marginTop: '6px' } }, pct + '%') : null,
    ].filter(Boolean)));

  // ── Step: confirmar ───────────────────────────────────────────────────────────
  } else if (m.step === 'confirmar') {
    var trans = m.transacoes || [];
    var nSel = trans.filter(function(t) { return t.incluir; }).length;
    var nDeb = trans.filter(function(t) { return t.tipo === 'debito'; }).length;
    var nCred = trans.filter(function(t) { return t.tipo === 'credito'; }).length;
    var totalDeb = trans.filter(function(t) { return t.tipo === 'debito' && t.incluir; })
      .reduce(function(a, t) { return a + t.valor; }, 0);

    body.appendChild(el('div', { style: {
      display: 'flex', gap: '10px', marginBottom: '14px', padding: '12px 14px',
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
      'Revise os lançamentos. Clique no nome ou categoria para editar. Desmarque os que não quer importar:'));

    trans.forEach(function(t, idx) {
      var tipoColor = t.tipo === 'credito' ? 'var(--green)' : 'var(--red)';
      var vStr = t.valor.toFixed(2).replace('.', ',');

      var nomeInput = el('input', {});
      nomeInput.value = t.nome;
      nomeInput.style.cssText = 'background:transparent;border:none;outline:none;font-weight:600;font-size:13px;color:var(--text);width:100%;';
      nomeInput.oninput = function() { m.transacoes[idx].nome = nomeInput.value; };

      var catInput = el('input', {});
      catInput.value = t.categoria || '';
      catInput.placeholder = 'categoria...';
      catInput.style.cssText = 'background:transparent;border:none;outline:none;font-size:11px;color:var(--text3);width:100%;';
      catInput.oninput = function() { m.transacoes[idx].categoria = catInput.value; };

      var tipoSel = el('select', {});
      tipoSel.style.cssText = 'background:transparent;border:none;outline:none;font-size:11px;color:'+tipoColor+';font-weight:700;cursor:pointer;';
      var optD = el('option', { value: 'debito' }, 'Saída (despesa)');
      var optC = el('option', { value: 'credito' }, 'Entrada (receita)');
      if (t.tipo === 'credito') optC.selected = true; else optD.selected = true;
      tipoSel.appendChild(optD);
      tipoSel.appendChild(optC);
      tipoSel.onchange = function() {
        m.transacoes[idx].tipo = tipoSel.value;
        render();
      };

      var row = el('div', { style: {
        display: 'flex', alignItems: 'center', gap: '10px',
        background: 'var(--bg3)', borderRadius: '8px', padding: '10px 12px', marginBottom: '6px',
        border: '1px solid ' + (t.incluir ? 'var(--border2)' : 'transparent'),
        opacity: t.incluir ? '1' : '.35', transition: 'opacity .2s',
      }});

      var chk = el('input', { type: 'checkbox' });
      chk.checked = t.incluir;
      chk.style.cursor = 'pointer';
      chk.style.flexShrink = '0';
      chk.onchange = function() { m.transacoes[idx].incluir = chk.checked; render(); };

      row.appendChild(chk);
      row.appendChild(el('div', { style: { flex: '1', minWidth: '0' } }, [nomeInput, tipoSel]));
      row.appendChild(el('div', { style: { fontWeight: '700', color: tipoColor, fontSize: '14px', whiteSpace: 'nowrap' } },
        (t.tipo === 'credito' ? '+' : '−') + ' R$ ' + vStr));
      body.appendChild(row);
    });

    // Se houve algum texto mas parser achou pouco, mostrar texto bruto (debug)
    if (trans.length < 3 && m.textoOcr) {
      var detBtn = el('details', { style: { marginTop: '10px' } });
      detBtn.appendChild(el('summary', { style: { fontSize: '11px', color: 'var(--text3)', cursor: 'pointer' } }, 'Ver texto extraído pelo OCR'));
      var pre = el('pre', { style: { fontSize: '10px', color: 'var(--text3)', whiteSpace: 'pre-wrap', marginTop: '6px', maxHeight: '120px', overflow: 'auto', background: 'var(--bg3)', padding: '8px', borderRadius: '6px' } });
      pre.textContent = m.textoOcr;
      detBtn.appendChild(pre);
      body.appendChild(detBtn);
    }

    body.appendChild(el('div', { style: { display: 'flex', gap: '8px', marginTop: '16px' } }, [
      btn('btn-ghost', '← Novo extrato', function() {
        setM({ step: 'upload', imagemBase64: null, imagemType: null, transacoes: [], textoOcr: '', erro: null });
      }),
      btn('btn-primary', '💾 Importar ' + nSel + ' lançamento' + (nSel !== 1 ? 's' : '')
        + (totalDeb > 0 ? ' · R$ ' + totalDeb.toFixed(2).replace('.',',') : ''), salvarTransacoes),
    ]));
  }

  modal.appendChild(body);
  overlay.appendChild(modal);
  return overlay;
}
