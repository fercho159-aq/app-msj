function getParams() {
    var params = new URLSearchParams(window.location.search);
    return {
        param1: params.get('Param1') || params.get('param1') || '',
        param2: params.get('Param2') || params.get('param2') || '',
        param3: params.get('Param3') || params.get('param3') || '',
    };
}

function hexToString(hex) {
    var str = '';
    for (var i = 0; i < hex.length; i += 2) {
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return str;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    var months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return d.getDate().toString().padStart(2, '0') + '/' + months[d.getMonth()] + '/' + d.getFullYear();
}

function formatDateTime(d) {
    var months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return d.getDate().toString().padStart(2, '0') + '/' + months[d.getMonth()] + '/' + d.getFullYear() + ' ' +
           d.getHours().toString().padStart(2, '0') + ':' +
           d.getMinutes().toString().padStart(2, '0') + ':' +
           d.getSeconds().toString().padStart(2, '0');
}

function showDocument(doc) {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('document-data').style.display = 'block';

    document.getElementById('current-datetime').textContent = formatDateTime(new Date());

    var filledData = doc.filled_data || {};
    document.getElementById('doc-folio').textContent = filledData.folio || doc.verification_code || '';
    document.getElementById('doc-oficio').textContent = filledData.oficio_numero || '';
    document.getElementById('doc-fecha').textContent = formatDate(doc.created_at);
    document.getElementById('doc-rfc').textContent = doc.client_rfc || '';
    document.getElementById('doc-razon-social').textContent = filledData.razon_social || doc.client_name || '';

    document.getElementById('doc-firmante').textContent = doc.firmante_nombre || '';
    document.getElementById('doc-cert-inicio').textContent = formatDate(doc.cert_inicio);
    document.getElementById('doc-cert-fin').textContent = formatDate(doc.cert_fin);

    document.getElementById('btn-ver-doc').href = doc.file_url;
}

function showError() {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('error-state').style.display = 'block';
}

async function loadDocument() {
    var p = getParams();
    if (!p.param1) {
        showError();
        return;
    }

    var verificationCode = hexToString(p.param1);

    try {
        var response = await fetch('/api/documents/verify/' + encodeURIComponent(verificationCode));
        if (!response.ok) {
            showError();
            return;
        }

        var data = await response.json();
        if (!data.document) {
            showError();
            return;
        }

        showDocument(data.document);
    } catch (e) {
        console.error('Error:', e);
        showError();
    }
}

loadDocument();
