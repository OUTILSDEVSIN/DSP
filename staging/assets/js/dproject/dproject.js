/* =========================================================
   Dproject — LOADER (point d'entrée)
   ---------------------------------------------------------
   Ce fichier est le seul appelé par index.html.
   Il charge dans l'ordre les modules du dossier Dproject,
   puis déclenche l'initialisation une fois tout chargé.

   Ordre de chargement (critique) :
     1. dproject-core.js       → helpers partagés (badges, modals, upload)
     2. dproject-bugs.js       → logique onglet Bugs
     3. dproject-evolutions.js → stub
     4. dproject-taches.js     → stub
     5. dproject-roadmap.js    → stub
     6. dproject-main.js       → init + render + KPIs + router onglets

   Le main est chargé EN DERNIER car il dépend des helpers
   des autres fichiers (badges, modals, etc.).
   ========================================================= */

(function() {
  var BASE = 'staging/assets/js/dproject/';
  var FILES = [
    'dproject-core.js',
    'dproject-bugs.js',
    'dproject-evolutions.js',
    'dproject-taches.js',
    'dproject-roadmap.js',
    'dproject-main.js'
  ];

  // Charge un script et retourne une Promise résolue quand il est prêt
  function loadScript(src) {
    return new Promise(function(resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = false;       // Préserve l'ordre d'exécution
      s.onload = function() { resolve(src); };
      s.onerror = function() { reject(new Error('Échec chargement : ' + src)); };
      document.head.appendChild(s);
    });
  }

  // Chaîne les chargements en séquence
  var chain = Promise.resolve();
  FILES.forEach(function(file) {
    chain = chain.then(function() { return loadScript(BASE + file); });
  });

  chain
    .then(function() {
      // Tous les modules sont chargés → on peut déclencher l'init
      // dprojectInit existe maintenant car défini dans dproject-main.js
      if (typeof dprojectInit === 'function') {
        window.dprojectInit = dprojectInit;  // expose pour switchTool
        // Si on est déjà sur l'onglet Dproject quand le loader finit, on init
        if (document.getElementById('dproject-content')) {
          dprojectInit();
        }
      } else {
        console.error('[Dproject Loader] dprojectInit introuvable après chargement');
      }
    })
    .catch(function(err) {
      console.error('[Dproject Loader]', err);
    });
})();
