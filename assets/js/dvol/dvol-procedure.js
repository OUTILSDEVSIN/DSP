// ============================================================
// DVOL — Modale procédure expertise par compagnie
// Source : Note de service « Process vol par compagnie » (16/09/2024)
// ============================================================

const DVOL_PROCEDURES = {
  CMAM: {
    expert: 'BCA',
    courrier: 'Éditer via ADn un courrier <strong>« mission sans PEC »</strong> en mentionnant : <em>« avis sur pièce suite vol de véhicule non retrouvé »</em>.',
    envoi: 'Le client transmet les éléments directement. Si vous les avez déjà en dossier, vous pouvez les envoyer vous-même.',
    reglement: 'Sur la base du rapport BCA, avec déduction de la franchise.',
    alerte: null,
    contact: null,
    retrouve: [
      'Le client doit fournir le <strong>PV de découverte + PV de restitution</strong>.',
      'Si le véhicule est endommagé → sortir du dépôt et programmer une <strong>expertise terrain</strong>.',
      'Règlement sur la base du rapport avec déduction de la franchise.'
    ]
  },
  ALLIANZ: {
    expert: 'Expert ALLIANZ (selon référence)',
    courrier: 'Éditer via ADn un courrier <strong>« mission sans PEC »</strong> en mentionnant : <em>« avis sur pièce suite vol de véhicule non retrouvé »</em>.',
    envoi: 'Envoyer les éléments <strong>avec la mission</strong> directement à l\'expert ALLIANZ.',
    reglement: 'Sur la base du rapport de l\'expert ALLIANZ, avec déduction de la franchise.',
    alerte: '⚠️ L\'expert dépend du <strong>dernier chiffre de la référence compagnie</strong>. Consulter le tableau ci-dessous avant d\'envoyer la mission.',
    expertsVVNR: [
      {
        tranche: 'De 0 à 4',
        nom: 'EXPERTISE ET CONCEPT VOL',
        code: '30399228',
        email: 'vvnr.allianz@expertiseconcept.fr',
        tel: '05 61 61 62 00',
        horaires: '8h - 19h'
      },
      {
        tranche: 'De 5 à 9',
        nom: 'IDEA VOL',
        code: '30399227',
        email: 'vol@idea-expertises.com',
        tel: '04 22 13 23 32',
        horaires: '8h30-12h / 14h-18h'
      }
    ],
    contact: null,
    retrouve: [
      'Le client doit fournir le <strong>PV de découverte + PV de restitution</strong>.',
      'Si le véhicule est endommagé → sortir du dépôt et programmer une <strong>expertise terrain</strong>.',
      '⚠️ Le BCA transmet le dossier à l\'expert conseil ALLIANZ. Règlement uniquement <strong>après validation par ALLIANZ</strong>.'
    ]
  },
  EQUITE: {
    expert: 'GUY JEAN BAPTISTE',
    courrier: 'Éditer via ADn un courrier <strong>« mission sans PEC »</strong> en mentionnant : <em>« avis sur pièce suite vol de véhicule non retrouvé »</em>.',
    envoi: '⚠️ GUY JEAN BAPTISTE demande les <strong>ORIGINAUX</strong>. Envoyer uniquement la <strong>mission par mail</strong>. L\'assuré envoie les pièces <strong>par courrier postal</strong>.',
    reglement: 'Sur la base du rapport de l\'expert, avec déduction de la franchise.',
    alerte: null,
    contact: {
      nom: 'Cabinet Guy Jean Baptiste',
      adresse: '37 Avenue du Général Michel Bizot, 75012 PARIS',
      email: 'contact@guyjeanbaptisteconseil.fr',
      tel: '01.44.74.34.54'
    },
    retrouve: [
      'Le client doit fournir le <strong>PV de découverte + PV de restitution</strong>.',
      'Si le véhicule est endommagé → sortir du dépôt et programmer une <strong>expertise terrain</strong>.',
      'Règlement sur la base du rapport avec déduction de la franchise.'
    ]
  }
};

function dvolNormaliserCompagnie(compagnie) {
  // Normalise : "Équité" → "EQUITE", "Allianz" → "ALLIANZ", "CMAM" → "CMAM"
  return (compagnie || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '');
}

function dvolOuvrirProcedure(compagnie) {
  const cle = dvolNormaliserCompagnie(compagnie);
  const proc = DVOL_PROCEDURES[cle] || null;

  if (!proc) {
    alert('Procédure non disponible pour : ' + (compagnie || '(compagnie non renseignée)'));
    return;
  }

  const alerteHTML = proc.alerte
    ? `<div style="background:#fef9c3;border-left:4px solid #f59e0b;padding:10px 14px;border-radius:8px;font-size:13px;color:#92400e;margin-bottom:4px;">${proc.alerte}</div>`
    : '';

  // Tableau experts VVNR (Allianz uniquement)
  const expertsHTML = proc.expertsVVNR ? `
    <div>
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6366f1;margin-bottom:8px;">👥 Experts VVNR selon dernier chiffre N° Sinistre</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:#1e3a5f;color:white;">
            <th style="padding:7px 10px;text-align:left;border-radius:6px 0 0 0;">Dernier chiffre</th>
            ${proc.expertsVVNR.map(e => `<th style="padding:7px 10px;text-align:left;">${e.tranche}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          <tr style="background:#f0f4ff;">
            <td style="padding:7px 10px;font-weight:700;color:#1e3a5f;">Expert VVNR</td>
            ${proc.expertsVVNR.map(e => `<td style="padding:7px 10px;font-weight:700;color:#1e3a5f;">${e.nom}</td>`).join('')}
          </tr>
          <tr style="background:white;">
            <td style="padding:7px 10px;font-weight:600;color:#374151;">Code expert</td>
            ${proc.expertsVVNR.map(e => `<td style="padding:7px 10px;color:#374151;">${e.code}</td>`).join('')}
          </tr>
          <tr style="background:#f0f4ff;">
            <td style="padding:7px 10px;font-weight:600;color:#374151;">Adresse mail</td>
            ${proc.expertsVVNR.map(e => `<td style="padding:7px 10px;"><a href="mailto:${e.email}" style="color:#0284c7;">${e.email}</a></td>`).join('')}
          </tr>
          <tr style="background:white;">
            <td style="padding:7px 10px;font-weight:600;color:#374151;">N° tél</td>
            ${proc.expertsVVNR.map(e => `<td style="padding:7px 10px;color:#374151;">${e.tel}</td>`).join('')}
          </tr>
          <tr style="background:#f0f4ff;">
            <td style="padding:7px 10px;font-weight:600;color:#374151;">Horaires</td>
            ${proc.expertsVVNR.map(e => `<td style="padding:7px 10px;color:#374151;">${e.horaires}</td>`).join('')}
          </tr>
        </tbody>
      </table>
    </div>
  ` : '';

  const contactHTML = proc.contact
    ? `<div style="background:#f0f9ff;border-left:4px solid #38bdf8;padding:10px 14px;border-radius:8px;font-size:13px;color:#0c4a6e;line-height:1.8;">
        <strong>📬 Contact expert :</strong><br>
        ${proc.contact.nom}<br>
        ${proc.contact.adresse}<br>
        <a href="mailto:${proc.contact.email}" style="color:#0284c7;">${proc.contact.email}</a><br>
        📞 ${proc.contact.tel}
      </div>`
    : '';

  const retrouveHTML = proc.retrouve
    .map(r => `<li style="margin-bottom:6px;font-size:13px;">${r}</li>`)
    .join('');

  const contenu = `
    <div style="display:flex;flex-direction:column;gap:14px;">

      <div>
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6366f1;margin-bottom:4px;">👤 Expert missionné</div>
        <div style="font-size:15px;font-weight:800;color:var(--navy,#1a2e4a);">${proc.expert}</div>
      </div>

      ${alerteHTML}

      ${expertsHTML}

      <div>
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6366f1;margin-bottom:4px;">📄 Courrier à éditer (via ADn)</div>
        <div style="font-size:13px;color:#374151;">${proc.courrier}</div>
      </div>

      <div>
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6366f1;margin-bottom:4px;">📦 Envoi des pièces</div>
        <div style="font-size:13px;color:#374151;">${proc.envoi}</div>
      </div>

      ${contactHTML}

      <div>
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6366f1;margin-bottom:4px;">💶 Règlement</div>
        <div style="font-size:13px;color:#374151;">${proc.reglement}</div>
      </div>

      <div>
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6366f1;margin-bottom:6px;">🔍 Si le véhicule est retrouvé</div>
        <ul style="margin:0;padding-left:18px;">${retrouveHTML}</ul>
      </div>

    </div>
  `;

  // Création de la modale si absente
  let modale = document.getElementById('dvol-proc-modale');
  if (!modale) {
    modale = document.createElement('div');
    modale.id = 'dvol-proc-modale';
    modale.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:5000;display:none;align-items:center;justify-content:center;padding:16px;';
    modale.innerHTML = `
      <div style="background:white;border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,.25);width:100%;max-width:540px;max-height:85vh;overflow:hidden;display:flex;flex-direction:column;">
        <div style="background:linear-gradient(135deg,#4338ca,#6366f1);color:white;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
          <h3 id="dvol-proc-titre" style="margin:0;font-size:15px;font-weight:800;"></h3>
          <button onclick="document.getElementById('dvol-proc-modale').style.display='none'" style="background:rgba(255,255,255,.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;">×</button>
        </div>
        <div id="dvol-proc-corps" style="padding:20px;overflow-y:auto;"></div>
      </div>
    `;
    modale.addEventListener('click', e => { if (e.target === modale) modale.style.display = 'none'; });
    document.body.appendChild(modale);
  }

  document.getElementById('dvol-proc-titre').textContent = `📋 Procédure expertise — ${(compagnie||'').toUpperCase()}`;
  document.getElementById('dvol-proc-corps').innerHTML = contenu;
  modale.style.display = 'flex';
}
